import 'reflect-metadata';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { DataSource } from 'typeorm';

dotenv.config();

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL is not set');
}

const useSsl =
  process.env.DB_SSL === 'true' || databaseUrl.includes('supabase.co');

export const AppDataSource = new DataSource({
  type: 'postgres',
  url: databaseUrl,
  ssl: useSsl ? { rejectUnauthorized: false } : undefined,
  extra: useSsl ? { ssl: { rejectUnauthorized: false } } : undefined,
  entities: [path.join(__dirname, 'entities', '*.{ts,js}')],
  migrations: [path.join(__dirname, 'migrations', '*.{ts,js}')],
});
