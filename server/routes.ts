import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { api, errorSchemas } from "@shared/routes";
import { z } from "zod";
import { startBot, stopBot, getBotStatus, initializeBotIfActive, updatePresence, getBotGuilds } from "./discord";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // Health check endpoint for Uptime monitoring (e.g. UptimeRobot)
  app.get("/api/health", (_req, res) => {
    res.json({ 
      status: "ok", 
      uptime: process.uptime(),
      bot: getBotStatus()
    });
  });
  
  app.get("/api/guilds", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const response = await fetch("https://discord.com/api/users/@me/guilds", {
        headers: {
          Authorization: `Bearer ${req.user.accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch guilds from Discord");
      }

      const userGuilds = await response.json() as any[];
      const botGuilds = getBotGuilds();

      const guilds = userGuilds
        .filter((guild: any) => (BigInt(guild.permissions) & BigInt(0x20)) === BigInt(0x20)) // MANAGE_GUILD permission
        .map((guild: any) => ({
          ...guild,
          botJoined: botGuilds.some(bg => bg.id === guild.id),
        }));

      res.json(guilds);
    } catch (err) {
      console.error("Error fetching guilds:", err);
      res.status(500).json({ message: "Failed to fetch guilds" });
    }
  });

  app.get("/api/guilds/:guildId/roles", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const { guildId } = req.params;
    
    try {
      // Check if bot is in guild
      const botGuilds = getBotGuilds();
      if (!botGuilds.some(bg => bg.id === guildId)) {
        return res.status(404).json({ message: "Bot not in this guild" });
      }

      const response = await fetch(`https://discord.com/api/guilds/${guildId}/roles`, {
        headers: {
          Authorization: `Bot ${process.env.DISCORD_TOKEN}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error(`Discord API Error (${response.status}):`, errorData);
        throw new Error(`Failed to fetch roles: ${response.statusText}`);
      }

      const roles = await response.json();
      res.json(roles);
    } catch (err) {
      console.error("Error fetching roles:", err);
      res.status(500).json({ message: "Failed to fetch roles" });
    }
  });

  app.get("/api/guilds/:guildId/settings", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const { guildId } = req.params;
    const settings = await storage.getGuildSettings(guildId);
    res.json(settings || { guildId, allowedRoles: [], blockedRoles: [] });
  });

  app.post("/api/guilds/:guildId/settings", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const { guildId } = req.params;
    try {
      const updated = await storage.updateGuildSettings(guildId, req.body);
      res.json(updated);
    } catch (err) {
      res.status(500).json({ message: "Failed to save settings" });
    }
  });

  app.get(api.settings.get.path, async (req, res) => {
    const settings = await storage.getSettings();
    res.json(settings || null);
  });

  app.post(api.settings.save.path, async (req, res) => {
    try {
      const input = api.settings.save.input.parse(req.body);
      const updated = await storage.saveSettings(input);
      
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
    if (!settings) {
      return res.status(400).json({ message: "Settings not found." });
    }
    
    try {
      await startBot();
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
