import { z } from "zod";
import { adminProcedure, publicProcedure, router } from "./trpc";
import { notifyOwner } from "./notification";
import { sendEmail } from "./email";

const EXPERT_CONSULTATION_EMAIL = "cs@zesiai.com";

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
      try {
        // Send email to expert consultation email
        await sendEmail({
          to: EXPERT_CONSULTATION_EMAIL,
          subject: "【泽思AI】专家顾问咨询请求",
          html: `
            <h2>专家顾问咨询请求</h2>
            <p><strong>提交时间:</strong> ${new Date().toLocaleString("zh-CN")}</p>
            <p><strong>姓名:</strong> ${input.name}</p>
            <p><strong>联系方式:</strong> ${input.contact}</p>
            <p><strong>咨询需求:</strong></p>
            <p>${input.requirement.replace(/\n/g, "<br>")}</p>
          `,
        });

        // Also notify owner via platform notification
        await notifyOwner({
          title: "专家顾问咨询请求",
          content: `姓名：${input.name}\n联系方式：${input.contact}\n咨询需求：${input.requirement}`,
        });

        return {
          success: true,
        } as const;
      } catch (error) {
        console.error("[Expert Consultation] Failed to send notification:", error);
        return {
          success: false,
        } as const;
      }
    }),
});
