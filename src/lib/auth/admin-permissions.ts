/**
 * Server-enforced RBAC permission catalog. Keep role assignments in the database;
 * this file defines the default least-privilege capability matrix for each role.
 */
export type AdminRole = "owner" | "administrator" | "moderator" | "support" | "auditor";

export const ADMIN_ROLE_PERMISSIONS = {
  owner: [
    "dashboard.read", "audit.read", "users.read", "users.manage", "users.restrict",
    "users.sessions.revoke", "users.support.read", "groups.read", "groups.manage",
    "moderation.read", "moderation.manage", "moderation.notes.read", "moderation.notes.write",
    "moderation.appeals.read", "moderation.appeals.manage", "operations.read", "system.manage",
    "announcements.manage", "android.control.read", "android.control.manage", "server.monitor.read", "admins.roles.manage", "admin.full_access",
  ],
  administrator: [
    "dashboard.read", "audit.read", "users.read", "users.manage", "users.restrict",
    "users.sessions.revoke", "users.support.read", "groups.read", "groups.manage",
    "moderation.read", "moderation.manage", "moderation.notes.read", "moderation.notes.write",
    "moderation.appeals.read", "moderation.appeals.manage", "operations.read", "system.manage",
    "announcements.manage", "android.control.read", "android.control.manage", "server.monitor.read", "admin.full_access",
  ],
  moderator: [
    "moderation.read", "moderation.manage", "moderation.notes.read", "moderation.notes.write",
    "moderation.appeals.read", "moderation.appeals.manage",
  ],
  support: ["users.support.read", "users.sessions.revoke"],
  auditor: ["dashboard.read", "audit.read", "moderation.notes.read", "moderation.appeals.read", "operations.read", "android.control.read", "server.monitor.read"],
} as const;

export type AdminPermission = (typeof ADMIN_ROLE_PERMISSIONS)[AdminRole][number];

export function permissionsForRole(role: AdminRole): readonly AdminPermission[] {
  return ADMIN_ROLE_PERMISSIONS[role];
}

export function hasAdminPermission(role: AdminRole, permission: AdminPermission): boolean {
  return ADMIN_ROLE_PERMISSIONS[role].includes(permission as never);
}
