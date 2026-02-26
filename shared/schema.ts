import { pgTable, text, serial, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const botSettings = pgTable("bot_settings", {
  id: serial("id").primaryKey(),
  isActive: boolean("is_active").default(false).notNull(),
  presenceType: text("presence_type").default("PLAYING").notNull(),
  presenceName: text("presence_name").default("").notNull(),
  status: text("status").default("online").notNull(),
  prefix: text("prefix").default("!").notNull(),
  bio: text("bio").default("24/7 Voice channel stay bot with customizable presence and prefix commands.").notNull(),
});

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  discordId: text("discord_id").unique().notNull(),
  username: text("username").notNull(),
  avatar: text("avatar"),
  accessToken: text("access_token"),
});

// Table for connect-pg-simple session storage
export const session = pgTable("session", {
  sid: text("sid").primaryKey(),
  sess: jsonb("sess").notNull(),
  expire: timestamp("expire").notNull(),
});

export const guildSettings = pgTable("guild_settings", {
  id: serial("id").primaryKey(),
  guildId: text("guild_id").unique().notNull(),
  prefix: text("prefix").default("!").notNull(),
  allowedRoles: jsonb("allowed_roles").default([]).notNull(), // Array of role IDs
  blockedRoles: jsonb("blocked_roles").default([]).notNull(), // Array of role IDs
});

export const insertBotSettingsSchema = createInsertSchema(botSettings).omit({ id: true });
export const insertUserSchema = createInsertSchema(users).omit({ id: true });
export const insertGuildSettingsSchema = createInsertSchema(guildSettings).omit({ id: true });

export type BotSettings = typeof botSettings.$inferSelect;
export type InsertBotSettings = z.infer<typeof insertBotSettingsSchema>;

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type GuildSettings = typeof guildSettings.$inferSelect;
export type InsertGuildSettings = z.infer<typeof insertGuildSettingsSchema>;
