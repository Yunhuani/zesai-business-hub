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
import { APP_LOGO, APP_TITLE, getLoginUrl } from "@/const";
import { cn } from "@/lib/utils";
import {
  ClipboardList,
  History,
  LogOut,
  Menu,
  Settings,
  Sparkles,
  User,
} from "lucide-react";
import { Link, useLocation } from "wouter";

const navLinks = [
  { href: "/", label: "首页" },
  { href: "/pricing", label: "价格套餐" },
  { href: "/about", label: "关于我们" },
  { href: "/support", label: "联系客服" },
];

const accountLinks = [
  { href: "/history", label: "历史记录", icon: History },
  { href: "/my-diagnoses", label: "我的诊断", icon: ClipboardList },
  { href: "/pricing", label: "升级套餐", icon: Sparkles },
];

export function Navbar() {
  const [location] = useLocation();
  const { user, loading, isAuthenticated, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    setTimeout(() => {
      window.location.href = "/login";
    }, 0);
  };

  return (
    <header className="sticky top-0 z-50 border-b border-[var(--zs-line)] bg-[rgba(250,250,248,.86)] backdrop-blur-[12px] backdrop-saturate-150">
      <div className="mx-auto flex h-[72px] max-w-[var(--zs-content-max)] items-center justify-between px-[var(--zs-page-x)]">
        <Link href="/" className="flex items-center gap-3">
          <img
            src={APP_LOGO}
            alt={APP_TITLE}
            className="h-[42px] w-[42px] rounded-[var(--zs-radius-icon)] object-contain"
          />
          <span className="font-serif text-xl font-bold text-[var(--zs-primary)]">
            泽思 AI
          </span>
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {navLinks.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "text-[14.5px] font-medium text-[var(--zs-sub)] transition-colors hover:text-[var(--zs-ink)]",
                location === item.href && "font-semibold text-[var(--zs-ink)]"
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2 md:gap-3">
          {loading ? (
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--zs-primary)] border-t-transparent" />
          ) : isAuthenticated ? (
            <>
              <CreditsDisplay />
              <div className="hidden items-center gap-2 md:flex">
                {user?.role === "admin" && (
                  <Button variant="ghost" size="sm" asChild>
                    <Link href="/admin">
                      <Settings className="h-4 w-4" />
                      管理后台
                    </Link>
                  </Button>
                )}
                {accountLinks.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Button key={item.href} variant="ghost" size="sm" asChild>
                      <Link href={item.href}>
                        <Icon className="h-4 w-4" />
                        {item.label}
                      </Link>
                    </Button>
                  );
                })}
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" aria-label="打开账号菜单">
                    <User className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>我的账号</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <div className="px-2 py-1.5 text-sm text-muted-foreground">
                    {user?.email && <div>邮箱: {user.email}</div>}
                    {user?.username && <div>用户名: {user.username}</div>}
                  </div>
                  <DropdownMenuSeparator />
                  <div className="md:hidden">
                    {user?.role === "admin" && (
                      <DropdownMenuItem asChild>
                        <Link href="/admin" className="flex cursor-pointer items-center">
                          <Settings className="mr-2 h-4 w-4" />
                          管理后台
                        </Link>
                      </DropdownMenuItem>
                    )}
                    {accountLinks.map((item) => {
                      const Icon = item.icon;
                      return (
                        <DropdownMenuItem key={item.href} asChild>
                          <Link href={item.href} className="flex cursor-pointer items-center">
                            <Icon className="mr-2 h-4 w-4" />
                            {item.label}
                          </Link>
                        </DropdownMenuItem>
                      );
                    })}
                    <DropdownMenuSeparator />
                  </div>
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={handleLogout}
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    退出登录
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <>
              <a
                href={getLoginUrl()}
                className="hidden text-[14.5px] font-medium text-[var(--zs-sub)] transition-colors hover:text-[var(--zs-ink)] sm:inline-flex"
              >
                登录
              </a>
              <Button asChild size="sm">
                <a href={getLoginUrl()}>注册</a>
              </Button>
            </>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden" aria-label="打开导航菜单">
                <Menu className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              {navLinks.map((item) => (
                <DropdownMenuItem key={item.href} asChild>
                  <Link href={item.href} className="cursor-pointer">
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
