import {
  ClipboardList,
  CreditCard,
  Settings,
  Sparkles,
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
  { href: "/pricing", label: "套餐", icon: CreditCard },
  { href: "/credits", label: "我的积分", icon: Sparkles },
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
