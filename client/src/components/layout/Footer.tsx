import { APP_LOGO_FULL, APP_TITLE } from "@/const";
import { Link } from "wouter";

const footerColumns = [
  {
    title: "产品",
    links: [
      { href: "/diagnosis", label: "NBG 增长诊断" },
      { href: "/methodology", label: "方法论" },
    ],
  },
  {
    title: "资源",
    links: [
      { href: "/toolbox", label: "AI经营工具箱" },
      { href: "/insights", label: "行业洞察" },
    ],
  },
  {
    title: "公司",
    links: [
      { href: "/about", label: "关于我们" },
      { href: "/careers", label: "加入我们" },
      { href: "/support", label: "联系我们" },
    ],
  },
];

export function AppFooter() {
  return (
    <footer className="border-t border-[var(--zs-line)] bg-[var(--zs-bg)]">
      <div className="zs-container flex flex-col gap-10 py-[60px] pb-[42px] md:flex-row md:justify-between md:gap-[60px]">
        <div className="max-w-[360px]">
          <Link href="/" className="inline-flex items-center">
            <img src={APP_LOGO_FULL} alt={APP_TITLE} className="h-[50px] w-auto object-contain" />
          </Link>
          <p className="mt-[22px] text-[13.5px] leading-[1.85] text-[var(--zs-sub)]">
            泽思AI，您身边的顶级商业咨询顾问。
          </p>
        </div>

        <div className="grid gap-8 sm:grid-cols-3 md:gap-[72px]">
          {footerColumns.map((column) => (
            <div key={column.title} className="flex flex-col gap-[15px]">
              <h2 className="text-[13px] font-bold text-[var(--zs-ink)]">{column.title}</h2>
              {column.links.map((link) => (
                <Link
                  key={`${column.title}-${link.label}`}
                  href={link.href}
                  className="text-[13.5px] text-[var(--zs-sub)] transition-colors hover:text-[var(--zs-ink)]"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-[var(--zs-line)]">
        <div className="zs-container grid grid-cols-1 items-center gap-3 py-5 text-center text-[12.5px] text-[var(--zs-weak)] md:grid-cols-3">
          <span className="md:justify-self-start">© 2026 泽思AI</span>
          <a
            href="http://beian.miit.gov.cn/"
            target="_blank"
            rel="noopener"
            className="hover:text-[var(--zs-sub)] md:justify-self-center"
          >
            沪ICP备2024048847号-3
          </a>
          <span className="flex justify-center gap-[26px] md:justify-self-end">
            <Link href="/privacy" className="hover:text-[var(--zs-sub)]">
              隐私政策
            </Link>
            <Link href="/terms" className="hover:text-[var(--zs-sub)]">
              服务条款
            </Link>
          </span>
        </div>
      </div>
    </footer>
  );
}

export const Footer = AppFooter;
