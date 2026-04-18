import {
  Farm,
  FileText,
  House,
  UserCircle,
  type Icon,
} from "@phosphor-icons/react/dist/ssr";

export type AppNavItem = {
  href: string;
  label: string;
  icon: Icon;
};

export const appNavItems: AppNavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: House },
  { href: "/fields", label: "Fields", icon: Farm },
  { href: "/agents", label: "Agents", icon: UserCircle },
  { href: "/updates", label: "Updates", icon: FileText },
];
