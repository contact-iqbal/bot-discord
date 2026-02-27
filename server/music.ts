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
const ENV_CLIENT_ID = process.env.SOUNDCLOUD_CLIENT_ID;
let usedEnvClientId = !!ENV_CLIENT_ID;

async function setSoundCloudToken(useEnvPreferred: boolean) {
  if (useEnvPreferred && ENV_CLIENT_ID) {
    await play.setToken({ soundcloud: { client_id: ENV_CLIENT_ID } });
    usedEnvClientId = true;
    return true;
  }
  const freeId = await play.getFreeClientID();
  if (!freeId) return false;
  await play.setToken({ soundcloud: { client_id: freeId } });
  usedEnvClientId = false;
  return true;
}

async function ensureSoundCloudAuth(force = false, preferEnvFirst = true) {
  if (isSoundCloudInitialized && !force) return true;
  if (isInitializing) {
    while (isInitializing) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    return isSoundCloudInitialized;
  }
  isInitializing = true;
  try {
    const ok = await setSoundCloudToken(preferEnvFirst);
    if (!ok) throw new Error("Failed to obtain SoundCloud client_id");
    isSoundCloudInitialized = true;
  } catch (_err: any) {
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
      console.log("[Music] Attempting to stream URL:", track.url);
      
      let stream;
      try {
        const isAuthReady = await ensureSoundCloudAuth();
        if (!isAuthReady) {
          throw new Error("SoundCloud authentication is not ready.");
        }

        // play-dl sometimes fails with 404 if the URL isn't properly resolved or if client_id is stale
        stream = await play.stream(track.url, {
          quality: 1,
          discordPlayerCompatibility: true,
        });
      } catch (err: any) {
        const msg = String(err.message || "");
        console.warn(`[Music] Primary stream failed (${msg}). Attempting recovery...`);

        // First recovery attempt: Refresh SoundCloud token if it looks like an auth/network issue
        if (msg.includes("404") || msg.includes("403") || msg.includes("client_id") || msg.includes("Status code") || msg.includes("authentication is not ready")) {
          isSoundCloudInitialized = false;
          await ensureSoundCloudAuth(true, !usedEnvClientId);
          
          try {
            stream = await play.stream(track.url, {
              quality: 1,
              discordPlayerCompatibility: true,
            });
          } catch (retryErr: any) {
             console.warn(`[Music] Retry failed: ${retryErr.message}. Switching to YouTube fallback.`);
             // Fallback to YouTube
             const searchQuery = `${track.title} ${track.author}`;
             const ytResults = await play.search(searchQuery, { source: { youtube: "video" }, limit: 1 });
             
             if (ytResults.length > 0) {
               stream = await play.stream(ytResults[0].url, {
                 quality: 1,
                 discordPlayerCompatibility: true,
               });
               console.log(`[Music] Fallback successful. Playing from YouTube: ${ytResults[0].url}`);
             } else {
               throw retryErr; // Throw original error if no fallback found
             }
          }
        } else {
          throw err;
        }
      }

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
      console.error("[Music] Playback Error:", err.message);
      this.channel?.send(`❌ Gagal memutar lagu: ${err.message}`).catch(console.error);
      
      // Auto-healing: Try to re-init if client_id error occurs
      const msg = String(err.message || "");
      if (msg.includes("client_id") || msg.includes("404") || msg.includes("403")) {
        isSoundCloudInitialized = false;
        await ensureSoundCloudAuth(true, !usedEnvClientId);
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
        console.error("[Music] Search failed: Authentication not ready.");
      }

      let results;
      try {
        results = await play.search(query, { source: { soundcloud: "tracks" }, limit: 1 });
      } catch (err: any) {
        const msg = String(err.message || "");
        if (msg.includes("403") || msg.includes("client_id") || msg.includes("Status code")) {
          console.warn("[Music] SoundCloud search failed. Refreshing token...");
          isSoundCloudInitialized = false;
          await ensureSoundCloudAuth(true, !usedEnvClientId);
          try {
             results = await play.search(query, { source: { soundcloud: "tracks" }, limit: 1 });
          } catch (retryErr: any) {
             console.warn("[Music] SoundCloud retry failed. Switching to YouTube fallback.");
             results = await play.search(query, { source: { youtube: "video" }, limit: 1 });
          }
        } else {
          throw err;
        }
      }
      
      if (!results) return [];

      return results.map((v: any) => {
        // YouTube Video
        if (v.type === "video") {
           return {
             title: v.title || "Unknown",
             url: v.url,
             thumbnail: v.thumbnails?.[0]?.url || "",
             duration: v.durationRaw || "0:00",
             author: v.channel?.name || "Unknown",
           };
        }
        // SoundCloud Track
        return {
          title: v.name || "Unknown",
          url: v.url,
          thumbnail: v.thumbnail || "",
          duration: v.durationInMs ? `${Math.floor(v.durationInMs / 60000)}:${String(Math.floor((v.durationInMs % 60000) / 1000)).padStart(2, '0')}` : "0:00",
          author: v.user?.username || "Unknown",
        };
      });
    } catch (err: any) {
      console.error("[Music] Search Error:", err.message);
      
      // Self-Healing: If client_id error, reset flag to force re-init on next call
      if (err.message.includes("client_id")) {
        isSoundCloudInitialized = false;
      }
      
      // Final Fallback: Try YouTube if everything else failed
      try {
         const ytResults = await play.search(query, { source: { youtube: "video" }, limit: 1 });
         return ytResults.map((v: any) => ({
             title: v.title || "Unknown",
             url: v.url,
             thumbnail: v.thumbnails?.[0]?.url || "",
             duration: v.durationRaw || "0:00",
             author: v.channel?.name || "Unknown",
         }));
      } catch (ytErr) {
         return [];
      }
    }
  }
}
