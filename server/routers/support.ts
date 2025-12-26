import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { publicProcedure, protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { supportTickets } from "../../drizzle/schema";
import { eq, desc, and, sql } from "drizzle-orm";
import { sendEmail } from "../_core/email";

const SUPPORT_EMAIL = "16289209@qq.com";

export const supportRouter = router({
  /**
   * Submit a support ticket (form submission)
   * Can be used by both logged-in and anonymous users
   */
  submitTicket: publicProcedure
    .input(
      z.object({
        userName: z.string().min(1, "请输入姓名"),
        userEmail: z.string().email("请输入有效的邮箱地址"),
        wechat: z.string().min(1, "请输入微信号"),
        issueType: z.enum(["technical", "account", "payment", "feature", "other"]),
        description: z.string().min(10, "问题描述至少10个字符"),
        attachmentUrl: z.string().url().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      try {
        // Create support ticket
        const [ticket] = await db.insert(supportTickets).values({
          userId: ctx.user?.id, // Optional, for logged-in users
          userName: input.userName,
          userEmail: input.userEmail,
          wechat: input.wechat,
          issueType: input.issueType,
          description: input.description,
          attachmentUrl: input.attachmentUrl,
          status: "pending",
        });

        // Send email notification to admin
        const issueTypeMap = {
          technical: "技术问题",
          account: "账户问题",
          payment: "支付问题",
          feature: "功能建议",
          other: "其他问题",
        };

        await sendEmail({
          to: SUPPORT_EMAIL,
          subject: `【泽思AI】新的客服工单 - ${issueTypeMap[input.issueType]}`,
          html: `
            <h2>新的客服工单</h2>
            <p><strong>工单ID:</strong> ${ticket.insertId}</p>
            <p><strong>提交时间:</strong> ${new Date().toLocaleString("zh-CN")}</p>
            <p><strong>用户姓名:</strong> ${input.userName}</p>
            <p><strong>联系邮箱:</strong> ${input.userEmail}</p>
            <p><strong>微信号:</strong> ${input.wechat}</p>
            <p><strong>问题类型:</strong> ${issueTypeMap[input.issueType]}</p>
            <p><strong>问题描述:</strong></p>
            <p>${input.description.replace(/\n/g, "<br>")}</p>
            ${input.attachmentUrl ? `<p><strong>附件:</strong> <a href="${input.attachmentUrl}">${input.attachmentUrl}</a></p>` : ""}
          `,
        });

        return {
          success: true,
          ticketId: ticket.insertId,
        };
      } catch (error) {
        console.error("[Support] Failed to submit ticket:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "提交失败，请稍后重试",
        });
      }
    }),

  /**
   * Get all support tickets (admin only)
   */
  listTickets: protectedProcedure
    .input(
      z.object({
        status: z.enum(["pending", "resolved"]).optional(),
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      // Check if user is admin
      if (ctx.user.role !== "admin") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only admins can view all support tickets",
        });
      }

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      try {
        const conditions = [];
        if (input.status) {
          conditions.push(eq(supportTickets.status, input.status));
        }

        const tickets = await db
          .select()
          .from(supportTickets)
          .where(conditions.length > 0 ? and(...conditions) : undefined)
          .orderBy(desc(supportTickets.createdAt))
          .limit(input.limit)
          .offset(input.offset);

        return tickets;
      } catch (error) {
        console.error("[Support] Failed to list tickets:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to list support tickets",
        });
      }
    }),

  /**
   * Get support ticket detail
   */
  getTicketDetail: protectedProcedure
    .input(z.object({ ticketId: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      try {
        const [ticket] = await db
          .select()
          .from(supportTickets)
          .where(eq(supportTickets.id, input.ticketId))
          .limit(1);

        if (!ticket) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Support ticket not found",
          });
        }

        // Check permission: user can only view their own tickets, admin can view all
        if (ticket.userId !== ctx.user.id && ctx.user.role !== "admin") {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You don't have permission to view this ticket",
          });
        }

        return ticket;
      } catch (error) {
        console.error("[Support] Failed to get ticket detail:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to get support ticket detail",
        });
      }
    }),

  /**
   * Update support ticket status (admin only)
   */
  updateTicketStatus: protectedProcedure
    .input(
      z.object({
        ticketId: z.number(),
        status: z.enum(["pending", "resolved"]),
        internalNotes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Check if user is admin
      if (ctx.user.role !== "admin") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only admins can update support tickets",
        });
      }

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      try {
        const updateData: any = {
          status: input.status,
        };

        if (input.internalNotes) {
          updateData.internalNotes = input.internalNotes;
        }

        if (input.status === "resolved") {
          updateData.resolvedAt = new Date();
        }

        await db
          .update(supportTickets)
          .set(updateData)
          .where(eq(supportTickets.id, input.ticketId));

        return { success: true };
      } catch (error) {
        console.error("[Support] Failed to update ticket status:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update support ticket status",
        });
      }
    }),

  /**
   * Get support statistics (admin only)
   */
  getStatistics: protectedProcedure.query(async ({ ctx }) => {
    // Check if user is admin
    if (ctx.user.role !== "admin") {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Only admins can view support statistics",
      });
    }

    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

    try {
      // Get today's date range
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      // Count tickets by status
      const [pendingCount] = await db
        .select({ count: sql<number>`count(*)` })
        .from(supportTickets)
        .where(eq(supportTickets.status, "pending"));

      const [resolvedCount] = await db
        .select({ count: sql<number>`count(*)` })
        .from(supportTickets)
        .where(eq(supportTickets.status, "resolved"));

      // Count today's tickets
      const [todayCount] = await db
        .select({ count: sql<number>`count(*)` })
        .from(supportTickets)
        .where(
          and(
            sql`${supportTickets.createdAt} >= ${today}`,
            sql`${supportTickets.createdAt} < ${tomorrow}`
          )
        );

      return {
        pending: Number(pendingCount.count) || 0,
        resolved: Number(resolvedCount.count) || 0,
        today: Number(todayCount.count) || 0,
      };
    } catch (error) {
      console.error("[Support] Failed to get statistics:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to get support statistics",
      });
    }
  }),
});
