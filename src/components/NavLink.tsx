import { NavLink as RouterNavLink, NavLinkProps } from "react-router-dom";
import { cn } from "@/lib/utils";

interface Props extends NavLinkProps {
  activeClassName?: string;
  className?: string;
}

export function NavLink({ activeClassName, className, ...props }: Props) {
  return (
    <RouterNavLink
      {...props}
      className={({ isActive }) => cn(className, isActive && activeClassName)}
    />
  );
}
