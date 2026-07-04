import { APP_LOGO, APP_TITLE } from "@/const";
import { Link } from "wouter";

const footerColumns = [
  {
    title: "产品",
    links: [
      { href: "/", label: "首页" },
      { href: "/pricing", label: "价格套餐" },
      { href: "/diagnosis", label: "增长诊断" },
    ],
  },
  {
    title: "支持",
    links: [
      { href: "/about", label: "关于我们" },
      { href: "/support", label: "联系客服" },
    ],
  },
  {
    title: "法律",
    links: [
      { href: "/terms", label: "用户协议" },
      { href: "/privacy", label: "隐私政策" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="border-t border-[var(--zs-line)] bg-[var(--zs-bg)]">
      <div className="mx-auto flex max-w-[var(--zs-content-max)] flex-col gap-10 px-[var(--zs-page-x)] py-[60px] pb-[42px] md:flex-row md:justify-between">
        <div className="max-w-sm">
          <div className="flex items-center gap-3">
            <img
              src={APP_LOGO}
              alt={APP_TITLE}
              className="h-12 w-12 rounded-[var(--zs-radius-icon)] object-contain"
            />
            <span className="font-serif text-xl font-bold text-[var(--zs-primary)]">
              泽思 AI
            </span>
          </div>
          <p className="mt-4 text-[15px] leading-[var(--zs-leading-relaxed)] text-[var(--zs-sub)]">
            泽思AI，您身边的顶级商业咨询顾问。
          </p>
        </div>

        <div className="grid gap-8 sm:grid-cols-3 md:gap-[72px]">
          {footerColumns.map((column) => (
            <div key={column.title}>
              <h2 className="text-[13px] font-bold text-[var(--zs-ink)]">
                {column.title}
              </h2>
              <div className="mt-4 flex flex-col gap-3">
                {column.links.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="text-[13.5px] text-[var(--zs-sub)] transition-colors hover:text-[var(--zs-ink)]"
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-[var(--zs-line)]">
        <div className="mx-auto max-w-[var(--zs-content-max)] px-[var(--zs-page-x)] py-5 text-[12.5px] text-[var(--zs-weak)]">
          © 2025 泽思 AI - 专业AI商业咨询平台
        </div>
      </div>
    </footer>
  );
}
