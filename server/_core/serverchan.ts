/**
 * Server酱微信通知模块
 * 调用 sctapi.ftqq.com 推送微信消息
 */

const SERVERCHAN_KEY = process.env.SERVERCHAN_KEY ?? "";
const SERVERCHAN_API = `https://sctapi.ftqq.com/${SERVERCHAN_KEY}.send`;

export interface ServerChanMessage {
  title: string;
  desp?: string; // Markdown 格式正文
}

export async function sendServerChan(message: ServerChanMessage): Promise<boolean> {
  if (!SERVERCHAN_KEY) {
    console.warn("[ServerChan] SERVERCHAN_KEY not configured, skipping notification");
    return false;
  }

  try {
    const response = await fetch(SERVERCHAN_API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: message.title,
        desp: message.desp ?? "",
      }),
    });

    if (!response.ok) {
      console.error(`[ServerChan] API returned ${response.status}`);
      return false;
    }

    const result = (await response.json()) as { code?: number; message?: string };
    if (result.code !== 0) {
      console.error(`[ServerChan] Send failed: ${result.message}`);
      return false;
    }

    console.log("[ServerChan] Notification sent successfully");
    return true;
  } catch (error) {
    console.error("[ServerChan] Send error:", error);
    return false;
  }
}
