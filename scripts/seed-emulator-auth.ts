/**
 * Seeds the Firebase Auth emulator with platform demo accounts matching
 * src/lib/mock/users.ts and EOP-API/functions/prisma/seed.ts's Fillo platform company.
 * Mirrors EOP's scripts/seed-emulator-auth.ts pattern: uid == User.id so
 * verify-token.ts finds a Viewer row.
 *
 * Usage:
 *   # ensure emulator is running
 *   npm run emulators   # or: firebase emulators:start --only auth --project demo-eop --import=../emulator-data
 *   npm run seed:emulator
 */

process.env.FIREBASE_AUTH_EMULATOR_HOST ??= "127.0.0.1:9099";
process.env.GCLOUD_PROJECT ??= "energyops-504210";

import { initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { mockPlatformUsers, MOCK_PLATFORM_PASSWORD } from "../src/lib/mock/users";

async function main(): Promise<void> {
  initializeApp({ projectId: process.env.GCLOUD_PROJECT });
  const auth = getAuth();

  console.log(`Seeding Auth emulator (${process.env.FIREBASE_AUTH_EMULATOR_HOST}) — project "${process.env.GCLOUD_PROJECT}"…`);

  for (const user of mockPlatformUsers) {
    try {
      await auth.createUser({ uid: user.id, email: user.email, password: MOCK_PLATFORM_PASSWORD, displayName: user.name });
      console.log(`  created ${user.email} (${user.platformRole}, uid=${user.id})`);
    } catch (err) {
      if ((err as { code?: string }).code === "auth/uid-already-exists" || (err as { code?: string }).code === "auth/email-already-exists") {
        console.log(`  exists  ${user.email} (${user.platformRole}, uid=${user.id})`);
      } else {
        throw err;
      }
    }
  }

  console.log(`\nDone. All accounts use password "${MOCK_PLATFORM_PASSWORD}".`);
}

main().catch((err) => {
  console.error("\nSeed failed:", (err as Error).message);
  process.exit(1);
});
