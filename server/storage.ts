import { botSettings, type BotSettings, type InsertBotSettings, users, type User, type InsertUser, guildSettings, type GuildSettings, type InsertGuildSettings } from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { pool } from "./db";

const PostgresSessionStore = connectPg(session);

export interface IStorage {
  getSettings(): Promise<BotSettings | undefined>;
  saveSettings(settings: InsertBotSettings): Promise<BotSettings>;
  updateActiveStatus(isActive: boolean): Promise<void>;
  
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByDiscordId(discordId: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, user: Partial<InsertUser>): Promise<User>;
  
  // Guild Settings
  getGuildSettings(guildId: string): Promise<GuildSettings | undefined>;
  updateGuildSettings(guildId: string, settings: Partial<InsertGuildSettings>): Promise<GuildSettings>;

  sessionStore: session.Store;
}

export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;
  private guildSettingsCache = new Map<string, { settings: GuildSettings, timestamp: number }>();
  private CACHE_TTL = 1000 * 60 * 5; // 5 menit cache

  constructor() {
    this.sessionStore = new PostgresSessionStore({
      pool,
      createTableIfMissing: false,
      tableName: "session",
    });
  }

  async getSettings(): Promise<BotSettings | undefined> {
    const [settings] = await db.select().from(botSettings).limit(1);
    return settings;
  }

  async saveSettings(settings: InsertBotSettings): Promise<BotSettings> {
    const existing = await this.getSettings();
    if (existing) {
      const [updated] = await db.update(botSettings)
        .set(settings)
        .where(eq(botSettings.id, existing.id))
        .returning();
      return updated;
    } else {
      const [inserted] = await db.insert(botSettings).values(settings).returning();
      return inserted;
    }
  }

  async updateActiveStatus(isActive: boolean): Promise<void> {
    const existing = await this.getSettings();
    if (existing) {
      await db.update(botSettings)
        .set({ isActive })
        .where(eq(botSettings.id, existing.id));
    }
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByDiscordId(discordId: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.discordId, discordId));
    return user;
  }

  async createUser(user: InsertUser): Promise<User> {
    const [inserted] = await db.insert(users).values(user).returning();
    return inserted;
  }

  async updateUser(id: number, user: Partial<InsertUser>): Promise<User> {
    const [updated] = await db.update(users)
      .set(user)
      .where(eq(users.id, id))
      .returning();
    return updated;
  }

  // Guild Settings dengan Caching
  async getGuildSettings(guildId: string): Promise<GuildSettings | undefined> {
    const cached = this.guildSettingsCache.get(guildId);
    if (cached && (Date.now() - cached.timestamp < this.CACHE_TTL)) {
      return cached.settings;
    }

    const [settings] = await db.select().from(guildSettings).where(eq(guildSettings.guildId, guildId));
    
    if (settings) {
      this.guildSettingsCache.set(guildId, {
        settings,
        timestamp: Date.now()
      });
    }
    
    return settings;
  }

  async updateGuildSettings(guildId: string, settings: Partial<InsertGuildSettings>): Promise<GuildSettings> {
    const existing = await this.getGuildSettings(guildId);
    let updated: GuildSettings;

    if (existing) {
      const [res] = await db.update(guildSettings)
        .set(settings)
        .where(eq(guildSettings.guildId, guildId))
        .returning();
      updated = res;
    } else {
      const [res] = await db.insert(guildSettings)
        .values({ ...settings, guildId } as InsertGuildSettings)
        .returning();
      updated = res;
    }

    // Update cache setelah perubahan
    this.guildSettingsCache.set(guildId, {
      settings: updated,
      timestamp: Date.now()
    });

    return updated;
  }
}

export const storage = new DatabaseStorage();
