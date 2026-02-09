import React, { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { Link, useLocation } from "wouter";
import { toast } from "sonner";
import * as Icons from "lucide-react";
import { APP_TITLE, getLoginUrl } from "@/const";
import { CreditsDisplay } from "@/components/CreditsDisplay";
import { DataWaveBackground } from "@/components/DataWaveBackground";

// ============================================================
// Types
// ============================================================
type Step = "input" | "generating" | "preview";
type GenerationStatus = "pending" | "structuring" | "rendering" | "assembling" | "uploading" | "completed" | "failed";

const STATUS_LABELS: Record<GenerationStatus, string> = {
  pending: "准备中...",
  structuring: "正在分析内容结构...",
  rendering: "正在渲染幻灯片...",
  assembling: "正在组装PPT文件...",
  uploading: "正在上传文件...",
  completed: "生成完成！",
  failed: "生成失败",
};

const STATUS_PROGRESS: Record<GenerationStatus, number> = {
  pending: 5,
  structuring: 25,
  rendering: 55,
  assembling: 80,
  uploading: 90,
  completed: 100,
  failed: 0,
};

// ============================================================
// Main Component
// ============================================================
export default function TextToPPT() {
  const [, setLocation] = useLocation();
  const userQuery = trpc.auth.me.useQuery();
  const user = userQuery.data;

  const [step, setStep] = useState<Step>("input");
  const [inputText, setInputText] = useState("");
  const [themeStyle, setThemeStyle] = useState("business");
  const [colorScheme, setColorScheme] = useState("zenith_purple");
  const [documentId, setDocumentId] = useState<number | null>(null);
  const [currentStatus, setCurrentStatus] = useState<GenerationStatus>("pending");
  const [previews, setPreviews] = useState<string[]>([]);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [docInfo, setDocInfo] = useState<any>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const optionsQuery = trpc.pptGeneration.getOptions.useQuery(undefined, { enabled: !!user });
  const createMutation = trpc.pptGeneration.create.useMutation();
  const statusQuery = trpc.pptGeneration.getStatus.useQuery(
    { documentId: documentId! },
    { enabled: !!documentId && step === "generating", refetchInterval: 2000 }
  );
  const previewsQuery = trpc.pptGeneration.getPreviews.useQuery(
    { documentId: documentId! },
    { enabled: !!documentId && step === "preview" }
  );
  const downloadQuery = trpc.pptGeneration.getDownloadUrl.useQuery(
    { documentId: documentId! },
    { enabled: !!documentId && step === "preview" }
  );

  // Monitor status changes
  useEffect(() => {
    if (statusQuery.data) {
      const status = statusQuery.data.status as GenerationStatus;
      setCurrentStatus(status);
      setDocInfo(statusQuery.data);

      if (status === "completed") {
        setStep("preview");
        toast.success("PPT生成完成！");
      } else if (status === "failed") {
        toast.error(statusQuery.data.errorMessage || "生成失败，请重试");
      }
    }
  }, [statusQuery.data]);

  // Load previews when entering preview step
  useEffect(() => {
    if (previewsQuery.data?.previews) {
      setPreviews(previewsQuery.data.previews);
    }
  }, [previewsQuery.data]);

  const charCount = inputText.length;
  const estimatedSlides = Math.max(8, Math.min(25, Math.floor(charCount / 200)));

  // ============================================================
  // Handlers
  // ============================================================
  const handleGenerate = async () => {
    if (!user) {
      setLocation(getLoginUrl());
      return;
    }
    if (charCount < 100) {
      toast.error("内容至少需要100字");
      return;
    }

    try {
      const result = await createMutation.mutateAsync({
        inputText,
        themeStyle: themeStyle as any,
        colorScheme: colorScheme as any,
      });
      setDocumentId(result.documentId);
      setStep("generating");
      setCurrentStatus("pending");
    } catch (err: any) {
      toast.error(err.message || "创建失败");
    }
  };

  const handleDownload = () => {
    if (downloadQuery.data?.url) {
      window.open(downloadQuery.data.url, "_blank");
    }
  };

  const handleReset = () => {
    setStep("input");
    setDocumentId(null);
    setCurrentStatus("pending");
    setPreviews([]);
    setCurrentSlide(0);
    setDocInfo(null);
  };

  // ============================================================
  // Render
  // ============================================================
  return (
    <div className="min-h-screen bg-[#0a0a14] text-white relative">
      <DataWaveBackground />

      {/* Header */}
      <header className="relative z-10 border-b border-white/10 bg-[#0a0a14]/80 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2">
              <span className="text-xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
                {APP_TITLE}
              </span>
            </Link>
            <nav className="hidden md:flex items-center gap-4 text-sm">
              <Link href="/" className="text-gray-400 hover:text-white transition">首页</Link>
              <span className="text-purple-400 font-medium">文档工具</span>
              <Link href="/pricing" className="text-gray-400 hover:text-white transition">价格套餐</Link>
            </nav>
          </div>
          <div className="flex items-center gap-3">
            {user && <CreditsDisplay />}
            {!user && (
              <Link href={getLoginUrl()}>
                <Button size="sm" variant="outline" className="border-purple-500/50 text-purple-300 hover:bg-purple-500/10">
                  登录
                </Button>
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 max-w-5xl mx-auto px-4 py-8">
        {/* Page Title */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">
            <Icons.Presentation className="inline-block w-8 h-8 mr-2 text-purple-400" />
            文本转PPT
          </h1>
          <p className="text-gray-400">粘贴文本内容，AI自动生成专业演示文稿</p>
        </div>

        {/* Step Indicator */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {[
            { key: "input", label: "输入内容", icon: Icons.Edit3 },
            { key: "generating", label: "生成中", icon: Icons.Loader2 },
            { key: "preview", label: "预览下载", icon: Icons.Download },
          ].map((s, i) => {
            const isActive = step === s.key;
            const isPast = (step === "generating" && i === 0) || (step === "preview" && i < 2);
            return (
              <React.Fragment key={s.key}>
                {i > 0 && <div className={`w-12 h-0.5 ${isPast || isActive ? "bg-purple-500" : "bg-gray-700"}`} />}
                <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm ${
                  isActive ? "bg-purple-500/20 text-purple-300 border border-purple-500/30" :
                  isPast ? "text-purple-400" : "text-gray-500"
                }`}>
                  <s.icon className={`w-4 h-4 ${isActive && s.key === "generating" ? "animate-spin" : ""}`} />
                  {s.label}
                </div>
              </React.Fragment>
            );
          })}
        </div>

        {/* Step: Input */}
        {step === "input" && (
          <div className="space-y-6">
            {/* Text Input */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm text-gray-300">粘贴文本内容</label>
                <span className={`text-xs ${charCount < 100 ? "text-red-400" : charCount > 40000 ? "text-yellow-400" : "text-gray-500"}`}>
                  {charCount.toLocaleString()} 字
                  {charCount >= 100 && ` · 预计 ${estimatedSlides} 页`}
                </span>
              </div>
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="将您的文本内容粘贴到这里...&#10;&#10;支持商业计划书、分析报告、策划方案、研究报告等各类文本内容。&#10;建议粘贴500字以上的内容以获得最佳效果。"
                className="w-full h-64 p-4 bg-[#12121f] border border-white/10 rounded-lg text-white placeholder-gray-600 resize-none focus:outline-none focus:border-purple-500/50 text-sm leading-relaxed"
              />
              <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                <span>💡 建议粘贴500字以上的内容以获得最佳效果</span>
                <span>📋 支持直接从AI顾问对话中复制</span>
              </div>
            </div>

            {/* Theme & Color Selection */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Theme Style */}
              <div>
                <label className="text-sm text-gray-300 mb-3 block">选择主题风格</label>
                <div className="grid grid-cols-2 gap-2">
                  {(optionsQuery.data?.themes || [
                    { id: "business", name: "商务专业" },
                    { id: "tech", name: "科技未来" },
                    { id: "simple", name: "简约素雅" },
                    { id: "creative", name: "创意活力" },
                  ]).map((t: any) => (
                    <button
                      key={t.id}
                      onClick={() => setThemeStyle(t.id)}
                      className={`px-4 py-2.5 rounded-lg border text-sm transition ${
                        themeStyle === t.id
                          ? "border-purple-500 bg-purple-500/10 text-purple-300"
                          : "border-white/10 text-gray-400 hover:border-white/20"
                      }`}
                    >
                      {t.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Color Scheme */}
              <div>
                <label className="text-sm text-gray-300 mb-3 block">选择配色方案</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: "forest_gold", name: "森林金", c1: "#0a1a0f", c2: "#c8a951" },
                    { id: "deep_blue", name: "深海蓝", c1: "#0a0e1a", c2: "#4a90d9" },
                    { id: "zenith_purple", name: "泽思紫", c1: "#0e0a1a", c2: "#8b5cf6" },
                    { id: "classic_black", name: "经典黑", c1: "#111111", c2: "#ffffff" },
                  ].map((c) => (
                    <button
                      key={c.id}
                      onClick={() => setColorScheme(c.id)}
                      className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm transition ${
                        colorScheme === c.id
                          ? "border-purple-500 bg-purple-500/10 text-purple-300"
                          : "border-white/10 text-gray-400 hover:border-white/20"
                      }`}
                    >
                      <div className="flex gap-1">
                        <div className="w-4 h-4 rounded-sm" style={{ background: c.c1 }} />
                        <div className="w-4 h-4 rounded-sm" style={{ background: c.c2 }} />
                      </div>
                      {c.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Generate Button */}
            <div className="flex items-center justify-between pt-4 border-t border-white/10">
              <div className="text-sm text-gray-400">
                消耗 <span className="text-purple-400 font-medium">{optionsQuery.data?.creditsCost || 200}</span> 积分
              </div>
              <Button
                onClick={handleGenerate}
                disabled={charCount < 100 || createMutation.isPending}
                className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white px-8 py-2"
              >
                {createMutation.isPending ? (
                  <><Icons.Loader2 className="w-4 h-4 mr-2 animate-spin" />创建中...</>
                ) : (
                  <><Icons.Sparkles className="w-4 h-4 mr-2" />开始生成</>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Step: Generating */}
        {step === "generating" && (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-full max-w-md space-y-8">
              {/* Progress Bar */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-300">{STATUS_LABELS[currentStatus]}</span>
                  <span className="text-sm text-purple-400">{STATUS_PROGRESS[currentStatus]}%</span>
                </div>
                <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-purple-600 to-blue-600 rounded-full transition-all duration-1000 ease-out"
                    style={{ width: `${STATUS_PROGRESS[currentStatus]}%` }}
                  />
                </div>
              </div>

              {/* Status Steps */}
              <div className="space-y-3">
                {(["structuring", "rendering", "assembling", "uploading", "completed"] as GenerationStatus[]).map((s) => {
                  const statusOrder = ["pending", "structuring", "rendering", "assembling", "uploading", "completed"];
                  const currentIdx = statusOrder.indexOf(currentStatus);
                  const stepIdx = statusOrder.indexOf(s);
                  const isDone = stepIdx < currentIdx || currentStatus === "completed";
                  const isActive = s === currentStatus;

                  return (
                    <div key={s} className={`flex items-center gap-3 text-sm ${
                      isDone ? "text-green-400" : isActive ? "text-purple-300" : "text-gray-600"
                    }`}>
                      {isDone ? (
                        <Icons.CheckCircle2 className="w-5 h-5" />
                      ) : isActive ? (
                        <Icons.Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <Icons.Circle className="w-5 h-5" />
                      )}
                      {STATUS_LABELS[s]}
                    </div>
                  );
                })}
              </div>

              {/* Info */}
              {docInfo?.slideCount > 0 && (
                <p className="text-center text-sm text-gray-500">
                  共 {docInfo.slideCount} 页幻灯片
                </p>
              )}

              {currentStatus === "failed" && (
                <div className="text-center">
                  <p className="text-red-400 text-sm mb-4">{docInfo?.errorMessage || "生成失败"}</p>
                  <Button onClick={handleReset} variant="outline" className="border-white/20 text-gray-300">
                    重新开始
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step: Preview */}
        {step === "preview" && (
          <div className="space-y-6">
            {/* Title & Actions */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold">{docInfo?.title || "演示文稿"}</h2>
                <p className="text-sm text-gray-400 mt-1">
                  {docInfo?.slideCount || previews.length} 页 · {docInfo?.creditsDeducted || 200} 积分
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Button onClick={handleReset} variant="outline" className="border-white/20 text-gray-300 hover:bg-white/5">
                  <Icons.Plus className="w-4 h-4 mr-1" />新建
                </Button>
                <Button
                  onClick={handleDownload}
                  disabled={!downloadQuery.data?.url}
                  className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500"
                >
                  <Icons.Download className="w-4 h-4 mr-1" />下载PPT
                </Button>
              </div>
            </div>

            {/* Slide Preview */}
            {previewsQuery.isLoading ? (
              <div className="flex items-center justify-center py-20">
                <Icons.Loader2 className="w-8 h-8 animate-spin text-purple-400" />
                <span className="ml-3 text-gray-400">正在加载预览...</span>
              </div>
            ) : previews.length > 0 ? (
              <div>
                {/* Main Preview */}
                <div className="bg-black rounded-lg overflow-hidden border border-white/10 mb-4">
                  <img
                    src={previews[currentSlide]}
                    alt={`Slide ${currentSlide + 1}`}
                    className="w-full"
                  />
                </div>

                {/* Navigation */}
                <div className="flex items-center justify-between">
                  <Button
                    onClick={() => setCurrentSlide(Math.max(0, currentSlide - 1))}
                    disabled={currentSlide === 0}
                    variant="ghost"
                    size="sm"
                    className="text-gray-400"
                  >
                    <Icons.ChevronLeft className="w-4 h-4 mr-1" />上一页
                  </Button>
                  <span className="text-sm text-gray-400">
                    {currentSlide + 1} / {previews.length}
                  </span>
                  <Button
                    onClick={() => setCurrentSlide(Math.min(previews.length - 1, currentSlide + 1))}
                    disabled={currentSlide === previews.length - 1}
                    variant="ghost"
                    size="sm"
                    className="text-gray-400"
                  >
                    下一页<Icons.ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>

                {/* Thumbnails */}
                <div className="flex gap-2 mt-4 overflow-x-auto pb-2">
                  {previews.map((src, i) => (
                    <button
                      key={i}
                      onClick={() => setCurrentSlide(i)}
                      className={`flex-shrink-0 w-24 h-14 rounded border-2 overflow-hidden transition ${
                        i === currentSlide ? "border-purple-500" : "border-transparent opacity-60 hover:opacity-100"
                      }`}
                    >
                      <img src={src} alt={`Thumb ${i + 1}`} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-16 text-gray-500">
                <Icons.FileX className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>预览加载失败，请直接下载PPT文件查看</p>
                <Button
                  onClick={handleDownload}
                  className="mt-4 bg-purple-600 hover:bg-purple-500"
                >
                  <Icons.Download className="w-4 h-4 mr-1" />下载PPT
                </Button>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
