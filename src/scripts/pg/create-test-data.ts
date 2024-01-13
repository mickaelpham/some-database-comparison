import { faker } from '@faker-js/faker'
import { pool } from '../../postgres.js'
import { logger } from '../../logger.js'

const MAX_MEMBERS_PER_WORKSPACE = 100
const MAX_USERS = 10_000
const MAX_WORKSPACES = 100

for (let i = 0; i < MAX_WORKSPACES; i++) {
  await pool.query('INSERT INTO workspaces (name) VALUES ($1)', [
    faker.company.name(),
  ])
}
logger.info(`successfully inserted ${MAX_WORKSPACES} workspaces`)

for (let i = 0; i < MAX_USERS; i++) {
  await pool.query('INSERT INTO users (email, locked) VALUES ($1, $2)', [
    faker.internet.email(),
    Math.random() > 0.8,
  ])
}
logger.info(`successfully inserted ${MAX_USERS} users`)

const workspaces = (await pool.query('SELECT * FROM workspaces')).rows

for (const workspace of workspaces) {
  const users = (
    await pool.query('SELECT * FROM users ORDER BY random() LIMIT $1', [
      MAX_MEMBERS_PER_WORKSPACE,
    ])
  ).rows

  for (const user of users) {
    await pool.query(
      'INSERT INTO workspace_members (workspace_id, user_id, suspended) VALUES ($1, $2, $3)',
      [workspace.id, user.id, Math.random() > 0.9],
    )
  }

  logger.info(
    `successfully added ${users.length} members to workspace "${workspace.name}"`,
  )
}

await pool.end()
logger.info('script exited successfully')
