import type { AdminRole } from "@/types/admin";

export const ADMIN_PERMISSIONS = [
  "admin.manage",
  "approval.read",
  "approval.decide",
  "audit.read",
  "dashboard.read",
  "game.read",
  "game.config.draft.create",
  "game.config.publish",
  "game.runtime.control",
  "round.read",
  "round.cancel",
  "wallet.read",
  "wallet.adjust.create",
  "wallet.adjust.approve",
  "asset.manage",
  "ops.read",
  "ops.alert.manage",
  "platform.app.read",
  "platform.app.manage",
  "platform.user.read",
] as const;

export type AdminPermission = (typeof ADMIN_PERMISSIONS)[number];

const PLATFORM_SUPER_ADMIN_PERMISSIONS = [
  "dashboard.read",
  "admin.manage",
  "approval.read",
  "approval.decide",
  "audit.read",
  "wallet.read",
  "wallet.adjust.create",
  "wallet.adjust.approve",
  "platform.app.read",
  "platform.app.manage",
  "platform.user.read",
] as const satisfies readonly AdminPermission[];

const GAME_OPERATOR_PERMISSIONS = [
  "dashboard.read",
  "approval.read",
  "approval.decide",
  "game.read",
  "game.config.draft.create",
  "game.config.publish",
  "game.runtime.control",
  "round.read",
  "round.cancel",
  "asset.manage",
  "ops.read",
  "ops.alert.manage",
] as const satisfies readonly AdminPermission[];

const ROLE_PERMISSIONS: Record<AdminRole, readonly AdminPermission[]> = {
  dev_super_admin: ADMIN_PERMISSIONS,
  super_admin: PLATFORM_SUPER_ADMIN_PERMISSIONS,
  game_operator: GAME_OPERATOR_PERMISSIONS,
  finance_operator: [
    "approval.read",
    "approval.decide",
    "game.read",
    "round.read",
    "wallet.read",
    "wallet.adjust.create",
    "wallet.adjust.approve",
    "platform.user.read",
    "ops.read",
  ],
  support: ["game.read", "round.read", "wallet.read", "platform.user.read"],
  auditor: [
    "dashboard.read",
    "approval.read",
    "game.read",
    "round.read",
    "wallet.read",
    "platform.user.read",
    "audit.read",
    "ops.read",
  ],
};

export function hasAdminPermission(role: AdminRole, permission: AdminPermission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}

export function canManageGames(role: AdminRole): boolean {
  return hasAdminPermission(role, "game.config.draft.create");
}

export const ASSIGNABLE_ROLES: Record<AdminRole, AdminRole[]> = {
  dev_super_admin: [
    "dev_super_admin",
    "super_admin",
    "game_operator",
    "finance_operator",
    "support",
    "auditor",
  ],
  super_admin: ["game_operator"],
  game_operator: [],
  finance_operator: [],
  support: [],
  auditor: [],
};

export function roleLabel(role: AdminRole): string {
  return role.replaceAll("_", " ");
}
