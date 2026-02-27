import { Client, TextBasedChannel, TextChannel, DMChannel, NewsChannel, EmbedBuilder } from "discord.js";
// @ts-ignore - Module 'shoukaku' is not installed; install with: npm install shoukaku
import { Shoukaku, Connectors, NodeOption, Player, Track, TrackExceptionEvent } from "shoukaku";

const Nodes: NodeOption[] = [{
    name: 'LocalNode',
    url: 'localhost:2333',
    auth: 'youshallnotpass'
}];

let shoukaku: Shoukaku | null = null;

export function initializeMusicManager(client: Client) {
    shoukaku = new Shoukaku(new Connectors.DiscordJS(client), Nodes);
    
    shoukaku.on('error', (_, error) => console.error('[Lavalink] Error:', error));
    shoukaku.on('ready', (name) => console.log(`[Lavalink] Node ${name} is ready`));
    shoukaku.on('close', (name, code, reason) => console.warn(`[Lavalink] Node ${name} closed: ${code} ${reason}`));
    shoukaku.on('disconnect', (name, count) => {
        if (count > 0) return;
        // shoukaku?.players.forEach(player => shoukaku?.leaveVoiceChannel(player.guildId)); // leaveVoiceChannel is deprecated/removed
        console.warn(`[Lavalink] Node ${name} disconnected`);
    });
}

export interface QueueTrack {
    track: string; // Base64 track string
    info: {
        title: string;
        uri: string;
        thumbnail?: string;
        length: number;
        author: string;
    };
    requestedBy: string;
}

type MusicTextChannel = TextChannel | DMChannel | NewsChannel;

class GuildMusicManager {
    public queue: QueueTrack[] = [];
    public currentTrack: QueueTrack | null = null;
    public player: Player | null = null;
    private channel: MusicTextChannel | null = null;
    private guildId: string;

    constructor(guildId: string) {
        this.guildId = guildId;
    }

    public setChannel(channel: TextBasedChannel) {
        if ('send' in channel) {
            this.channel = channel as MusicTextChannel;
        }
    }

    public async join(channelId: string, guildId: string, shardId: number = 0) {
        if (!shoukaku) throw new Error("Music manager not initialized");
        
        // Get existing player or create new one
        const existingPlayer = shoukaku.players.get(guildId);
        if (existingPlayer) {
            this.player = existingPlayer;
            return;
        }

        const node = shoukaku.options.nodeResolver(shoukaku.nodes);
        if (!node) throw new Error("No Lavalink node available");

        this.player = await shoukaku.joinVoiceChannel({
            guildId: guildId,
            channelId: channelId,
            shardId: shardId
        });

        const player = this.player!;

        player.on('start', () => {
            console.log(`[Music] Track started in ${guildId}`);
        });

        player.on('end', () => {
            console.log(`[Music] Track ended in ${guildId}`);
            this.playNext();
        });

        player.on('exception', (error: TrackExceptionEvent) => {
            console.error(`[Music] Track exception:`, error);
            this.channel?.send(`❌ Error memutar lagu: ${error.exception.message}`).catch(console.error);
            this.playNext();
        });

        player.on('closed', () => {
            console.log(`[Music] Player closed in ${guildId}`);
            this.stop();
        });
    }

    public async addToQueue(track: QueueTrack) {
        this.queue.push(track);

        if (!this.player) {
            throw new Error("Player not connected. Use join() first.");
        }

        if (!this.currentTrack && !this.player.track) {
            await this.playNext();
        } else {
            const embed = new EmbedBuilder()
                .setColor("#5865F2")
                .setTitle("✅ Menambahkan ke Antrean")
                .setDescription(`**[${track.info.title}](${track.info.uri})** telah ditambahkan ke antrean.`)
                .setThumbnail(track.info.thumbnail || "")
                .addFields(
                    { name: "Durasi", value: this.formatDuration(track.info.length), inline: true },
                    { name: "Posisi", value: `#${this.queue.length}`, inline: true }
                )
                .setFooter({ text: `Diminta oleh ${track.requestedBy}` });

            this.channel?.send({ embeds: [embed] }).catch(console.error);
        }
    }

    public async playNext() {
        if (!this.player) return;

        if (this.queue.length === 0) {
            this.currentTrack = null;
            await this.player.stopTrack();
            return;
        }

        const track = this.queue.shift()!;
        this.currentTrack = track;

        await this.player.playTrack({ track: { encoded: track.track } });

        const embed = new EmbedBuilder()
            .setColor("#10B981")
            .setTitle("🎶 Sedang Memutar")
            .setDescription(`**[${track.info.title}](${track.info.uri})**`)
            .setThumbnail(track.info.thumbnail || "")
            .addFields(
                { name: "Artis", value: track.info.author, inline: true },
                { name: "Durasi", value: this.formatDuration(track.info.length), inline: true }
            )
            .setFooter({ text: `Diminta oleh ${track.requestedBy}` });

        this.channel?.send({ embeds: [embed] }).catch(console.error);
    }

    public stop() {
        this.queue = [];
        this.currentTrack = null;
        if (this.player) {
            this.player.stopTrack();
            // Optional: Leave channel on stop? Maybe not, user might want to play another.
            // But if completely stopping:
            // shoukaku?.leaveVoiceChannel(this.guildId);
            // this.player = null;
        }
    }

    public leave() {
        this.stop();
        if (shoukaku) {
            shoukaku.leaveVoiceChannel(this.guildId);
        }
        this.player = null;
    }

    private formatDuration(ms: number): string {
        const minutes = Math.floor(ms / 60000);
        const seconds = Math.floor((ms % 60000) / 1000);
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }
}

export class MusicManager {
    private static managers = new Map<string, GuildMusicManager>();

    public static getManager(guildId: string): GuildMusicManager {
        let manager = this.managers.get(guildId);
        if (!manager) {
            manager = new GuildMusicManager(guildId);
            this.managers.set(guildId, manager);
        }
        return manager;
    }

    public static async search(query: string): Promise<QueueTrack[]> {
        if (!shoukaku) return [];
        const node = shoukaku.options.nodeResolver(shoukaku.nodes);
        if (!node) return [];

        const result = await node.rest.resolve(query);
        if (!result || result.loadType === 'empty' || result.loadType === 'error') return [];

        let tracks = [];
        if (result.loadType === 'search' || result.loadType === 'track') {
            const data = result.data;
            tracks = [Array.isArray(data) ? data[0] : data];
        } else if (result.loadType === 'playlist') {
            tracks = result.data.tracks;
        }

        // Handle Lavalink v4 response structure if needed (v4 uses data object)
        // Shoukaku v4 handles this abstractly usually, but let's be safe.
        // Actually Shoukaku v4 return type is structured.
        
        // Normalize results
        const rawTracks = Array.isArray(result.data) ? result.data : ((result.data as any).tracks || [result.data]);

        return rawTracks.map((t: any) => ({
            track: t.encoded,
            info: {
                title: t.info.title,
                uri: t.info.uri,
                thumbnail: t.info.artworkUrl || "",
                length: t.info.length,
                author: t.info.author
            },
            requestedBy: ""
        }));
    }
}
