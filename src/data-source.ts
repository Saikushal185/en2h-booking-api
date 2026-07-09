import 'dotenv/config';
import { DataSource } from 'typeorm';
import { buildDataSourceOptions } from './config/typeorm.config';

/**
 * DataSource consumed by the TypeORM CLI (migration:generate/run/revert).
 * Loads .env via dotenv so the CLI sees the same config as the running app, and
 * attaches the migrations glob (run through ts-node, hence the .ts path).
 */
export default new DataSource({
  ...buildDataSourceOptions(process.env),
  migrations: ['db/migrations/*.ts'],
});
