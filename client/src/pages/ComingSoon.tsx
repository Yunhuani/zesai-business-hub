import { AppFooter, AppHeader } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Hourglass } from "lucide-react";
import { Link } from "wouter";

type ComingSoonPageProps = {
  title: string;
};

function ComingSoonPage({ title }: ComingSoonPageProps) {
  return (
    <div className="flex min-h-screen flex-col bg-[var(--zs-bg)] text-[var(--zs-ink)]">
      <AppHeader />
      <main className="zs-container flex flex-1 items-center justify-center py-20 sm:py-28">
        <section className="w-full max-w-2xl text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-[rgba(201,162,75,.34)] bg-[rgba(201,162,75,.12)] text-[var(--zs-gold)]">
            <Hourglass className="h-6 w-6" strokeWidth={1.7} />
          </div>
          <h1 className="mt-7 text-4xl font-black tracking-tight text-[var(--zs-primary)] sm:text-5xl">
            {title}
          </h1>
          <p className="mx-auto mt-5 max-w-lg text-base leading-8 text-[var(--zs-sub)] sm:text-lg">
            内容正在准备中，敬请期待。
          </p>
          <Button asChild variant="outline" className="mt-9 rounded-xl px-6">
            <Link href="/">
              <ArrowLeft className="h-4 w-4" />
              返回首页
            </Link>
          </Button>
        </section>
      </main>
      <AppFooter />
    </div>
  );
}

export function MethodologyComingSoon() {
  return <ComingSoonPage title="方法论" />;
}

export function InsightsComingSoon() {
  return <ComingSoonPage title="行业洞察" />;
}

export function CareersComingSoon() {
  return <ComingSoonPage title="加入我们" />;
}
