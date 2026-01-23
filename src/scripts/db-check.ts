import { AppDataSource } from '../database/data-source';

async function run() {
  await AppDataSource.initialize();
  const result = await AppDataSource.query('SELECT 1');
  console.log('db:check ok', result);
  await AppDataSource.destroy();
}

run().catch((error) => {
  console.error('db:check failed', error);
  process.exit(1);
});
