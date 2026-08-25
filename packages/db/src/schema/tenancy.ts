// Tenancy schema — workspaces, memberships, invitations, integrations
// Milestone 2: Identity & Tenancy
//
// ⚠️ DO NOT uncomment until migration is reviewed and approved by owner
//
// Key design rules (PRD §21.1):
//   - Every tenant-owned record carries workspace_id
//   - External integration IDs namespaced by provider + tenant
//   - Soft deletion deliberate for records with participant history
//
// export const workspaces = pgTable('workspaces', { ... })
// export const workspaceMemberships = pgTable('workspace_memberships', { ... })
// export const workspaceInvitations = pgTable('workspace_invitations', { ... })
// export const integrations = pgTable('integrations', { ... })

export {}
