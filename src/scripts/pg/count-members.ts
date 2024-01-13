import { logger } from '../../logger.js'
import { pool } from '../../postgres.js'
import type { WorkspaceMembersCount } from '../../types/workspace-members-count.js'

const countMembers = async (
  workspaceId: number,
): Promise<WorkspaceMembersCount> => {
  const result = (
    await pool.query(
      `
      SELECT m.suspended, u.locked, count(*)
      FROM workspace_members m
      JOIN users u ON m.user_id = u.id
      WHERE m.workspace_id = $1
      GROUP BY m.suspended, u.locked
    `,
      [workspaceId],
    )
  ).rows

  // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
  const active = Number.parseInt(
    // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions, @typescript-eslint/no-unsafe-argument
    result.find(row => !row.suspended && !row.locked).count,
    10,
  )
  const inactive = result
    // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
    .filter(row => row.locked || row.suspended)
    .reduce(
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      (accumulator, row) => accumulator + Number.parseInt(row.count, 10),
      0,
    )

  return { active, inactive, total: active + inactive }
}

const workspaces = (await pool.query('SELECT id, name FROM workspaces')).rows

for (const workspace of workspaces) {
  const start = new Date().getTime()
  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
  const count = await countMembers(workspace.id)
  logger.info(`counted member in ${new Date().getTime() - start} ms`)
  logger.info(
    `workspace "${workspace.name}" ` +
      `has ${count.active} active member(s), ` +
      `${count.inactive} inactive member(s), ` +
      `and ${count.total} total member(s)`,
  )
}

await pool.end()
