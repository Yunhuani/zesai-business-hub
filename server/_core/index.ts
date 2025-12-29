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
  const app = express();
  const server = createServer(app);
  
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
        return res.status(400).send("fail");
      }
      
      const outTradeNo = req.body.out_trade_no;
      const tradeStatus = req.body.trade_status;
      const tradeNo = req.body.trade_no;
      
      // Query order
      const order = await getOrderByOutTradeNo(outTradeNo);
      if (!order) {
        console.error("[Payment] Order not found:", outTradeNo);
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
        
        // Update user subscription
        const PLAN_CONFIG = {
          free: { monthlyCredits: 100, price: 0, duration: 30 },
          basic: { monthlyCredits: 750, price: 9900, duration: 30 },
          professional: { monthlyCredits: 2600, price: 29900, duration: 30 },
          enterprise: { monthlyCredits: 11000, price: 99900, duration: 30 },
        };
        
        // Check if it's a subscription or credit pack order
        const subscriptionConfig = PLAN_CONFIG[order.plan as keyof typeof PLAN_CONFIG];
        
        // Extract pack ID from plan
        let packId = order.plan;
        if (order.plan.startsWith('pack_') && order.plan.includes('_', 5)) {
          const parts = order.plan.split('_');
          if (parts.length >= 2) {
            packId = `${parts[0]}_${parts[1]}`;
          }
        }
        
        const CREDIT_PACK_CONFIG: Record<string, { name: string; credits: number; price: number }> = {
          pack_500: { name: "入门包", credits: 500, price: 4900 },
          pack_1000: { name: "超值包", credits: 1000, price: 9900 },
          pack_2200: { name: "专业包", credits: 2200, price: 19900 },
          pack_5500: { name: "企业包", credits: 5500, price: 39900 },
        };
        const creditPackConfig = CREDIT_PACK_CONFIG[packId];
        
        if (subscriptionConfig) {
          const endDate = new Date();
          endDate.setDate(endDate.getDate() + subscriptionConfig.duration);
          
          await createOrUpdateSubscription({
            userId: order.userId,
            plan: order.plan as any,
            // monthlyLimit removed - using credits system
            price: subscriptionConfig.price,
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
              productName: `${subscriptionConfig.monthlyCredits === 750 ? "基础版" : subscriptionConfig.monthlyCredits === 2600 ? "专业版" : "企业版"}套餐`,
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
      }
      
      res.send("success");
    } catch (error) {
      console.error("[Payment] Alipay notify error:", error);
      res.status(500).send("fail");
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
  });
}

startServer().catch(console.error);
