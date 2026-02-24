import { pgTable, text, serial, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const botSettings = pgTable("bot_settings", {
  id: serial("id").primaryKey(),
  botToken: text("bot_token").notNull(),
  voiceChannelId: text("voice_channel_id").notNull(),
  isActive: boolean("is_active").default(false).notNull(),
});

export const insertBotSettingsSchema = createInsertSchema(botSettings).omit({ id: true });
export type BotSettings = typeof botSettings.$inferSelect;
export type InsertBotSettings = z.infer<typeof insertBotSettingsSchema>;
