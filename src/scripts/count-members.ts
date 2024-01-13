import { logger } from '../logger.js'
import { client, database } from '../mongo.js'
import type { Workspace } from '../types/workspace.js'

interface WorkspaceMembersCount {
  active: number
  inactive: number
  total: number
}

interface AggregateCountResult {
  _id: { userSuspendedFromWorkspace: boolean; userLocked: boolean }
  count: number
}

const countMembers = async (
  workspaceId: Workspace['id'],
): Promise<WorkspaceMembersCount> => {
  const result = await database
    .collection('workspaceMembers')
    .aggregate<AggregateCountResult>([
      { $match: { workspaceId } },
      {
        $lookup: {
          from: 'users',
          localField: 'userId',
          foreignField: 'id',
          as: 'user',
        },
      },
      {
        $project: {
          userId: 1,
          suspended: 1,
          user: { $arrayElemAt: ['$user', 0] },
        },
      },
      {
        $group: {
          _id: {
            userSuspendedFromWorkspace: '$suspended',
            userLocked: '$user.locked',
          },
          count: { $sum: 1 },
        },
      },
    ])
    .toArray()

  const activeReport = result.find(
    report => !report._id.userLocked && !report._id.userSuspendedFromWorkspace,
  )

  if (activeReport === undefined) {
    throw new Error('workspace has no active members')
  }

  const inactive = result
    .filter(
      report => report._id.userLocked || report._id.userSuspendedFromWorkspace,
    )
    .reduce((accumulator, report) => accumulator + report.count, 0)

  return {
    active: activeReport.count,
    inactive,
    total: activeReport.count + inactive,
  }
}

const run = async (): Promise<void> => {
  // grab a cursor of each workspaces
  const cursor = database.collection<Workspace>('workspaces').find({})
  for await (const workspace of cursor) {
    // logger.info(`retrieved workspace "${workspace.name}"`)
    const start = new Date().getTime()
    const count = await countMembers(workspace.id)
    logger.info(`counted member in ${new Date().getTime() - start} ms`)
    logger.info(
      `workspace "${workspace.name}" ` +
        `has ${count.active} active member(s), ` +
        `${count.inactive} inactive member(s), ` +
        `and ${count.total} total member(s)`,
    )
  }

  await client.close()
}

run()
  .then(() => {
    logger.info('script exited successfully')
  })
  .catch(logger.error)
