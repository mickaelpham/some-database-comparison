import { nanoid } from 'nanoid'
import { logger } from '../logger.js'
import { faker } from '@faker-js/faker'
import { client, database } from '../mongo.js'
import _ from 'lodash'

const MAX_MEMBERS_PER_WORKSPACE = 100
const MAX_USERS = 10000
const MAX_WORKSPACES = 100

interface Workspace {
  id: string
  name: string
}

interface User {
  id: string
  email: string
  locked: boolean
}

interface WorkspaceMember {
  workspaceId: Workspace['id']
  userId: User['id']
  suspended: boolean
}

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
  }
  await database.collection<User>('users').insertMany(users)
  logger.info(`successfully inserted ${users.length} users`)

  // finally sample users and add them as workspace members
  const members: WorkspaceMember[] = []
  for (const workspace of workspaces) {
    const sample: WorkspaceMember[] = _.sampleSize<User>(
      users,
      MAX_MEMBERS_PER_WORKSPACE,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    ).map(user => newWorkspaceMember(workspace.id, user.id))

    members.push(...sample)
  }
  await database
    .collection<WorkspaceMember>('workspaceMembers')
    .insertMany(members)
  logger.info(`successfully inserted ${members.length} workspace members`)

  await client.close()
}

run()
  .then(() => {
    logger.info('script exited successfully')
  })
  .catch(logger.error)
