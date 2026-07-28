import { useAuth } from "@/_core/hooks/useAuth";
import { CreditsDisplay } from "@/components/CreditsDisplay";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { APP_LOGO_FULL, APP_TITLE } from "@/const";
import { cn } from "@/lib/utils";
import { LogOut, Menu, User } from "lucide-react";
import { Link, useLocation } from "wouter";
import { getAccountMenuLinks, PRIMARY_NAV_LINKS } from "./navigationModel";

export function AppHeader() {
  const [location] = useLocation();
  const { user, loading, isAuthenticated, logout } = useAuth();
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

  return (
    <header className="sticky top-0 z-50 border-b border-[var(--zs-line)] bg-[rgba(250,250,248,.86)] backdrop-blur-[12px] backdrop-saturate-[180%]">
      <div className="zs-container flex min-h-[72px] items-center justify-between gap-4 py-3">
        <div className="flex min-w-0 items-center gap-8 lg:gap-12">
          <Link href="/" className="flex shrink-0 items-center">
            <img
              src={APP_LOGO_FULL}
              alt={APP_TITLE}
              className="h-[40px] w-auto object-contain sm:h-[42px]"
            />
          </Link>

          <nav className="hidden items-center gap-7 md:flex lg:gap-9">
            {PRIMARY_NAV_LINKS.map(item => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "whitespace-nowrap text-[14.5px] font-medium text-[var(--zs-sub)] transition-colors hover:text-[var(--zs-ink)]",
                  location === item.href &&
                    "font-semibold text-[var(--zs-primary)]"
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2.5">
          {loading ? (
            <div
              className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--zs-primary)] border-t-transparent"
              aria-label="正在加载账号"
            />
          ) : isAuthenticated ? (
            <>
              <CreditsDisplay />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 rounded-full border border-[var(--zs-line)] bg-white/80 text-[var(--zs-primary)] shadow-sm hover:bg-[var(--zs-primary-soft)]"
                    aria-label="打开账号菜单"
                  >
                    {accountInitial ? (
                      <span className="text-sm font-bold uppercase">
                        {accountInitial}
                      </span>
                    ) : (
                      <User className="h-4 w-4" />
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
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
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="hidden text-[14.5px] font-medium text-[var(--zs-sub)] transition-colors hover:text-[var(--zs-ink)] sm:inline-flex"
              >
                登录
              </Link>
              <Link
                href="/login?tab=register"
                className="inline-flex rounded-lg bg-[var(--zs-primary)] px-4 py-2 text-[14px] font-semibold text-white shadow-[var(--zs-shadow-button)] transition-colors hover:bg-[var(--zs-primary-2)] sm:px-5 sm:text-[14.5px]"
              >
                注册
              </Link>
            </>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 md:hidden"
                aria-label="打开导航菜单"
              >
                <Menu className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52 rounded-xl p-2">
              {PRIMARY_NAV_LINKS.map(item => (
                <DropdownMenuItem key={item.href} asChild>
                  <Link
                    href={item.href}
                    className="cursor-pointer rounded-lg px-2 py-2.5"
                  >
                    {item.label}
                  </Link>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}

export const Navbar = AppHeader;
