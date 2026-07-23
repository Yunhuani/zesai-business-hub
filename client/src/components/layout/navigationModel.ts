import {
  ClipboardList,
  History,
  Settings,
  type LucideIcon,
} from "lucide-react";

export type NavigationLink = {
  href: string;
  label: string;
  icon?: LucideIcon;
};

export const PRIMARY_NAV_LINKS: NavigationLink[] = [
  { href: "/", label: "首页" },
  { href: "/toolbox", label: "AI经营工具箱" },
  { href: "/pricing", label: "套餐" },
];

const ACCOUNT_LINKS: NavigationLink[] = [
  { href: "/history", label: "历史记录", icon: History },
  { href: "/my-diagnoses", label: "我的报告", icon: ClipboardList },
];

const ADMIN_LINK: NavigationLink = {
  href: "/admin",
  label: "管理后台",
  icon: Settings,
};

export function getAccountMenuLinks(
  role: string | null | undefined
): NavigationLink[] {
  return role === "admin" ? [...ACCOUNT_LINKS, ADMIN_LINK] : ACCOUNT_LINKS;
}
