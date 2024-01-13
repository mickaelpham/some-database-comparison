import { logger } from '../../logger.js'
import { pool } from '../../postgres.js'

await pool.query(`
  CREATE TABLE workspaces (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL
  );

  CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email TEXT NOT NULL,
    locked BOOLEAN NOT NULL
  );

  CREATE TABLE workspace_members (
    workspace_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    suspended BOOLEAN NOT NULL,
    PRIMARY KEY (workspace_id, user_id)
  );
`)

await pool.end()
logger.info('script exited successfully')
