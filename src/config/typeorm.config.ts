import { DataSourceOptions } from 'typeorm';

/**
 * Single source of truth for TypeORM connection options, shared by the Nest
 * application (TypeOrmModule.forRootAsync) and the standalone migration CLI
 * DataSource. `synchronize` is always false — the schema is owned by the
 * committed migration files, never auto-generated at runtime.
 */
export function buildDataSourceOptions(
  env: NodeJS.ProcessEnv,
): DataSourceOptions {
  return {
    type: 'postgres',
    host: env.DB_HOST,
    port: parseInt(env.DB_PORT ?? '5432', 10),
    username: env.DB_USERNAME,
    password: env.DB_PASSWORD,
    database: env.DB_DATABASE,
    // Match compiled (.js) and ts-node (.ts) contexts. Migrations are attached
    // only by the CLI DataSource (see data-source.ts); the running app never
    // loads migration files.
    entities: [__dirname + '/../**/*.entity{.ts,.js}'],
    synchronize: false,
    logging: env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  };
}
