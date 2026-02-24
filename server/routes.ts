import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { api, errorSchemas } from "@shared/routes";
import { z } from "zod";
import { startBot, stopBot, getBotStatus, initializeBotIfActive, updatePresence } from "./discord";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  app.get(api.settings.get.path, async (req, res) => {
    const settings = await storage.getSettings();
    res.json(settings || null);
  });

  app.post(api.settings.save.path, async (req, res) => {
    try {
      const input = api.settings.save.input.parse(req.body);
      const updated = await storage.saveSettings(input);
      
      // Update bot presence live if it's connected
      updatePresence(updated);
      
      res.json(updated);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join("."),
        });
      }
      throw err;
    }
  });

  app.get(api.bot.status.path, async (req, res) => {
    res.json(getBotStatus());
  });

  app.post(api.bot.start.path, async (req, res) => {
    const settings = await storage.getSettings();
    if (!settings || !settings.botToken || !settings.voiceChannelId) {
      return res.status(400).json({ message: "Bot token and voice channel ID must be configured first." });
    }
    
    try {
      await startBot(settings.botToken, settings.voiceChannelId);
      await storage.saveSettings({ ...settings, isActive: true });
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Failed to start bot" });
    }
  });

  app.post(api.bot.stop.path, async (req, res) => {
    const settings = await storage.getSettings();
    stopBot();
    if (settings) {
      await storage.saveSettings({ ...settings, isActive: false });
    }
    res.json({ success: true });
  });

  // Start bot automatically if it was active
  initializeBotIfActive();

  return httpServer;
}
