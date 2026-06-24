import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { initSentry } from "./sentry";
import { logger } from "../lib/logger";
import { getProviderConfig, getApiKey } from "./llm";
import { fireAlert } from "./alertManager";

// 初始化Sentry错误监控
initSentry();

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const { seedPricingConfig } = await import("../pricingConfig");
  await seedPricingConfig();
  const app = express();
  const server = createServer(app);

  // Health check endpoint (for Railway deployment & monitoring)
  app.get("/api/health", async (req, res) => {
    const checks: Record<string, { status: string; latencyMs?: number; error?: string }> = {};
    let overallStatus: "ok" | "degraded" | "unhealthy" = "ok";

    // 1. 数据库连接检查
    try {
      const { getDb } = await import("../db");
      const db = await getDb();
      if (!db) {
        checks.database = { status: "unhealthy", error: "Database not initialized" };
        overallStatus = "unhealthy";
      } else {
        const start = Date.now();
        await db.execute({ sql: "SELECT 1", args: [] } as any);
        checks.database = { status: "ok", latencyMs: Date.now() - start };
      }
    } catch (error: any) {
      checks.database = { status: "unhealthy", error: error.message };
      overallStatus = "unhealthy";
    }

    // 2. LLM API 可达性检查（GET /models，不消耗 token）
    try {
      const provider = getProviderConfig();
      const apiKey = getApiKey();
      // 大多数 OpenAI 兼容 API 支持 GET /models
      const modelsUrl = provider.baseUrl.replace(/\/chat\/completions$/, "/models");
      const start = Date.now();
      const llmRes = await fetch(modelsUrl, {
        method: "GET",
        headers: provider.getHeaders(apiKey),
        signal: AbortSignal.timeout(5000),
      });
      checks.llm = {
        status: llmRes.ok ? "ok" : "degraded",
        latencyMs: Date.now() - start,
        ...(llmRes.ok ? {} : { error: `HTTP ${llmRes.status}` }),
      };
      if (!llmRes.ok && overallStatus === "ok") overallStatus = "degraded";
    } catch (error: any) {
      checks.llm = { status: "degraded", error: error.message };
      if (overallStatus === "ok") overallStatus = "degraded";
    }

    // 3. 内存使用
    const mem = process.memoryUsage();
    checks.memory = {
      status: "ok",
      ...Object.fromEntries(
        ["rss", "heapUsed", "heapTotal"].map((k) => [k, `${Math.round((mem as any)[k] / 1024 / 1024)}MB`])
      ),
    };

    // 异步告警（不阻塞响应）
    if (overallStatus === "unhealthy") {
      fireAlert({
        category: "health",
        title: "🚨 服务健康检查失败",
        description: `状态: ${overallStatus}\n${JSON.stringify(checks, null, 2)}`,
      }).catch(() => {});
    }

    const httpStatus = overallStatus === "unhealthy" ? 503 : 200;
    res.status(httpStatus).json({
      status: overallStatus,
      timestamp: new Date().toISOString(),
      checks,
    });
  });

  // Stripe webhook route (MUST be before express.json() for signature verification)
  app.post("/api/stripe/webhook", express.raw({ type: "application/json" }), async (req, res) => {
    const { handleStripeWebhook } = await import("../stripeWebhook");
    await handleStripeWebhook(req, res);
  });
  
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  // OAuth callback under /api/oauth/callback
  registerOAuthRoutes(app);
  // Stream chat endpoint
  app.post("/api/chat/stream", async (req, res) => {
    const { handleStreamChat } = await import("../streamChat");
    await handleStreamChat(req, res);
  });
  
  // Alipay callback route (must be before tRPC middleware)
  app.post("/api/payment/alipay/notify", async (req, res) => {
    try {
      const { verifyAlipayCallback } = await import("./alipay");
      const { getOrderByOutTradeNo, updateOrderStatus, createOrUpdateSubscription, getUserById } = await import("../db");
      const { resetSubscriptionCredits } = await import("../creditsManager");
      const { notifyAdminNewOrder } = await import("../orderNotification");
      
      console.log("[Payment] Alipay notify received:", req.body);
      
      // Verify signature
      const isValid = verifyAlipayCallback(req.body);
      if (!isValid) {
        console.error("[Payment] Invalid signature");
        console.log("[Analytics] Payment callback failed:", {
          reason: "invalid_signature",
          out_trade_no: req.body.out_trade_no,
          timestamp: new Date().toISOString(),
        });
        return res.status(400).send("fail");
      }
      
      const outTradeNo = req.body.out_trade_no;
      const tradeStatus = req.body.trade_status;
      const tradeNo = req.body.trade_no;
      
      // Query order
      const order = await getOrderByOutTradeNo(outTradeNo);
      if (!order) {
        console.error("[Payment] Order not found:", outTradeNo);
        console.log("[Analytics] Payment callback failed:", {
          reason: "order_not_found",
          out_trade_no: outTradeNo,
          timestamp: new Date().toISOString(),
        });
        return res.status(404).send("fail");
      }
      
      // If order already processed, return success
      if (order.status === "paid") {
        return res.send("success");
      }
      
      // Handle payment success
      if (tradeStatus === "TRADE_SUCCESS") {
        await updateOrderStatus(outTradeNo, {
          status: "paid",
          tradeNo,
          paidAt: new Date(),
        });
        
        // Check if it's a subscription or credit pack order
        const {
          getPricingConfig,
          resolveCreditPack,
          resolveSubscriptionPlan,
        } = await import("../pricingConfig");
        const pricing = await getPricingConfig();
        let subscriptionConfig;
        try {
          subscriptionConfig = resolveSubscriptionPlan(pricing, order.plan);
        } catch {}
        
        // Extract pack ID from plan
        let packId = order.plan;
        if (order.plan.startsWith('pack_') && order.plan.includes('_', 5)) {
          const parts = order.plan.split('_');
          if (parts.length >= 2) {
            packId = `${parts[0]}_${parts[1]}`;
          }
        }
        
        let creditPackConfig;
        try {
          creditPackConfig = resolveCreditPack(pricing, packId);
        } catch {}
        
        if (subscriptionConfig) {
          const endDate = new Date();
          endDate.setDate(endDate.getDate() + subscriptionConfig.durationDays);
          
          await createOrUpdateSubscription({
            userId: order.userId,
            plan: order.plan as any,
            // monthlyLimit removed - using credits system
            price: subscriptionConfig.priceCents,
            endDate,
          });
          
          // Grant subscription credits
          await resetSubscriptionCredits(order.userId, order.plan);
          console.log("[Payment] Subscription credits granted:", subscriptionConfig.monthlyCredits);
          
          // Send email notification to admin
          const user = await getUserById(order.userId);
          if (user) {
            await notifyAdminNewOrder({
              orderNo: outTradeNo,
              userName: user.name || "",
              userEmail: user.email || "",
              productName: `${subscriptionConfig.name}套餐`,
              amount: order.amount,
              paymentMethod: "alipay",
              paidAt: new Date(),
            });
          }
        } else if (creditPackConfig) {
          // Handle credit pack order
          const { addPurchasedCredits } = await import("../creditsManager");
          await addPurchasedCredits(order.userId, creditPackConfig.credits, order.id);
          console.log("[Payment] Credits purchased:", creditPackConfig.credits);
          
          // Send email notification to admin
          const user = await getUserById(order.userId);
          if (user) {
            await notifyAdminNewOrder({
              orderNo: outTradeNo,
              userName: user.name || "",
              userEmail: user.email || "",
              productName: `${creditPackConfig.name}（${creditPackConfig.credits}积分）`,
              amount: order.amount,
              paymentMethod: "alipay",
              paidAt: new Date(),
            });
          }
        }
        
        console.log("[Payment] Payment success:", outTradeNo);
        
        // Track payment success event (server-side logging)
        console.log("[Analytics] Payment success:", {
          order_id: outTradeNo,
          user_id: order.userId,
          plan: order.plan,
          amount: order.amount,
        });
      }
      
      res.send("success");
    } catch (error) {
      console.error("[Payment] Alipay notify error:", error);
      res.status(500).send("fail");
    }
  });
  // PPT file download proxy
  app.get("/api/ppt/download/:documentId", async (req, res) => {
    try {
      const token = req.headers.authorization?.replace('Bearer ', '') || req.query.token as string;
      if (!token) return res.status(401).json({ error: 'Unauthorized' });
      
      let userId: number;
      try {
        const jwt = await import('jsonwebtoken');
        const decoded = jwt.default.verify(token, process.env.JWT_SECRET || 'fallback-secret') as any;
        userId = decoded.userId || decoded.id;
      } catch {
        return res.status(401).json({ error: 'Invalid token' });
      }
      
      const { getDb } = await import("../db");
      const db = await getDb();
      if (!db) return res.status(500).json({ error: 'Database unavailable' });
      
      const { pptDocuments } = await import("../../drizzle/schema");
      const { eq } = await import("drizzle-orm");
      const [doc] = await db.select().from(pptDocuments)
        .where(eq(pptDocuments.id, Number(req.params.documentId)))
        .limit(1);
      
      if (!doc || doc.userId !== userId) return res.status(404).json({ error: 'Not found' });
      if (!doc.fileUrl) return res.status(400).json({ error: 'File not ready' });
      
      // Fetch from CDN and stream to client
      const response = await globalThis.fetch(doc.fileUrl);
      if (!response.ok) return res.status(502).json({ error: 'Failed to fetch file' });
      
      const fileName = encodeURIComponent(doc.title || 'presentation') + '.pptx';
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.presentationml.presentation');
      res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${fileName}`);
      if (doc.fileSize) res.setHeader('Content-Length', doc.fileSize.toString());
      
      // Convert Web ReadableStream to Node.js Readable and pipe
      const { Readable } = await import('stream');
      const nodeStream = Readable.fromWeb(response.body as any);
      nodeStream.pipe(res);
    } catch (error) {
      console.error('[PPT Download] Error:', error);
      res.status(500).json({ error: 'Download failed' });
    }
  });

  app.get("/api/diagnosis/:id/report.pdf", async (req, res) => {
    try {
      const diagnosisId = Number(req.params.id);
      if (!Number.isInteger(diagnosisId) || diagnosisId <= 0) {
        return res.status(400).json({ error: "Invalid diagnosis id" });
      }

      const preview =
        process.env.NODE_ENV === "development" && req.query.preview === "1";
      const { getDiagnosis } = await import("../diagnosisService");
      const diagnosis = await getDiagnosis(diagnosisId);
      if (!diagnosis || diagnosis.status !== "done") {
        return res.status(404).json({ error: "Report not found" });
      }

      if (!preview) {
        const context = await createContext({ req, res } as any);
        if (!context.user || context.user.id !== diagnosis.userId) {
          return res.status(404).json({ error: "Report not found" });
        }
        if (
          diagnosis.productType !== "full" ||
          diagnosis.fullCreditsDeducted <= 0
        ) {
          return res.status(403).json({ error: "Full diagnosis required" });
        }
      }

      let pdfAlreadyPurchased = preview || diagnosis.pdfPurchased === 1;
      let pdfCredits = 0;
      if (!preview) {
        const {
          checkAndResetCredits,
          checkCredits,
          hasCreditCharge,
        } = await import("../creditsManager");
        const { getActionCredits } = await import("../pricingConfig");
        pdfAlreadyPurchased =
          pdfAlreadyPurchased ||
          await hasCreditCharge(diagnosisId, "diagnosis_pdf");
        if (!pdfAlreadyPurchased) {
          await checkAndResetCredits(diagnosis.userId);
          pdfCredits = await getActionCredits("diagnosis_pdf");
          if (!await checkCredits(diagnosis.userId, pdfCredits)) {
            return res.status(402).json({
              error: "INSUFFICIENT_CREDITS",
              required: pdfCredits,
            });
          }
        }
      }

      const protocol = req.protocol;
      const baseUrl = `${protocol}://${req.get("host")}`;
      const authToken = req.headers.authorization?.replace(/^Bearer\s+/i, "");
      const { renderDiagnosisReportPdf } = await import("../diagnosisReportPdf");
      const pdf = await renderDiagnosisReportPdf({
        baseUrl,
        diagnosisId,
        preview,
        authToken,
        cookieHeader: req.headers.cookie,
      });

      if (!preview && !pdfAlreadyPurchased) {
        const { deductCreditsOnce } = await import("../creditsManager");
        const charge = await deductCreditsOnce(
          diagnosis.userId,
          pdfCredits,
          `诊断 PDF - Diagnosis #${diagnosisId}`,
          diagnosisId,
          "diagnosis_pdf"
        );
        if (!charge.success) {
          return res.status(402).json({
            error: "INSUFFICIENT_CREDITS",
            required: pdfCredits,
          });
        }
        const { markDiagnosisPdfPurchased } = await import("../diagnosisService");
        await markDiagnosisPdfPurchased(diagnosisId, pdfCredits);
      }

      const company = diagnosis.intake && typeof diagnosis.intake === "object"
        ? (diagnosis.intake as any).company?.name
        : null;
      const fileName = encodeURIComponent(
        `${typeof company === "string" ? company : "NBG诊断"}-诊断报告-${diagnosisId}.pdf`
      );
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename*=UTF-8''${fileName}`
      );
      res.setHeader("Content-Length", String(pdf.length));
      return res.send(pdf);
    } catch (error) {
      console.error("[Diagnosis PDF] Generation failed:", error);
      return res.status(500).json({ error: "PDF generation failed" });
    }
  });

  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
    
    // 启动pending订单定时补偿检查
    import("../pendingOrderChecker").then(({ startPendingOrderChecker }) => {
      startPendingOrderChecker();
    }).catch((err) => {
      console.error("[PendingChecker] Failed to start:", err);
    });
  });
}

startServer().catch(console.error);
