import { logger } from '../logger.js'
import { client, database } from '../mongo.js'

const COLLECTIONS = ['users', 'workspaces', 'workspaceMembers'] as const

const run = async (): Promise<void> => {
  await Promise.allSettled(
    COLLECTIONS.map(
      async collection => await database.dropCollection(collection),
    ),
  )

  await client.close()
}

run()
  .then(() => {
    logger.info('script exited successfully')
  })
  .catch(logger.error)
