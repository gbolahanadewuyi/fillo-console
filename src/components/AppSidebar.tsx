import { Shield } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import type { PlatformRole } from "@/contexts/AuthContext";
import { NAV } from "@/lib/nav";
import { canViewPage } from "@/lib/permissions";

export function AppSidebar({ platformRole }: { platformRole?: PlatformRole }) {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();

  function isActive(url: string) {
    if (url === "/") return location.pathname === "/";
    return location.pathname === url || location.pathname.startsWith(url + "/");
  }

  return (
    <Sidebar collapsible="icon" className="border-r-0">
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center shrink-0">
            <Shield className="h-4 w-4 text-primary-foreground" />
          </div>
          {!collapsed && (
            <div className="flex flex-col">
              <span className="text-sm font-bold tracking-tight text-sidebar-foreground leading-none">Fillo</span>
              <span className="text-[10px] uppercase tracking-widest text-sidebar-foreground/50 font-semibold">Console</span>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="scrollbar-thin">
        {NAV.map((group) => {
          const items = group.items.filter((item) => canViewPage(platformRole, item.page));
          if (items.length === 0) return null;
          return (
            <SidebarGroup key={group.label}>
              <SidebarGroupLabel className="text-sidebar-foreground/40 text-[10px] uppercase tracking-wider">{group.label}</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {items.map((item) => (
                    <SidebarMenuItem key={item.page}>
                      <SidebarMenuButton asChild isActive={isActive(item.url)}>
                        <NavLink
                          to={item.url}
                          end={item.url === "/"}
                          className="flex items-center gap-3 text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors"
                          activeClassName="!bg-sidebar-accent !text-sidebar-accent-foreground font-medium"
                        >
                          <item.icon className="h-4 w-4 shrink-0" />
                          {!collapsed && <span className="flex-1 text-sm">{item.title}</span>}
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          );
        })}
      </SidebarContent>

      <SidebarFooter className="p-3">
        {!collapsed && <div className="text-[10px] text-sidebar-foreground/30 text-center leading-tight">Fillo Console</div>}
      </SidebarFooter>
    </Sidebar>
  );
}
