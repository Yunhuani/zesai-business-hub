import { z } from "zod";
import { notifyOwner } from "./notification";
import { adminProcedure, publicProcedure, router } from "./trpc";

export const systemRouter = router({
  health: publicProcedure
    .input(
      z.object({
        timestamp: z.number().min(0, "timestamp cannot be negative"),
      })
    )
    .query(() => ({
      ok: true,
    })),

  notifyOwner: adminProcedure
    .input(
      z.object({
        title: z.string().min(1, "title is required"),
        content: z.string().min(1, "content is required"),
      })
    )
    .mutation(async ({ input }) => {
      const delivered = await notifyOwner(input);
      return {
        success: delivered,
      } as const;
    }),

  submitExpertConsultation: publicProcedure
    .input(
      z.object({
        name: z.string().min(1, "name is required"),
        contact: z.string().min(1, "contact is required"),
        requirement: z.string().min(1, "requirement is required"),
      })
    )
    .mutation(async ({ input }) => {
      // Notify owner about the expert consultation request
      const delivered = await notifyOwner({
        title: "专家顾问咨询请求",
        content: `姓名：${input.name}\n联系方式：${input.contact}\n咨询需求：${input.requirement}`,
      });
      
      return {
        success: delivered,
      } as const;
    }),
});
