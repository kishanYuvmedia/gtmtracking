import './loadenv';

import mongoose from 'mongoose';

// =====================================================
// MONGODB URI
// =====================================================

const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const DEV_DATABASE_PATTERN = /(^|[-_])(dev|development|test|testing|seed)([-_]|$)/i;

// Outside production the dev database wins whenever it is configured, so local servers,
// seeds and migrations never write to the production database by accident.
const MONGODB_URI = !IS_PRODUCTION && process.env.DATABASE_URL_DEV
  ? process.env.DATABASE_URL_DEV
  : process.env.MONGODB_URI;

export function databaseName(uri: string | undefined = MONGODB_URI): string {
  if (!uri) return '';
  try {
    return decodeURIComponent(new URL(uri).pathname.replace(/^\/+/, ''));
  } catch {
    return '';
  }
}

// Guard for seed / migration / backfill scripts: only ever run against DATABASE_URL_DEV.
export function requireDevDatabase(): string {
  if (IS_PRODUCTION) throw new Error('Refusing to run a dev-only script with NODE_ENV=production');
  const devUri = process.env.DATABASE_URL_DEV;
  if (!devUri) throw new Error('DATABASE_URL_DEV is not set; add it to backend/.env (e.g. .../cdp_dev)');
  const name = databaseName(devUri);
  if (!DEV_DATABASE_PATTERN.test(name)) {
    throw new Error(`Refusing to use database "${name || '(default)'}"; DATABASE_URL_DEV must name a dev/test database`);
  }
  if (process.env.MONGODB_URI && databaseName(process.env.MONGODB_URI) === name
    && new URL(process.env.MONGODB_URI).host === new URL(devUri).host) {
    throw new Error('DATABASE_URL_DEV points at the same database as MONGODB_URI');
  }
  return name;
}

// =====================================================
// CONNECTION SETTINGS
// =====================================================

const CONNECTION_OPTIONS = {
  // Production indexes are built by `node dist/migrations/production.js`, which checks the
  // storage quota first; building them implicitly at startup could block all writes.
  autoIndex: !IS_PRODUCTION,
  serverSelectionTimeoutMS: 5000,
  connectTimeoutMS: 5000,
  socketTimeoutMS: 10000,
};

// =====================================================
// TEST / CONNECT DATABASE
// =====================================================

export async function testConnection(
  retries = 5,
  delay = 2000,
  // e.g. a long socketTimeoutMS for migrations that build indexes.
  overrides: Partial<typeof CONNECTION_OPTIONS> = {}
): Promise<boolean> {

  // ---------------------------------------------------
  // Check MongoDB URI
  // ---------------------------------------------------

  if (!MONGODB_URI) {
    console.error(
      'ERROR: MONGODB_URI environment variable is not defined.'
    );

    return false;
  }

  // ---------------------------------------------------
  // Avoid duplicate connection
  // ---------------------------------------------------

  if (mongoose.connection.readyState === 1) {
    console.log('MongoDB is already connected.');

    return true;
  }

  // ---------------------------------------------------
  // Connection attempts
  // ---------------------------------------------------

  for (let i = 0; i < retries; i++) {
    try {

      console.log(
        `DB connection attempt ${i + 1}/${retries}...`
      );

      await mongoose.connect(
        MONGODB_URI,
        { ...CONNECTION_OPTIONS, ...overrides }
      );

      console.log(
        `Database connection successful (${databaseName() || 'default database'})`
      );

      return true;

    } catch (err) {

      const error = err as Error;

      console.error(
        `DB connection attempt ${i + 1}/${retries} failed:`,
        error.message
      );

      // -------------------------------------------------
      // Retry
      // -------------------------------------------------

      if (i < retries - 1) {

        console.log(
          `Retrying in ${delay / 1000} seconds...`
        );

        await new Promise<void>((resolve) => {
          setTimeout(resolve, delay);
        });
      }
    }
  }

  // ---------------------------------------------------
  // All attempts failed
  // ---------------------------------------------------

  console.error(
    'Failed to connect to database after all retry attempts.'
  );

  // IMPORTANT:
  // Do NOT call process.exit(1)
  //
  // Hostinger server must remain running.
  //

  return false;
}

// =====================================================
// MONGOOSE EVENTS
// =====================================================

mongoose.connection.on('connected', () => {
  console.log(
    'Mongoose connection established'
  );
});

mongoose.connection.on('error', (error) => {
  console.error(
    'Mongoose connection error:',
    error.message
  );
});

mongoose.connection.on('disconnected', () => {
  console.warn(
    'Mongoose disconnected from MongoDB'
  );
});

// =====================================================
// CONNECTION STATE
// =====================================================

mongoose.connection.on('reconnected', () => {
  console.log(
    'Mongoose reconnected to MongoDB'
  );
});