import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { supportTickets } from "../../drizzle/schema";
import { eq, desc, and, sql } from "drizzle-orm";
import { notifyOwner } from "../_core/notification";

export const supportRouter = router({
  /**
   * Create a new support ticket
   * Called when user requests human support
   */
  createTicket: protectedProcedure
    .input(
      z.object({
        conversationId: z.number(),
        category: z.string().optional(),
        priority: z.enum(["normal", "urgent"]).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      try {
        // Create support ticket
        const [ticket] = await db.insert(supportTickets).values({
          userId: ctx.user.id,
          conversationId: input.conversationId,
          category: input.category || "general",
          priority: input.priority || "normal",
          status: "pending",
        });

        // Notify owner
        await notifyOwner({
          title: "新的客服工单",
          content: `用户 ${ctx.user.name || ctx.user.email} 创建了新的客服工单（工单ID: ${ticket.insertId}）。请及时处理。`,
        });

        return {
          success: true,
          ticketId: ticket.insertId,
        };
      } catch (error) {
        console.error("[Support] Failed to create ticket:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create support ticket",
        });
      }
    }),

  /**
   * Get all support tickets (admin only)
   */
  listTickets: protectedProcedure
    .input(
      z.object({
        status: z.enum(["pending", "in_progress", "resolved"]).optional(),
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
        status: z.enum(["pending", "in_progress", "resolved"]),
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

      const [inProgressCount] = await db
        .select({ count: sql<number>`count(*)` })
        .from(supportTickets)
        .where(eq(supportTickets.status, "in_progress"));

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
        inProgress: Number(inProgressCount.count) || 0,
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
