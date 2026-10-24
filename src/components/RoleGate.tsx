import { Link, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { canViewPage, pageForPath } from "@/lib/permissions";

/** Renders the page, or a plain refusal when the signed-in role does not include it. Sits inside the layout so
 *  the navigation stays visible. The API enforces the same rules; this only stops dead ends and wrong turns. */
export function RoleGate() {
  const { user } = useAuth();
  const { pathname } = useLocation();
  const page = pageForPath(pathname);
  if (page && !canViewPage(user?.platformRole, page)) {
    return (
      <div className="max-w-md py-16">
        <h1 className="text-xl font-semibold">You don't have access to this page</h1>
        <p className="mt-2 text-sm text-muted-foreground">Your role doesn't include it. If you need it, ask a platform owner.</p>
        <Link to="/" className="mt-4 inline-block text-sm font-medium underline underline-offset-4">
          Back to the dashboard
        </Link>
      </div>
    );
  }
  return <Outlet />;
}
