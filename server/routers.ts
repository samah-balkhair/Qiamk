import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { nanoid } from "nanoid";
import * as db from "./db";

export const appRouter = router({
  system: systemRouter,

  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  sessions: router({
    create: protectedProcedure.mutation(async ({ ctx }) => {
      const sessionId = nanoid();
      const session = await db.createSession({
        id: sessionId,
        userId: ctx.user.id,
        currentPage: 1,
        status: "active",
      });
      return session;
    }),

    get: protectedProcedure
      .input(z.object({ id: z.string() }))
      .query(async ({ input }) => {
        return await db.getSession(input.id);
      }),

    updatePage: protectedProcedure
      .input(z.object({ 
        id: z.string(),
        page: z.number().min(1).max(6)
      }))
      .mutation(async ({ input }) => {
        await db.updateSession(input.id, { currentPage: input.page });
        return { success: true };
      }),

    complete: protectedProcedure
      .input(z.object({ id: z.string() }))
      .mutation(async ({ input }) => {
        await db.updateSession(input.id, { 
          status: "completed",
          completedAt: new Date()
        });
        return { success: true };
      }),

    updateProgress: protectedProcedure
      .input(z.object({ 
        id: z.string(),
        comparisonsCompleted: z.number(),
        totalComparisons: z.number()
      }))
      .mutation(async ({ input }) => {
        await db.updateSession(input.id, { 
          comparisonsCompleted: input.comparisonsCompleted,
          totalComparisons: input.totalComparisons
        });
        return { success: true };
      }),

    getCompletedCount: publicProcedure.query(async () => {
      return await db.getCompletedSessionsCount();
    }),

    cleanupSession: protectedProcedure
      .input(z.object({ sessionId: z.string() }))
      .mutation(async ({ input }) => {
        await db.cleanupSessionData(input.sessionId);
        return { success: true };
      }),
  }),

  values: router({
    getAll: publicProcedure.query(async () => {
      return await db.getAllCoreValues();
    }),

    add: protectedProcedure
      .input(z.object({ name: z.string() }))
      .mutation(async ({ ctx, input }) => {
        // Check if value already exists
        const existing = await db.findValueByName(input.name);
        if (existing) {
          return existing;
        }

        const valueId = nanoid();
        const value = await db.addCoreValue({
          id: valueId,
          name: input.name,
          isDefault: false,
          createdBy: ctx.user.id,
        });
        return value;
      }),

    selectValues: protectedProcedure
      .input(z.object({
        sessionId: z.string(),
        valueIds: z.array(z.string()).min(5).max(50),
      }))
      .mutation(async ({ input }) => {
        const selectedValuesList = [];
        for (const valueId of input.valueIds) {
          const sv = await db.addSelectedValue({
            id: nanoid(),
            sessionId: input.sessionId,
            valueId,
            initialScore: 0,
            finalScore: 0,
          });
          selectedValuesList.push(sv);
        }
        return selectedValuesList;
      }),

    getSelected: protectedProcedure
      .input(z.object({ sessionId: z.string() }))
      .query(async ({ input }) => {
        return await db.getSelectedValuesWithNames(input.sessionId);
      }),

    updateDefinition: protectedProcedure
      .input(z.object({
        id: z.string(),
        definition: z.string(),
      }))
      .mutation(async ({ input }) => {
        await db.updateSelectedValue(input.id, { definition: input.definition });
        return { success: true };
      }),

    updateScore: protectedProcedure
      .input(z.object({
        id: z.string(),
        score: z.number(),
        type: z.enum(["initial", "final"]),
      }))
      .mutation(async ({ input }) => {
        if (input.type === "initial") {
          await db.updateSelectedValue(input.id, { initialScore: input.score });
        } else {
          await db.updateSelectedValue(input.id, { finalScore: input.score });
        }
        return { success: true };
      }),

    getTopValues: protectedProcedure
      .input(z.object({ 
        sessionId: z.string(),
        limit: z.number().optional().default(10)
      }))
      .query(async ({ input }) => {
        return await db.getTopSelectedValues(input.sessionId, input.limit);
      }),
  }),

  comparisons: router({
    add: protectedProcedure
      .input(z.object({
        sessionId: z.string(),
        value1Id: z.string(),
        value2Id: z.string(),
        selectedValueId: z.string(),
        round: z.number(),
      }))
      .mutation(async ({ input }) => {
        const comparison = await db.addInitialComparison({
          id: nanoid(),
          sessionId: input.sessionId,
          value1Id: input.value1Id,
          value2Id: input.value2Id,
          selectedValueId: input.selectedValueId,
          comparisonRound: input.round,
        });
        return comparison;
      }),

    getAll: protectedProcedure
      .input(z.object({ sessionId: z.string() }))
      .query(async ({ input }) => {
        return await db.getInitialComparisons(input.sessionId);
      }),
  }),

  scenarios: router({
    add: protectedProcedure
      .input(z.object({
        sessionId: z.string(),
        value1Id: z.string(),
        value1Definition: z.string(),
        value2Id: z.string(),
        value2Definition: z.string(),
        scenarioText: z.string(),
      }))
      .mutation(async ({ input }) => {
        const scenario = await db.addScenario({
          id: nanoid(),
          sessionId: input.sessionId,
          value1Id: input.value1Id,
          value1Definition: input.value1Definition,
          value2Id: input.value2Id,
          value2Definition: input.value2Definition,
          scenarioText: input.scenarioText,
        });
        return scenario;
      }),

    updateChoice: protectedProcedure
      .input(z.object({
        id: z.string(),
        selectedValueId: z.string(),
      }))
      .mutation(async ({ input }) => {
        await db.updateScenario(input.id, { selectedValueId: input.selectedValueId });
        return { success: true };
      }),

    getAll: protectedProcedure
      .input(z.object({ sessionId: z.string() }))
      .query(async ({ input }) => {
        return await db.getScenarios(input.sessionId);
      }),
  }),

  results: router({
    save: protectedProcedure
      .input(z.object({
        sessionId: z.string(),
        topValue1Id: z.string(),
        topValue1Definition: z.string(),
        topValue2Id: z.string(),
        topValue2Definition: z.string(),
        topValue3Id: z.string(),
        topValue3Definition: z.string(),
      }))
      .mutation(async ({ input }) => {
        const result = await db.addFinalResult({
          id: nanoid(),
          sessionId: input.sessionId,
          topValue1Id: input.topValue1Id,
          topValue1Definition: input.topValue1Definition,
          topValue2Id: input.topValue2Id,
          topValue2Definition: input.topValue2Definition,
          topValue3Id: input.topValue3Id,
          topValue3Definition: input.topValue3Definition,
          sentToGhl: false,
          emailSent: false,
        });
        return result;
      }),

    get: protectedProcedure
      .input(z.object({ sessionId: z.string() }))
      .query(async ({ input }) => {
        return await db.getFinalResult(input.sessionId);
      }),

    markGhlSent: protectedProcedure
      .input(z.object({ id: z.string() }))
      .mutation(async ({ input }) => {
        await db.updateFinalResult(input.id, { sentToGhl: true });
        return { success: true };
      }),

    markEmailSent: protectedProcedure
      .input(z.object({ id: z.string() }))
      .mutation(async ({ input }) => {
        await db.updateFinalResult(input.id, { emailSent: true });
        return { success: true };
      }),
  }),
});

export type AppRouter = typeof appRouter;

