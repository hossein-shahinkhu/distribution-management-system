require('dotenv').config();

// ── S-03: Startup environment validation ─────────────────────
// If critical environment variables are missing the process must exit
// immediately — starting with a bad config is worse than not starting.
const REQUIRED_ENV = ['JWT_SECRET'];
const missingEnv   = REQUIRED_ENV.filter((key) => !process.env[key]);
if (missingEnv.length) {
  console.error(
    `[FATAL] Missing required environment variables: ${missingEnv.join(', ')}\n` +
    '  Copy .env.example to .env and fill in the missing values.'
  );
  process.exit(1);
}

if ((process.env.JWT_SECRET || '').length < 32) {
  console.error(
    '[FATAL] JWT_SECRET must be at least 32 characters long.\n' +
    '  Use: node -e "console.log(require(\'crypto\').randomBytes(48).toString(\'hex\'))"'
  );
  process.exit(1);
}
// ─────────────────────────────────────────────────────────────

const app             = require('./app');
const { sequelize }   = require('./models');
const logger          = require('./utils/logger');

const PORT = process.env.PORT || 5000;

async function start() {
  try {
    await sequelize.authenticate();
    logger.info('Database connection established.');

    // Check that migrations have been run
    try {
      await sequelize.query('SELECT 1 FROM roles LIMIT 1');
    } catch (checkErr) {
      logger.warn(
        'Database tables may not exist yet. Run: npm run migrate'
      );
    }

    app.listen(PORT, () => {
      logger.info(`Server listening on port ${PORT}.`, {
        port:        PORT,
        node_env:    process.env.NODE_ENV || 'development',
        node_version:process.version,
      });
    });
  } catch (err) {
    logger.error('Failed to start server.', { error: err.message });
    process.exit(1);
  }
}

start();
