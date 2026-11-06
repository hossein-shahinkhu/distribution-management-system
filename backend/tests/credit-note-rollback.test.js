const migration = require('../src/migrations/20260101000026-create-sales-credit-notes');

// Unit tests exercise the rollback protocol without a database or migrations.
function harness({ documents = [], dialect = 'postgres', lockError, dropError } = {}) {
  const transaction = {};
  const rowsBefore = JSON.parse(JSON.stringify(documents));
  const query = jest.fn(async sql => {
    if (sql.startsWith('LOCK TABLE') && lockError) throw lockError;
    if (sql.startsWith('SELECT EXISTS')) return [[{ has_documents: documents.length > 0 }], {}];
    return [[], {}];
  });
  const commit = jest.fn(), rollback = jest.fn();
  const db = { getDialect: () => dialect, query,
    transaction: jest.fn(async (options, work) => {
      try { const result = await work(transaction); commit(); return result; }
      catch (err) { rollback(); throw err; }
    }) };
  const dropTable = jest.fn(async () => { if (dropError) throw dropError; });
  return { qi: { sequelize: db, dropTable }, transaction, documents, rowsBefore, commit, rollback };
}
test('empty table: lock, check and drop use the same transaction in order', async () => {
  const h = harness();
  await migration.down(h.qi);
  expect(h.qi.sequelize.transaction).toHaveBeenCalledWith({ isolationLevel: 'READ COMMITTED' }, expect.any(Function));
  expect(h.qi.sequelize.query.mock.calls.map(c => c[0])).toEqual([
    "SET LOCAL lock_timeout = '5s'",
    'LOCK TABLE "sales_credit_notes" IN ACCESS EXCLUSIVE MODE',
    'SELECT EXISTS (SELECT 1 FROM "sales_credit_notes") AS has_documents',
  ]);
  for (const call of h.qi.sequelize.query.mock.calls) expect(call[1].transaction).toBe(h.transaction);
  expect(h.qi.dropTable).toHaveBeenCalledWith('sales_credit_notes', { transaction: h.transaction });
  expect(h.qi.sequelize.query.mock.invocationCallOrder[2]).toBeLessThan(h.qi.dropTable.mock.invocationCallOrder[0]);
  expect(h.commit).toHaveBeenCalledTimes(1);
});
test('populated table: rollback fails closed without deleting or rewriting documents', async () => {
  const h = harness({ documents: [{ id: 1, credit_number: 'SCN-TEST', total_amount: '218.03', created_by: 5 }] });
  await expect(migration.down(h.qi)).rejects.toThrow('contains financial documents');
  expect(h.qi.dropTable).not.toHaveBeenCalled();
  expect(h.documents).toEqual(h.rowsBefore);
  expect(h.commit).not.toHaveBeenCalled(); expect(h.rollback).toHaveBeenCalledTimes(1);
  expect(h.qi.sequelize.query.mock.calls.some(([sql]) => /DELETE|UPDATE|TRUNCATE/.test(sql))).toBe(false);
});
test('failure to acquire lock cannot fall through to checking or dropping', async () => {
  const h = harness({ lockError: new Error('lock timeout') });
  await expect(migration.down(h.qi)).rejects.toThrow('lock timeout');
  expect(h.qi.sequelize.query).toHaveBeenCalledTimes(2);
  expect(h.qi.dropTable).not.toHaveBeenCalled(); expect(h.rollback).toHaveBeenCalledTimes(1);
});
test('drop failure rolls back instead of committing', async () => {
  const h = harness({ dropError: new Error('DDL failure') });
  await expect(migration.down(h.qi)).rejects.toThrow('DDL failure');
  expect(h.commit).not.toHaveBeenCalled(); expect(h.rollback).toHaveBeenCalledTimes(1);
});
test.each(['sqlite', 'mysql'])('unsupported dialect %s is conservatively blocked', async dialect => {
  const h = harness({ dialect });
  await expect(migration.down(h.qi)).rejects.toThrow('requires PostgreSQL table locking');
  expect(h.qi.sequelize.transaction).not.toHaveBeenCalled(); expect(h.qi.dropTable).not.toHaveBeenCalled();
});
test('unexpected existence-check output is blocked rather than interpreted as empty', async () => {
  const h = harness();
  h.qi.sequelize.query.mockImplementation(async sql => sql.startsWith('SELECT EXISTS') ? [[{}], {}] : [[], {}]);
  await expect(migration.down(h.qi)).rejects.toThrow('Rollback blocked');
  expect(h.qi.dropTable).not.toHaveBeenCalled();
});

// Optional integration tests. No default connection, no application schema.
const pgUrl = process.env.CREDIT_NOTE_ROLLBACK_TEST_DATABASE_URL;
(pgUrl ? describe : describe.skip)('PostgreSQL isolated rollback integration', () => {
  let db, schema, table, qi;
  beforeAll(() => {
    if (process.env.NODE_ENV !== 'test' || !decodeURIComponent(new URL(pgUrl).pathname).endsWith('_test')) {
      throw new Error('An explicitly configured PostgreSQL database ending in _test is required');
    }
    const { Sequelize } = require('sequelize');
    db = new Sequelize(pgUrl, { logging: false, pool: { min: 0, max: 3 } });
    if (db.getDialect() !== 'postgres') throw new Error('PostgreSQL required');
  });
  beforeEach(async () => {
    schema = `credit_rollback_${require('crypto').randomBytes(8).toString('hex')}`;
    table = `"${schema}"."sales_credit_notes"`;
    await db.createSchema(schema);
    // This fixture tests down only; it never runs up or touches deployed tables.
    await db.query(`CREATE TABLE ${table} (id INTEGER PRIMARY KEY, credit_number TEXT NOT NULL, total_amount NUMERIC(14,2) NOT NULL, document JSONB NOT NULL)`);
    qi = {
      sequelize: {
        getDialect: () => db.getDialect(),
        query: (...args) => db.query(...args),
        transaction: (options, work) => db.transaction(options, async t => {
          await db.query(`SET LOCAL search_path TO "${schema}"`, { transaction: t });
          return work(t);
        }),
      },
      dropTable: (name, options) => db.getQueryInterface().dropTable({ tableName: name, schema }, options),
    };
  });
  afterEach(async () => {
    // The schema name is generated internally, never accepted from a URL/user.
    if (db && schema && /^credit_rollback_[a-f0-9]{16}$/.test(schema)) await db.dropSchema(schema, { cascade: true });
  });
  afterAll(async () => { if (db) await db.close(); });
  const insert = (transaction) => db.query(
    `INSERT INTO ${table} VALUES (1, 'SCN-PRESERVE', 218.03, '{"invoice_id":1,"customer_id":2,"created_by":3,"status":"posted"}'::jsonb)`,
    { transaction });
  test('empty table can be rolled back', async () => {
    await migration.down(qi);
    const [rows] = await db.query('SELECT to_regclass(:table) AS relation', { replacements: { table: `${schema}.sales_credit_notes` } });
    expect(rows[0].relation).toBeNull();
  });
  test('a populated table and every document field survive rejected rollback', async () => {
    await insert();
    const [before] = await db.query(`SELECT * FROM ${table}`);
    await expect(migration.down(qi)).rejects.toThrow('contains financial documents');
    const [after] = await db.query(`SELECT * FROM ${table}`);
    expect(after).toEqual(before);
  });
  test('an in-flight insert commits before the locked check and blocks deletion', async () => {
    const writer = await db.transaction();
    let reachedLock;
    const lockAttempted = new Promise(resolve => { reachedLock = resolve; });
    const original = qi.sequelize.query;
    qi.sequelize.query = (sql, options) => {
      if (sql.startsWith('LOCK TABLE')) reachedLock();
      return original(sql, options);
    };
    let outcome;
    try {
      await insert(writer);
      // Attach rejection handling immediately while down waits for the writer.
      outcome = migration.down(qi).then(() => null, error => error);
      await lockAttempted;
      await writer.commit();
      expect(await outcome).toMatchObject({ message: expect.stringContaining('contains financial documents') });
      const [rows] = await db.query(`SELECT * FROM ${table}`);
      expect(rows).toHaveLength(1);
      expect(rows[0].credit_number).toBe('SCN-PRESERVE');
    } finally {
      if (!writer.finished) await writer.rollback();
      if (outcome) await outcome;
    }
  });
});
