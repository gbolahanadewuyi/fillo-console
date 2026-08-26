import { LayoutDashboard, Building2, Users, Store, Menu } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useState } from "react";
import { ScrollText, Activity, Search, Flag, Plug, FileText, Settings, ShoppingCart, Truck, Boxes, CreditCard } from "lucide-react";

const primaryTabs = [
  { title: "Home", url: "/", icon: LayoutDashboard },
  { title: "Companies", url: "/companies", icon: Building2 },
  { title: "Stations", url: "/stations", icon: Store },
  { title: "Users", url: "/users", icon: Users },
];

const moreItems = [
  { title: "Orders", url: "/orders", icon: ShoppingCart },
  { title: "Payments", url: "/payments", icon: CreditCard },
  { title: "Deliveries", url: "/deliveries", icon: Truck },
  { title: "Inventory", url: "/inventory", icon: Boxes },
  { title: "Integrations", url: "/integrations", icon: Plug },
  { title: "Feature Flags", url: "/feature-flags", icon: Flag },
  { title: "Plans & Billing", url: "/plans", icon: FileText },
  { title: "Activity", url: "/activity", icon: Activity },
  { title: "Audit Logs", url: "/audit-logs", icon: ScrollText },
  { title: "Support", url: "/support", icon: Search },
  { title: "System Settings", url: "/settings", icon: Settings },
];

function isActive(url: string, pathname: string) {
  if (url === "/") return pathname === "/";
  return pathname === url || pathname.startsWith(url + "/");
}

export function MobileNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const [sheetOpen, setSheetOpen] = useState(false);

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 h-14 bg-card border-t flex items-center justify-around px-2 safe-area-bottom">
      {primaryTabs.map((tab) => {
        const active = isActive(tab.url, location.pathname);
        const Icon = tab.icon;
        return (
          <button
            key={tab.url}
            onClick={() => navigate(tab.url)}
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
                  key={item.url}
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
