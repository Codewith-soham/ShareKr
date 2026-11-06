// Loaded before DB integration tests (see package.json "test:db").
// Points Prisma at a dedicated test database and refuses to run against anything else,
// because these tests truncate tables.
const url =
  process.env.TEST_DATABASE_URL ??
  'postgresql://sharekar_user:local_dev_password@127.0.0.1:5433/sharekar_test?schema=public';

const dbName = new URL(url).pathname.replace(/^\//, '');
if (!dbName.endsWith('_test')) {
  throw new Error(`Refusing to run DB tests against "${dbName}": database name must end in _test`);
}

process.env.DATABASE_URL = url;
await import('./setup.js');
