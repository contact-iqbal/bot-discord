import { z } from "zod";
import { insertBotSettingsSchema, botSettings } from "./schema";

export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  internal: z.object({
    message: z.string(),
  }),
};

export const api = {
  settings: {
    get: {
      method: "GET" as const,
      path: "/api/settings" as const,
      responses: {
        200: z.custom<typeof botSettings.$inferSelect>().nullable(),
      },
    },
    save: {
      method: "POST" as const,
      path: "/api/settings" as const,
      input: insertBotSettingsSchema,
      responses: {
        200: z.custom<typeof botSettings.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
  },
  bot: {
    status: {
      method: "GET" as const,
      path: "/api/bot/status" as const,
      responses: {
        200: z.object({
          status: z.enum(["disconnected", "connecting", "connected", "error"]),
          errorMessage: z.string().optional(),
        }),
      },
    },
    start: {
      method: "POST" as const,
      path: "/api/bot/start" as const,
      responses: {
        200: z.object({ success: z.boolean() }),
        400: z.object({ message: z.string() }),
      }
    },
    stop: {
      method: "POST" as const,
      path: "/api/bot/stop" as const,
      responses: {
        200: z.object({ success: z.boolean() }),
      }
    }
  }
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}

export type BotSettingsResponse = z.infer<typeof api.settings.get.responses[200]>;
export type SaveSettingsInput = z.infer<typeof api.settings.save.input>;
export type BotStatusResponse = z.infer<typeof api.bot.status.responses[200]>;
