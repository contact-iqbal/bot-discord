import { 
  AudioPlayer, 
  AudioPlayerStatus, 
  createAudioPlayer, 
  createAudioResource, 
  getVoiceConnection, 
  StreamType
} from "@discordjs/voice";
import { EmbedBuilder, TextBasedChannel, TextChannel, DMChannel, NewsChannel } from "discord.js";
import { spawn } from "child_process";
import { Readable } from "stream";

// Helper function to stream audio using yt-dlp directly
function getYtdlpStream(url: string): Readable {
  console.log(`[yt-dlp] Spawning process for: ${url}`);
  const process = spawn('yt-dlp', [
    '-f', 'bestaudio',
    '--no-playlist',
    '--no-check-certificate',
    '--geo-bypass',
    '-o', '-',
    '-q', // quiet mode
    url
  ]);
  
  process.stderr.on('data', (data) => {
    const msg = data.toString();
    if (msg.includes('ERROR')) {
        console.error(`[yt-dlp error] ${msg}`);
    }
  });

  return process.stdout;
}

// Helper function to search using yt-dlp
async function searchYtdlp(query: string): Promise<Track[]> {
    return new Promise((resolve) => {
        console.log(`[yt-dlp] Searching for: ${query}`);
        const process = spawn('yt-dlp', [
            `ytsearch1:${query}`,
            '--dump-json',
            '--no-playlist',
            '--no-check-certificate',
            '--geo-bypass',
            '--quiet'
        ]);
        
        let data = '';
        process.stdout.on('data', (chunk) => data += chunk);
        
        process.on('close', (code) => {
            if (code !== 0 || !data.trim()) {
                console.warn(`[yt-dlp] Search failed or found nothing for: ${query}`);
                return resolve([]); 
            }
            try {
                const lines = data.trim().split('\n');
                const info = JSON.parse(lines[0]);
                
                let duration = "0:00";
                if (info.duration) {
                    const minutes = Math.floor(info.duration / 60);
                    const seconds = Math.floor(info.duration % 60);
                    duration = `${minutes}:${seconds.toString().padStart(2, '0')}`;
                }

                resolve([{
                    title: info.title || "Unknown",
                    url: info.webpage_url || info.url,
                    thumbnail: info.thumbnail || "",
                    duration: duration,
                    author: info.uploader || info.channel || "Unknown",
                    requestedBy: "" 
                }]);
            } catch (e) {
                console.error("[yt-dlp] Failed to parse search result:", e);
                resolve([]);
            }
        });
    });
}

export interface Track {
  title: string;
  url: string;
  thumbnail: string;
  duration: string;
  author: string;
  requestedBy: string;
}

type MusicTextChannel = TextChannel | DMChannel | NewsChannel;

class GuildMusicManager {
  public readonly player: AudioPlayer;
  public queue: Track[] = [];
  public currentTrack: Track | null = null;
  private channel: MusicTextChannel | null = null;

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
    if ('send' in channel) {
        this.channel = channel as MusicTextChannel;
    }
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
      
      const stream = getYtdlpStream(track.url);
      
      const resource = createAudioResource(stream, {
        inputType: StreamType.Arbitrary,
        inlineVolume: false,
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
       const results = await searchYtdlp(query);
       return results;
    } catch (err: any) {
      console.error("[Music] Search Error:", err.message);
      return []; 
    }
  }
}
