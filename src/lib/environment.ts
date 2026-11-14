/**
 * Whether this build is a development or staging environment (not production). Production builds set neither flag, so staff cannot reach the
 * test-only controls there: the demo-account picker and "mark as a test company". Staging builds set VITE_SHOW_DEMO_ACCOUNTS=true.
 */
export const isTestEnvironment: boolean = import.meta.env.DEV || import.meta.env.VITE_SHOW_DEMO_ACCOUNTS === "true";
