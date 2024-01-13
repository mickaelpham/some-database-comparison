import { nanoid } from 'nanoid'
import { logger } from '../logger.js'
import { faker } from '@faker-js/faker'
import { client, database } from '../mongo.js'
import type { Workspace } from '../types/workspace.js'
import type { User } from '../types/user.js'
import type { WorkspaceMember } from '../types/workspace-member.js'

const MAX_MEMBERS_PER_WORKSPACE = 40_000
const MAX_USERS = 5_000_000
const MAX_WORKSPACES = 10_000
const MAX_USERS_TO_INSERT = 10_000

const newWorkspace = (): Workspace => ({
  id: `workspace_${nanoid()}`,
  name: faker.company.name(),
})

const newUser = (): User => ({
  id: `user_${nanoid()}`,
  email: faker.internet.email(),
  locked: Math.random() > 0.8,
})

const newWorkspaceMember = (
  workspaceId: Workspace['id'],
  userId: User['id'],
): WorkspaceMember => ({
  userId,
  workspaceId,
  suspended: Math.random() > 0.9,
})

const run = async (): Promise<void> => {
  // create workspaces
  const workspaces: Workspace[] = []
  for (let i = 0; i < MAX_WORKSPACES; i++) {
    workspaces.push(newWorkspace())
  }
  await database.collection<Workspace>('workspaces').insertMany(workspaces)
  logger.info(`successfully inserted ${workspaces.length} workspaces`)

  // then create users
  const users: User[] = []
  for (let i = 0; i < MAX_USERS; i++) {
    users.push(newUser())

    if (users.length === MAX_USERS_TO_INSERT || i === MAX_USERS - 1) {
      await database.collection<User>('users').insertMany(users)
      logger.info(`successfully inserted ${users.length} users`)
      // clear the array
      users.length = 0
    }
  }

  // finally sample users and add them as workspace members
  for (const workspace of workspaces) {
    const sample = await database
      .collection<User>('users')
      .aggregate<{ id: string }>([
        { $sample: { size: MAX_MEMBERS_PER_WORKSPACE } },
        { $project: { id: 1 } },
      ])
      .toArray()

    const userIds = Array.from(new Set(sample.map(u => u.id)))

    await database
      .collection<WorkspaceMember>('workspaceMembers')
      .insertMany(
        userIds.map(userId => newWorkspaceMember(workspace.id, userId)),
      )
    logger.info(
      `successfully added ${userIds.length} members to workspace "${workspace.name}"`,
    )
  }

  await client.close()
}

run()
  .then(() => {
    logger.info('script exited successfully')
  })
  .catch(logger.error)
