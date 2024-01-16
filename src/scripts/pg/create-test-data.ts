import { faker } from '@faker-js/faker'
import { pool } from '../../postgres.js'
import { logger } from '../../logger.js'
import * as _ from 'lodash-es'

const MAX_MEMBERS_PER_WORKSPACE = 40_000
const MAX_USERS = 5_000_000
const MAX_WORKSPACES = 10_000

// create the tables
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
logger.info('tables created')

const insertWorkspacesResult = await pool.query(
  'INSERT INTO workspaces (name) VALUES(unnest($1::text[]))',
  [_.times(MAX_WORKSPACES, () => faker.company.name())],
)
logger.info(
  `successfully inserted ${insertWorkspacesResult.rowCount} workspaces`,
)

const insertUsersResult = await pool.query(
  'INSERT INTO users (email, locked) VALUES (unnest($1::text[]), unnest($2::bool[]))',
  [
    _.times(MAX_USERS, () => faker.internet.email()),
    _.times(MAX_USERS, () => Math.random() > 0.8),
  ],
)
logger.info(`successfully inserted ${insertUsersResult.rowCount} users`)

const workspaces = (await pool.query('SELECT * FROM workspaces')).rows
const userIds = (await pool.query('SELECT id FROM users')).rows.map(r => r.id)
logger.info(
  `retrieved ${workspaces.length} workspaces and ${userIds.length} users`,
)

for (const workspace of workspaces) {
  const insertMembersResult = await pool.query(
    'INSERT INTO workspace_members (workspace_id, user_id, suspended) VALUES ($1, unnest($2::int[]), unnest($3::bool[]))',
    [
      workspace.id,
      _.sampleSize(userIds, MAX_MEMBERS_PER_WORKSPACE),
      _.times(MAX_MEMBERS_PER_WORKSPACE, () => Math.random() > 0.9),
    ],
  )

  logger.info(
    `successfully added ${insertMembersResult.rowCount} members to workspace "${workspace.name}"`,
  )
}

await pool.end()
logger.info('script exited successfully')
