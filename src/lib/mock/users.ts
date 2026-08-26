/**
 * Mock platform users — one per control-plane role.
 * Mirrors EOP's src/lib/mock/users.ts pattern: email is the join key between
 * Firebase Auth and Postgres User.id (uid == id). Used by Login demo buttons
 * and scripts/seed-emulator-auth.ts.
 *
 * Password for all demo accounts: demo1234 (MOCK_PLATFORM_PASSWORD)
 */

export type PlatformRole = "platform_owner" | "platform_admin" | "platform_support" | "platform_finance";

export interface MockPlatformUser {
  id: string;
  email: string;
  name: string;
  platformRole: PlatformRole;
  description: string;
}

export const mockPlatformUsers: MockPlatformUser[] = [
  {
    id: "user-platform-owner",
    email: "owner@fillo.cloud",
    name: "Fillo Owner",
    platformRole: "platform_owner",
    description: "Full access — all companies, billing, flags, destructive ops",
  },
  {
    id: "user-platform-admin",
    email: "admin@fillo.cloud",
    name: "Platform Admin",
    platformRole: "platform_admin",
    description: "Platform management + support (no owner-only bypass)",
  },
  {
    id: "user-platform-support",
    email: "support@fillo.cloud",
    name: "Platform Support",
    platformRole: "platform_support",
    description: "Read-heavy — companies, users, integrations, activity",
  },
  {
    id: "user-platform-finance",
    email: "finance@fillo.cloud",
    name: "Platform Finance",
    platformRole: "platform_finance",
    description: "Plans, subscriptions, billing & financials",
  },
];

export const MOCK_PLATFORM_PASSWORD = "demo1234";

export function findMockPlatformUserByEmail(email: string): MockPlatformUser | undefined {
  return mockPlatformUsers.find((u) => u.email.toLowerCase() === email.toLowerCase());
}

export function platformRoleLabel(role: PlatformRole): string {
  switch (role) {
    case "platform_owner":
      return "Owner";
    case "platform_admin":
      return "Admin";
    case "platform_support":
      return "Support";
    case "platform_finance":
      return "Finance";
  }
}

/**
 * Mirrors EOP's getRoleById — maps mock user → display meta for Login cards.
 */
export function getPlatformRoleMeta(role: PlatformRole): { label: string; badge: string } {
  switch (role) {
    case "platform_owner":
      return { label: "Owner", badge: "Full access" };
    case "platform_admin":
      return { label: "Admin", badge: "Manage" };
    case "platform_support":
      return { label: "Support", badge: "Read-heavy" };
    case "platform_finance":
      return { label: "Finance", badge: "Billing" };
  }
}
