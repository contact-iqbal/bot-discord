import { Client, GatewayIntentBits, ActivityType, PresenceStatusData } from "discord.js";
import { joinVoiceChannel, getVoiceConnection } from "@discordjs/voice";
import { storage } from "./storage";

let client: Client | null = null;
let currentStatus: "disconnected" | "connecting" | "connected" | "error" = "disconnected";
let errorMessage: string | undefined = undefined;

export function getBotStatus() {
  return { status: currentStatus, errorMessage };
}

export async function initializeBotIfActive() {
  try {
    const settings = await storage.getSettings();
    if (settings && settings.isActive && settings.botToken && settings.voiceChannelId) {
      console.log("Bot was active, attempting to reconnect...");
      startBot(settings.botToken, settings.voiceChannelId).catch(console.error);
    }
  } catch (err) {
    console.error("Failed to initialize bot from storage:", err);
  }
}

export async function startBot(token: string, channelId: string) {
  if (client) {
    stopBot();
  }

  currentStatus = "connecting";
  errorMessage = undefined;

  client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildVoiceStates,
    ],
  });

  return new Promise<void>((resolve, reject) => {
    client!.once("ready", async (c) => {
      try {
        const settings = await storage.getSettings();
        if (settings) {
          updatePresence(settings);
        }

        const channel = await c.channels.fetch(channelId);
        if (!channel || !channel.isVoiceBased()) {
          throw new Error("Invalid voice channel ID");
        }

        joinVoiceChannel({
          channelId: channel.id,
          guildId: channel.guild.id,
          adapterCreator: channel.guild.voiceAdapterCreator,
        });

        currentStatus = "connected";
        resolve();
      } catch (err: any) {
        currentStatus = "error";
        errorMessage = err.message;
        reject(err);
      }
    });

    client!.once("error", (err) => {
      currentStatus = "error";
      errorMessage = err.message;
    });

    client!.login(token).catch((err) => {
      currentStatus = "error";
      errorMessage = "Invalid token or failed to login: " + err.message;
      reject(err);
    });
  });
}

export function updatePresence(settings: { presenceType: string, presenceName: string, status: string }) {
  if (!client || !client.user) return;

  const typeMap: Record<string, number> = {
    "PLAYING": ActivityType.Playing,
    "STREAMING": ActivityType.Streaming,
    "LISTENING": ActivityType.Listening,
    "WATCHING": ActivityType.Watching,
    "CUSTOM": ActivityType.Custom,
    "COMPETING": ActivityType.Competing
  };

  const activityType = typeMap[settings.presenceType.toUpperCase()] ?? ActivityType.Playing;
  
  client.user.setPresence({
    activities: [{
      name: settings.presenceName,
      type: activityType,
    }],
    status: settings.status as PresenceStatusData,
  });
}

export function stopBot() {
  if (client) {
    client.destroy();
    client = null;
  }
  currentStatus = "disconnected";
  errorMessage = undefined;
}

  if (client) {
    client.destroy();
    client = null;
  }
  currentStatus = "disconnected";
  errorMessage = undefined;
}
