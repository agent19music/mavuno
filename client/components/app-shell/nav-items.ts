import { Farm, FileText, House, UserCircle } from "@phosphor-icons/react/dist/ssr";
import type { Role } from "@/types/models";

export type AppNavItem = {
  href: string;
  label: string;
  icon: typeof House;
};

const adminItems: AppNavItem[] = [
  { href: "/admin/dashboard", label: "Dashboard", icon: House },
  { href: "/admin/fields", label: "Fields", icon: Farm },
  { href: "/admin/agents", label: "Agents", icon: UserCircle },
  { href: "/admin/updates", label: "Updates", icon: FileText },
];

const agentItems: AppNavItem[] = [
  { href: "/agent/dashboard", label: "Dashboard", icon: House },
  { href: "/agent/fields", label: "My fields", icon: Farm },
  { href: "/agent/updates", label: "Updates", icon: FileText },
];

export function navItemsForRole(role: Role | null): AppNavItem[] {
  if (role === "agent") return agentItems;
  return adminItems;
}
