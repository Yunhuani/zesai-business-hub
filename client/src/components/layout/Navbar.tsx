import { useAuth } from "@/_core/hooks/useAuth";
import { AccountMenu } from "@/components/AccountMenu";
import { CreditsDisplay } from "@/components/CreditsDisplay";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { APP_LOGO_FULL, APP_TITLE } from "@/const";
import { cn } from "@/lib/utils";
import { Menu } from "lucide-react";
import { Link, useLocation } from "wouter";
import { PRIMARY_NAV_LINKS } from "./navigationModel";

export function AppHeader() {
  const [location] = useLocation();
  const { loading, isAuthenticated } = useAuth();

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
              <AccountMenu />
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
              {!isAuthenticated ? (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link
                      href="/login"
                      className="cursor-pointer rounded-lg px-2 py-2.5"
                    >
                      登录
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link
                      href="/login?tab=register"
                      className="cursor-pointer rounded-lg px-2 py-2.5"
                    >
                      注册
                    </Link>
                  </DropdownMenuItem>
                </>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}

export const Navbar = AppHeader;
