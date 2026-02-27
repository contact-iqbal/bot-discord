import { 
  AudioPlayer, 
  AudioPlayerStatus, 
  createAudioPlayer, 
  createAudioResource, 
  getVoiceConnection, 
  VoiceConnection 
} from "@discordjs/voice";
import play from "play-dl";
import { EmbedBuilder, TextBasedChannel } from "discord.js";

// Global state for SoundCloud initialization
let isSoundCloudInitialized = false;
let isInitializing = false;

/**
 * Robust Initialization: Ensures SoundCloud Client ID is fetched and set.
 * Uses a locking mechanism (isInitializing) to prevent race conditions.
 */
async function ensureSoundCloudAuth() {
  if (isSoundCloudInitialized) return true;
  if (isInitializing) {
    // Wait for the ongoing initialization to finish
    while (isInitializing) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    return isSoundCloudInitialized;
  }

  isInitializing = true;
  try {
    console.log("[SoundCloud] Fetching free client ID...");
    const clientId = await play.getFreeClientID();
    
    if (clientId) {
      await play.setToken({
        soundcloud: {
          client_id: clientId
        }
      });
      isSoundCloudInitialized = true;
      console.log("[SoundCloud] Client ID set successfully:", clientId);
    } else {
      throw new Error("Failed to obtain a free Client ID from SoundCloud.");
    }
  } catch (err: any) {
    console.error("[SoundCloud] Initialization failed:", err.message);
    isSoundCloudInitialized = false;
  } finally {
    isInitializing = false;
  }
  return isSoundCloudInitialized;
}

// Initial attempt at startup (non-blocking)
ensureSoundCloudAuth().catch(console.error);

interface Track {
  title: string;
  url: string;
  thumbnail: string;
  duration: string;
  author: string;
  requestedBy: string;
}

class GuildMusicManager {
  public readonly player: AudioPlayer;
  public queue: Track[] = [];
  public currentTrack: Track | null = null;
  private channel: TextBasedChannel | null = null;

  constructor() {
    this.player = createAudioPlayer();

    this.player.on(AudioPlayerStatus.Idle, () => {
      this.playNext();
    });

    this.player.on("error", (error) => {
      console.error("Audio Player Error:", error.message);
      this.playNext();
    });
  }

  public setChannel(channel: TextBasedChannel) {
    this.channel = channel;
  }

  public async addToQueue(track: Track, guildId: string) {
    this.queue.push(track);
    
    const connection = getVoiceConnection(guildId);
    if (connection) {
      connection.subscribe(this.player);
    }

    if (this.player.state.status === AudioPlayerStatus.Idle) {
      await this.playNext();
    } else {
      const embed = new EmbedBuilder()
        .setColor("#5865F2")
        .setTitle("✅ Menambahkan ke Antrean")
        .setDescription(`**[${track.title}](${track.url})** telah ditambahkan ke antrean.`)
        .setThumbnail(track.thumbnail)
        .addFields(
          { name: "Durasi", value: track.duration, inline: true },
          { name: "Posisi", value: `#${this.queue.length}`, inline: true }
        )
        .setFooter({ text: `Diminta oleh ${track.requestedBy}` });

      this.channel?.send({ embeds: [embed] }).catch(console.error);
    }
  }

  public async playNext() {
    if (this.queue.length === 0) {
      this.currentTrack = null;
      return;
    }

    const track = this.queue.shift()!;
    this.currentTrack = track;

    try {
      console.log("[SoundCloud] Attempting to stream URL:", track.url);
      
      const isAuthReady = await ensureSoundCloudAuth();
      if (!isAuthReady) {
        throw new Error("SoundCloud authentication is not ready.");
      }

      // play-dl sometimes fails with 404 if the URL isn't properly resolved or if client_id is stale
      const stream = await play.stream(track.url, {
        quality: 1,
        discordPlayerCompatibility: true,
      }).catch(async (err) => {
        // If 404 occurs, try to re-initialize SoundCloud and retry once
        if (err.message.includes("404") || err.message.includes("client_id")) {
          console.warn("[SoundCloud] Got 404/Auth error, re-initializing...");
          isSoundCloudInitialized = false;
          await ensureSoundCloudAuth();
          return await play.stream(track.url, {
            quality: 1,
            discordPlayerCompatibility: true,
          });
        }
        throw err;
      });

      const resource = createAudioResource(stream.stream, {
        inputType: stream.type,
        inlineVolume: false, // Disabling inline volume saves CPU on Replit
      });

      this.player.play(resource);

      const embed = new EmbedBuilder()
        .setColor("#10B981")
        .setTitle("🎶 Sedang Memutar")
        .setDescription(`**[${track.title}](${track.url})**`)
        .setThumbnail(track.thumbnail)
        .addFields(
          { name: "Artis", value: track.author, inline: true },
          { name: "Durasi", value: track.duration, inline: true }
        )
        .setFooter({ text: `Diminta oleh ${track.requestedBy}` });

      this.channel?.send({ embeds: [embed] }).catch(console.error);
    } catch (err: any) {
      console.error("[SoundCloud] Playback Error:", err.message);
      this.channel?.send(`❌ Gagal memutar lagu: ${err.message}`).catch(console.error);
      
      // Auto-healing: Try to re-init if client_id error occurs
      if (err.message.includes("client_id")) {
        isSoundCloudInitialized = false;
        await ensureSoundCloudAuth();
      }
      
      this.playNext();
    }
  }

  public stop() {
    this.queue = [];
    this.currentTrack = null;
    this.player.stop();
  }
}

export class MusicManager {
  private static managers = new Map<string, GuildMusicManager>();

  public static getManager(guildId: string): GuildMusicManager {
    let manager = this.managers.get(guildId);
    if (!manager) {
      manager = new GuildMusicManager();
      this.managers.set(guildId, manager);
    }
    return manager;
  }

  public static async search(query: string) {
    try {
      // Robust Initialization: Ensure token is ready before searching
      const isAuthReady = await ensureSoundCloudAuth();
      if (!isAuthReady) {
        console.error("[SoundCloud] Search failed: Authentication not ready.");
        return [];
      }

      const results = await play.search(query, { source: { soundcloud: "tracks" }, limit: 5 });
      
      return results.map(v => ({
        title: v.name || "Unknown",
        url: v.url,
        thumbnail: v.thumbnail || "",
        duration: v.durationInMs ? `${Math.floor(v.durationInMs / 60000)}:${String(Math.floor((v.durationInMs % 60000) / 1000)).padStart(2, '0')}` : "0:00",
        author: v.user?.username || "Unknown",
      }));
    } catch (err: any) {
      console.error("[SoundCloud] Search Error:", err.message);
      
      // Self-Healing: If client_id error, reset flag to force re-init on next call
      if (err.message.includes("client_id")) {
        isSoundCloudInitialized = false;
      }
      
      return []; // Return empty array on error as requested
    }
  }
}
