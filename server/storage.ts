import { botSettings, type BotSettings, type InsertBotSettings } from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";

export interface IStorage {
  getSettings(): Promise<BotSettings | undefined>;
  saveSettings(settings: InsertBotSettings): Promise<BotSettings>;
}

export class DatabaseStorage implements IStorage {
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
}

export const storage = new DatabaseStorage();
