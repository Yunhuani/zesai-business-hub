import { useAuth } from "@/_core/hooks/useAuth";
import { ExpertConsultationDialog } from "@/components/ExpertConsultationDialog";
import { AppFooter, AppHeader } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ConversionEvents, trackConversion } from "@/lib/analytics";
import { rememberLoginReturnPath } from "@/lib/loginReturn";
import { trpc } from "@/lib/trpc";
import { Check, Minus, MessageCircle, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";

type Plan = {
  id: "free" | "basic" | "professional" | "enterprise";
  name: string;
  price: string;
  period: string;
  tagline: string;
  usage: string;
  rows: Array<{ label: string; enabled: boolean; highlight?: boolean }>;
  button: string;
  recommended?: boolean;
};

const plans: Plan[] = [
  {
    id: "free",
    name: "免费体验",
    price: "¥0",
    period: "",
    tagline: "体验泽思AI商业顾问",
    usage: "若干次 AI 顾问对话",
    rows: [
      { label: "完整报告在线查看", enabled: false },
      { label: "下载报告", enabled: false },
      { label: "优先生成队列", enabled: false },
      { label: "人工咨询折扣", enabled: false },
      { label: "抢先体验新 AI 顾问", enabled: false },
    ],
    button: "免费开始",
  },
  {
    id: "basic",
    name: "基础版",
    price: "¥99",
    period: "/月",
    tagline: "把一位 AI 商业顾问请回家",
    usage: "可完成少量咨询，AI顾问可对话与轻量分析",
    rows: [
      { label: "使用基础商业AI咨询模型", enabled: true },
      { label: "浏览初级报告", enabled: true },
      { label: "核心 AI 顾问可用", enabled: true },
      { label: "优先生成队列", enabled: false },
      { label: "人工咨询折扣", enabled: false },
    ],
    button: "立即购买",
  },
  {
    id: "professional",
    name: "专业版",
    price: "¥499",
    period: "/月",
    tagline: "把 AI 产出变成能带走的专业成品",
    usage: "可完成多次咨询，多AI对话与分析",
    rows: [
      { label: "可使用专业商业AI咨询模型", enabled: true },
      { label: "完整报告在线查看", enabled: true },
      { label: "下载报告", enabled: true },
      { label: "优先生成队列（繁忙时优先）", enabled: true, highlight: true },
      { label: "人工咨询 9 折", enabled: true, highlight: true },
      { label: "抢先体验新 AI 顾问", enabled: false },
    ],
    button: "立即购买",
    recommended: true,
  },
  {
    id: "enterprise",
    name: "旗舰版",
    price: "¥999",
    period: "/月",
    tagline: "高频、多成品、机构级使用",
    usage: "大额度 · 多次诊断与多AI顾问混合使用",
    rows: [
      { label: "可使用高级商业AI咨询模型", enabled: true },
      { label: "完整报告 + 完整下载", enabled: true },
      { label: "优先生成队列", enabled: true },
      { label: "人工咨询 8 折", enabled: true, highlight: true },
      { label: "抢先体验即将上线的新 AI 顾问", enabled: true },
      { label: "专属客户成功支持", enabled: true },
    ],
    button: "立即购买",
  },
];

const creditPacks = [
  { id: "pack_500", credits: "500", price: "¥49", tag: "永久有效" },
  { id: "pack_1200", credits: "1,200", price: "¥99", tag: "永久有效" },
  { id: "pack_3000", credits: "3,000", price: "¥199", tag: "永久有效", badge: "超值" },
  { id: "pack_8000", credits: "8,000", price: "¥399", tag: "永久有效", badge: "超值" },
];

const faqs = [
  {
    q: "额度用完了怎么办？",
    a: "订阅额度用完后，可随时购买加油包补充。加油包积分永久有效、不过期，叠加在你的账户上，与每月重置的订阅额度互不影响。",
  },
  {
    q: "可以随时升级或取消吗？",
    a: "可以。订阅按月计费，可随时升级、降级或取消，变更在下一个计费周期生效，已购买的加油包积分始终保留。",
  },
  {
    q: "和找真人咨询比，划算在哪？",
    a: "传统咨询公司做一份同等深度的诊断动辄数万到数十万元，且周期以周计。泽思AI 用同一套咨询方法论，几百元、15 分钟即可开始，并可反复使用。需要更深入时，再由资深顾问 1 对 1 承接。",
  },
];

export default function Pricing() {
  const [, setLocation] = useLocation();
  const [expertDialogOpen, setExpertDialogOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState(0);
  const { isAuthenticated } = useAuth();
  const { data: subscriptionData } = trpc.subscription.get.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  useEffect(() => {
    if (isAuthenticated) {
      trackConversion(ConversionEvents.VIEW_PRICING);
    }
  }, [isAuthenticated]);

  const currentPlan = subscriptionData?.subscription?.plan || "free";

  function goToPayment(plan: Plan) {
    if (plan.id === "free") {
      setLocation("/toolbox");
      return;
    }

    const paymentPath = `/payment/${plan.id}`;
    trackConversion(ConversionEvents.PAYMENT_START, {
      plan_id: plan.id,
      plan_name: plan.name,
      plan_price: plan.price,
    });

    if (!isAuthenticated) {
      rememberLoginReturnPath(paymentPath);
      setLocation("/login");
      return;
    }

    setLocation(paymentPath);
  }

  function goToCredits() {
    if (!isAuthenticated) {
      rememberLoginReturnPath("/credits");
      setLocation("/login");
      return;
    }

    setLocation("/credits");
  }

  return (
    <div className="min-h-screen bg-[var(--zs-bg)] text-[var(--zs-ink)]">
      <AppHeader />

      <main>
        <section className="zs-container pb-[52px] pt-20 text-center">
          <h1 className="m-0 text-[44px] font-black leading-[1.16] tracking-[.01em] md:text-[52px]">
            选择适合你的套餐
          </h1>
          <p className="mx-auto mt-[22px] max-w-[640px] text-[19px] leading-[1.75] text-[var(--zs-sub)]">
            过去一份专业咨询动辄 <span className="font-bold text-[var(--zs-ink)]">几十万</span>。现在，从每月{" "}
            <span className="font-bold text-[var(--zs-primary)]">99 元</span> 开始。
          </p>
        </section>

        <section className="zs-container pb-16">
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {plans.map((plan) => {
              const isCurrentPlan = isAuthenticated && currentPlan === plan.id;
              return (
                <Card
                  key={plan.id}
                  className={`relative h-full rounded-[20px] border bg-white ${
                    plan.recommended
                      ? "border-[var(--zs-gold)] shadow-[0_30px_64px_-42px_rgba(31,61,50,.32)]"
                      : "border-[var(--zs-line)]"
                  }`}
                >
                  {plan.recommended && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[var(--zs-gold)] px-4 py-1.5 text-xs font-bold text-[var(--zs-primary)]">
                      推荐
                    </div>
                  )}
                  {isCurrentPlan && (
                    <div className="absolute right-5 top-5 rounded-md bg-[var(--zs-primary-soft)] px-2.5 py-1 text-xs font-bold text-[var(--zs-primary)]">
                      当前套餐
                    </div>
                  )}
                  <CardContent className="flex h-full flex-col p-7">
                    <h2 className="text-[18px] font-extrabold">{plan.name}</h2>
                    <div className="mt-5 flex items-end gap-1">
                      <span className="font-['Inter'] text-[42px] font-black leading-none">{plan.price}</span>
                      <span className="pb-1 text-[14px] text-[var(--zs-sub)]">{plan.period}</span>
                    </div>
                    <p className="mt-4 min-h-[36px] text-[13.5px] leading-[1.6] text-[var(--zs-sub)]">
                      {plan.tagline}
                    </p>
                    <div className="mt-5 rounded-[10px] border border-[var(--zs-line)] bg-[var(--zs-bg)] px-4 py-3 text-[13px] font-bold leading-[1.55]">
                      {plan.usage}
                    </div>

                    <ul className="mt-5 flex-1 space-y-3">
                      {plan.rows.map((row) => (
                        <li key={row.label} className="flex items-start gap-2.5 text-[14px] leading-[1.6]">
                          {row.enabled ? (
                            <Check
                              className={`mt-0.5 h-4 w-4 shrink-0 ${
                                row.highlight ? "text-[var(--zs-gold)]" : "text-[var(--zs-primary)]"
                              }`}
                            />
                          ) : (
                            <Minus className="mt-0.5 h-4 w-4 shrink-0 text-[var(--zs-weak)]" />
                          )}
                          <span className={row.enabled ? "text-[var(--zs-ink)]" : "text-[var(--zs-sub)]"}>
                            {row.label}
                          </span>
                        </li>
                      ))}
                    </ul>

                    <Button
                      className="mt-7 w-full"
                      variant={plan.recommended ? "default" : "secondary"}
                      disabled={isCurrentPlan}
                      onClick={() => goToPayment(plan)}
                    >
                      {isCurrentPlan ? "当前套餐" : plan.button}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>

        <section className="zs-container pb-16 text-center">
          <h2 className="text-[30px] font-extrabold leading-[1.3]">额度不够？随时加购，永久有效</h2>
          <p className="mx-auto mt-4 max-w-[620px] text-[15px] leading-[1.8] text-[var(--zs-sub)]">
            订阅额度用完后，可随时购买加油包补充。加油包积分永久有效、不过期、不浪费——与按月重置的订阅额度不同。
          </p>

          <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {creditPacks.map((pack) => (
              <Card key={pack.id} className="rounded-[16px] border-[var(--zs-line)] bg-white text-left">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <span className="rounded-md bg-[var(--zs-primary-soft)] px-2.5 py-1 text-[11px] font-bold text-[var(--zs-primary)]">
                      {pack.tag}
                    </span>
                    {pack.badge && <span className="text-[12px] font-bold text-[var(--zs-gold)]">{pack.badge}</span>}
                  </div>
                  <div className="mt-5">
                    <span className="font-['Inter'] text-[32px] font-black leading-none">{pack.credits}</span>
                    <span className="ml-1 text-[14px] text-[var(--zs-sub)]">积分</span>
                  </div>
                  <div className="mt-2 font-['Inter'] text-[17px] font-bold text-[var(--zs-primary)]">{pack.price}</div>
                  <Button variant="secondary" className="mt-5 w-full" onClick={goToCredits}>
                    购买
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section className="zs-container pb-6">
          <div className="flex flex-col gap-8 rounded-[22px] bg-[var(--zs-primary)] p-8 text-[#eef2ed] md:flex-row md:items-center md:justify-between md:p-10">
            <div className="max-w-[680px]">
              <div className="inline-flex items-center gap-2 text-xs font-bold tracking-[.06em] text-[var(--zs-gold)]">
                最高价值层
              </div>
              <h2 className="mt-[14px] text-[32px] font-extrabold leading-[1.32] text-white">
                需要更专业方案？
                <br />
                由专家顾问团队亲自接手。
              </h2>
              <p className="mt-4 text-[16px] leading-[1.8] text-[#b9c7bf]">
                资深顾问 1 对 1 深化分析与方案落地。
              </p>
            </div>
            <Button variant="gold" size="lg" onClick={() => setExpertDialogOpen(true)}>
              <MessageCircle className="h-5 w-5" />
              了解人工咨询 →
            </Button>
          </div>
        </section>

        <section className="zs-container max-w-[860px] py-20 pb-[92px]">
          <h2 className="mb-8 text-center text-[30px] font-extrabold">常见疑问</h2>
          <div className="flex flex-col gap-[14px]">
            {faqs.map((faq, index) => {
              const open = openFaq === index;
              return (
                <div key={faq.q} className="overflow-hidden rounded-[14px] border border-[var(--zs-line)] bg-white">
                  <button
                    type="button"
                    onClick={() => setOpenFaq(open ? -1 : index)}
                    className="flex w-full items-center justify-between gap-[18px] p-5 text-left md:px-6"
                  >
                    <span className="text-[16px] font-bold text-[var(--zs-ink)]">{faq.q}</span>
                    <span className="flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full border border-[var(--zs-line)] text-[18px] font-normal text-[var(--zs-sub)] transition-transform">
                      <Plus className={`h-4 w-4 transition-transform ${open ? "rotate-45" : ""}`} />
                    </span>
                  </button>
                  {open && (
                    <div className="border-t border-[var(--zs-line)] px-5 py-4 text-[14px] leading-[1.8] text-[var(--zs-sub)] md:px-6">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      </main>

      <AppFooter />

      <ExpertConsultationDialog open={expertDialogOpen} onOpenChange={setExpertDialogOpen} />
    </div>
  );
}
