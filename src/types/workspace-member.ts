import type { User } from './user.js'
import type { Workspace } from './workspace.js'

export interface WorkspaceMember {
  workspaceId: Workspace['id']
  userId: User['id']
  suspended: boolean
}
