import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogOut, User } from "lucide-react";
import { Link } from "wouter";
import { getAccountMenuLinks } from "./layout/navigationModel";

type AccountMenuProps = {
  variant?: "avatar" | "bar";
};

export function AccountMenu({ variant = "avatar" }: AccountMenuProps) {
  const { user, logout } = useAuth();
  const accountInitial =
    user?.name?.trim().charAt(0) ||
    user?.username?.trim().charAt(0) ||
    user?.email?.trim().charAt(0);

  const handleLogout = async () => {
    await logout();
    setTimeout(() => {
      window.location.href = "/login";
    }, 0);
  };

  const avatar = accountInitial ? (
    <span className="text-sm font-bold uppercase">{accountInitial}</span>
  ) : (
    <User className="h-4 w-4" />
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {variant === "bar" ? (
          <button
            type="button"
            className="m-3 flex items-center gap-3 rounded-xl px-2.5 py-2.5 text-left transition hover:bg-white/80"
            aria-label="打开账号菜单"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[var(--zs-line)] bg-white/80 text-[var(--zs-primary)] shadow-sm">
              {avatar}
            </span>
            <span className="min-w-0 flex-1 truncate text-sm font-medium">
              {user?.email || user?.name || user?.username || "泽思用户"}
            </span>
          </button>
        ) : (
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-full border border-[var(--zs-line)] bg-white/80 text-[var(--zs-primary)] shadow-sm hover:bg-[var(--zs-primary-soft)]"
            aria-label="打开账号菜单"
          >
            {avatar}
          </Button>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align={variant === "bar" ? "start" : "end"}
        side={variant === "bar" ? "top" : "bottom"}
        className="w-64 rounded-xl border-[var(--zs-line)] bg-[var(--zs-card)] p-2 shadow-[var(--zs-shadow-large)]"
      >
        <DropdownMenuLabel className="px-2 py-2">
          <span className="block text-sm font-semibold text-[var(--zs-ink)]">
            {user?.name || user?.username || "我的账号"}
          </span>
          {user?.email ? (
            <span className="mt-0.5 block truncate text-xs font-normal text-[var(--zs-weak)]">
              {user.email}
            </span>
          ) : null}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {getAccountMenuLinks(user?.role).map(item => {
          const Icon = item.icon;
          return (
            <DropdownMenuItem key={item.href} asChild>
              <Link
                href={item.href}
                className="flex cursor-pointer items-center rounded-lg px-2 py-2.5"
              >
                {Icon ? <Icon className="h-4 w-4" /> : null}
                {item.label}
              </Link>
            </DropdownMenuItem>
          );
        })}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="rounded-lg py-2.5 text-destructive focus:text-destructive"
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4" />
          退出登录
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
