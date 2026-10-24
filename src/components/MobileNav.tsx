import { Menu } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { MOBILE_TABS, NAV } from "@/lib/nav";
import { canViewPage, PAGE_PATHS } from "@/lib/permissions";

function isActive(url: string, pathname: string) {
  if (url === "/") return pathname === "/";
  return pathname === url || pathname.startsWith(url + "/");
}

export function MobileNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const role = user?.platformRole;
  const [sheetOpen, setSheetOpen] = useState(false);

  const pinned = new Set(MOBILE_TABS.map((t) => t.page));
  const moreItems = NAV.flatMap((g) => g.items).filter((i) => !pinned.has(i.page) && canViewPage(role, i.page));

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 h-14 bg-card border-t flex items-center justify-around px-2 safe-area-bottom">
      {MOBILE_TABS.filter((t) => canViewPage(role, t.page)).map((tab) => {
        const url = PAGE_PATHS[tab.page];
        const active = isActive(url, location.pathname);
        const Icon = tab.icon;
        return (
          <button
            key={tab.page}
            onClick={() => navigate(url)}
            className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded-md transition-colors ${active ? "text-primary" : "text-muted-foreground"}`}
          >
            <Icon className="h-5 w-5" />
            <span className="text-[10px] font-medium leading-none">{tab.title}</span>
          </button>
        );
      })}

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetTrigger asChild>
          <button className="flex flex-col items-center gap-0.5 px-2 py-1 rounded-md text-muted-foreground">
            <Menu className="h-5 w-5" />
            <span className="text-[10px] font-medium leading-none">More</span>
          </button>
        </SheetTrigger>
        <SheetContent side="bottom" className="h-[70vh] rounded-t-xl px-0 flex flex-col">
          <SheetHeader className="px-4 pb-2 border-b shrink-0">
            <SheetTitle className="text-left text-base">Console</SheetTitle>
          </SheetHeader>
          <div className="overflow-y-auto flex-1 pb-8">
            {moreItems.map((item) => {
              const active = isActive(item.url, location.pathname);
              const Icon = item.icon;
              return (
                <button
                  key={item.page}
                  onClick={() => {
                    navigate(item.url);
                    setSheetOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-sm ${active ? "bg-muted font-semibold text-foreground" : "text-muted-foreground"}`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {item.title}
                </button>
              );
            })}
          </div>
        </SheetContent>
      </Sheet>
    </nav>
  );
}
