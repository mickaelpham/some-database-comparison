import { nanoid } from 'nanoid'
import { logger } from '../../logger.js'
import { faker } from '@faker-js/faker'
import { client, database } from '../../mongo.js'
import type { Workspace } from '../../types/workspace.js'
import type { User } from '../../types/user.js'
import type { WorkspaceMember } from '../../types/workspace-member.js'
import * as _ from 'lodash-es'

const MAX_MEMBERS_PER_WORKSPACE = 40_000
const MAX_USERS = 5_000_000
const MAX_WORKSPACES = 10_000
const WORKSPACE_CHUNKS_FOR_MEMBERS_INSERT = 10
const MAX_USERS_TO_INSERT = 100_000

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
  const workspaces = _.times(MAX_WORKSPACES, () => newWorkspace())
  await database.collection<Workspace>('workspaces').insertMany(workspaces)
  logger.info(`successfully inserted ${workspaces.length} workspaces`)

  // then create users
  const users = _.times(MAX_USERS, () => newUser())
  const userChunks = _.chunk(users, MAX_USERS_TO_INSERT)
  for (const chunk of userChunks) {
    await database.collection<User>('users').insertMany(chunk)
    logger.info(`successfully inserted ${chunk.length} users`)
  }

  // finally add the workspace members
  const workspaceChunks = _.chunk(
    workspaces,
    WORKSPACE_CHUNKS_FOR_MEMBERS_INSERT,
  )
  for (const chunk of workspaceChunks) {
    const docs = chunk.map(workspace =>
      _.sampleSize(users, MAX_MEMBERS_PER_WORKSPACE).map(user =>
        newWorkspaceMember(workspace.id, user.id),
      ),
    )

    await database
      .collection<WorkspaceMember>('workspaceMembers')
      .insertMany(_.flatten(docs))

    logger.info(
      `successfully added ${MAX_MEMBERS_PER_WORKSPACE} members to ${WORKSPACE_CHUNKS_FOR_MEMBERS_INSERT} workspaces each`,
    )
  }

  await client.close()
}

run()
  .then(() => {
    logger.info('script exited successfully')
  })
  .catch(logger.error)
