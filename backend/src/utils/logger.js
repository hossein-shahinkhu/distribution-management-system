/**
 * utils/logger.js
 *
 * Structured logger — in production writes JSON to stderr; in development
 * writes human-readable lines to stdout.  Using a thin wrapper (rather than
 * importing a third-party library like winston here) keeps the dependency
 * count low while still making every log entry machine-parseable and
 * searchable in production.
 *
 * Usage:
 *   const logger = require('../utils/logger');
 *   logger.info('server started', { port: 5000 });
 *   logger.error('db query failed', { error: err.message, query: 'SELECT …' });
 */

const isProd = process.env.NODE_ENV === 'production';
const isTest  = process.env.NODE_ENV === 'test';

function write(level, message, meta = {}) {
  if (isTest) return; // silence logs during automated tests

  const entry = {
    ts:      new Date().toISOString(),
    level,
    message,
    ...meta,
  };

  if (isProd) {
    // JSON lines — easy to ingest into log aggregators (Loki, Datadog, etc.)
    process.stderr.write(JSON.stringify(entry) + '\n');
  } else {
    const prefix = level === 'error' ? '\x1b[31m[ERROR]\x1b[0m'
                 : level === 'warn'  ? '\x1b[33m[WARN]\x1b[0m'
                 :                     '\x1b[36m[INFO]\x1b[0m';
    const metaStr = Object.keys(meta).length ? ' ' + JSON.stringify(meta) : '';
    console.log(`${prefix} ${entry.ts} — ${message}${metaStr}`);
  }
}

const logger = {
  info:  (message, meta) => write('info',  message, meta),
  warn:  (message, meta) => write('warn',  message, meta),
  error: (message, meta) => write('error', message, meta),
};

module.exports = logger;
