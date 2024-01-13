import { logger } from '../../logger.js'
import { pool } from '../../postgres.js'

await pool.query(`
  DROP TABLE workspace_members;
  DROP TABLE users;
  DROP TABLE workspaces;
`)

await pool.end()
logger.info('script exited successfully')
