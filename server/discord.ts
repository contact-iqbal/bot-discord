import { Client, GatewayIntentBits, ActivityType, PresenceStatusData, EmbedBuilder, TextChannel, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, StringSelectMenuBuilder } from "discord.js";
import { storage } from "./storage";
import { MusicManager, initializeMusicManager } from "./music";
import { readFileSync } from "node:fs";
import path from "node:path";

let client: Client | null = null;
let currentStatus: "disconnected" | "connecting" | "connected" | "error" = "disconnected";
let errorMessage: string | undefined = undefined;
let responses: string[] = [];

const BOT_TOKEN = process.env.DISCORD_TOKEN || "";
const BOT_ID = "1475678249240494232";

const HARDCODED_SETTINGS = {
  presenceType: "STREAMING",
  presenceName: "!help | Shania Gracia",
  status: "online" as PresenceStatusData,
  isActive: true,
};

function loadResponses() {
  try {
    const filePath = path.resolve(process.cwd(), "server", "responses.json");
    const raw = readFileSync(filePath, "utf-8");
    const parsed = JSON.parse(raw) as { responses: string[] };
    if (Array.isArray(parsed.responses)) {
      responses = parsed.responses;
    }
  } catch (e) {
    console.error("Failed to load responses.json:", e);
    responses = ["Halo!"]; // fallback minimal
  }
}
loadResponses();

export function getBotStatus() {
  return { status: currentStatus, errorMessage };
}

export async function initializeBotIfActive() {
  try {
    // Always start bot on initialization now as requested (Hardcoded isActive: true)
    console.log("Initializing bot with hardcoded settings...");
    startBot().catch(console.error);
  } catch (err) {
    console.error("Failed to initialize bot:", err);
  }
}

export async function startBot(channelId?: string) {
  if (client) {
    stopBot();
  }

  currentStatus = "connecting";
  errorMessage = undefined;

  client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildVoiceStates,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
    ],
    // Optimization: Cache settings
    sweepers: {
      messages: {
        interval: 3600, // Sweep messages every hour
        lifetime: 1800, // Keep messages for 30 mins
      }
    }
  });

  initializeMusicManager(client);

  return new Promise<void>((resolve, reject) => {
    client!.on("messageCreate", async (message) => {
      if (message.author.bot) return;

      // Get guild settings for custom prefix and permissions
      let guildPrefix = "!";
      if (message.guildId) {
        try {
          const gSettings = await storage.getGuildSettings(message.guildId);
          if (gSettings) {
            guildPrefix = gSettings.prefix || "!";

            const userRoles = message.member?.roles.cache.map(r => r.id) || [];
            
            // Priority 1: Check Blocked Roles
            const isBlocked = (gSettings.blockedRoles as string[]).some(roleId => userRoles.includes(roleId));
            if (isBlocked) return;

            // Priority 2: Check Allowed Roles (if list is not empty)
            const allowedRoles = gSettings.allowedRoles as string[];
            if (allowedRoles.length > 0) {
              const isAllowed = allowedRoles.some(roleId => userRoles.includes(roleId));
              if (!isAllowed) return;
            }
          }
        } catch (err) {
          console.error("Error checking guild settings:", err);
        }
      }

      const content = message.content.toLowerCase();
      
      // Handle Prefix Commands
      if (content.startsWith(guildPrefix)) {
        const args = message.content.slice(guildPrefix.length).trim().split(/ +/);
        const command = args.shift()?.toLowerCase();
        
        if (command === "play" || command === "p") {
          const query = args.join(" ");

          if (!query) {
            message.reply(`Silakan masukkan judul lagu atau URL. Contoh: \`${guildPrefix}play Shania Gracia\``).catch(console.error);
            return;
          }

          const voiceChannel = message.member?.voice.channel;
          if (!voiceChannel) {
            message.reply("Mohon maaf, Anda harus berada di dalam saluran suara untuk memutar musik.").catch(console.error);
            return;
          }

          try {
            await message.channel.send("🔎 Memproses permintaan Anda...").catch(() => {});

            const music = MusicManager.getManager(message.guildId!);
            music.setChannel(message.channel);
            
            // Ensure connection to voice channel
            await music.join(voiceChannel.id, message.guildId!);

            // Search and play
            const searchResults = await MusicManager.search(query);

            if (searchResults.length === 0) {
              message.reply("Maaf, tidak dapat menemukan lagu tersebut.").catch(console.error);
              return;
            }

            const track = {
              ...searchResults[0],
              requestedBy: message.author.username,
            };

            await music.addToQueue(track);
          } catch (err: any) {
            console.error("Play Command Error:", err.message);
            message.reply(`❌ Terjadi kesalahan: ${err.message}`).catch(console.error);
          }
          return;
        }

        if (command === "search" || command === "s") {
          const query = args.join(" ");

          if (!query) {
            message.reply(`Silakan masukkan judul lagu untuk dicari. Contoh: \`${guildPrefix}search Shania Gracia\``).catch(console.error);
            return;
          }

          try {
            const results = await MusicManager.search(query);
            if (results.length === 0) {
              message.reply(`Maaf, tidak dapat menemukan hasil pencarian.`).catch(console.error);
              return;
            }

            const embed = new EmbedBuilder()
              .setColor("#FF5500")
              .setTitle(`🔍 Hasil Pencarian: ${query}`)
              .setDescription(results.slice(0, 5).map((r, i) => `**${i + 1}.** [${r.info.title}](${r.info.uri})`).join("\n"))
              .setFooter({ text: `Gunakan ${guildPrefix}p [judul] untuk memutar.` });

            message.reply({ embeds: [embed] }).catch(console.error);
          } catch (err: any) {
            message.reply(`❌ Gagal mencari: ${err.message}`).catch(console.error);
          }
          return;
        }

        if (command === "stop" || command === "t") {
          const music = MusicManager.getManager(message.guildId!);
          music.stop();
          message.reply("⏹️ Musik dihentikan dan antrean telah dibersihkan.").catch(console.error);
          return;
        }

        if (command === "join") {
          const voiceChannel = message.member?.voice.channel;
          if (!voiceChannel) {
            message.reply("Mohon maaf, Anda harus berada di dalam saluran suara untuk memanggil saya.").catch(console.error);
            return;
          }

          try {
            const music = MusicManager.getManager(message.guildId!);
            await music.join(voiceChannel.id, message.guildId!);
            message.reply(`Berhasil terhubung ke saluran suara **${voiceChannel.name}**.`).catch(console.error);
          } catch (err: any) {
            message.reply(`Gagal menghubungkan: ${err.message}`).catch(console.error);
          }
          return;
        }

        if (command === "leave") {
          const music = MusicManager.getManager(message.guildId!);
          music.leave();
          message.reply("Koneksi saluran suara telah diputuskan. Sampai jumpa kembali.").catch(console.error);
          return;
        }

        if (command === "init") {
          message.reply("Sistem telah diinisialisasi. Saya akan tetap aktif menjaga koneksi.").catch(console.error);
          return;
        }

        if (command === "setup") {
          if (!message.member?.permissions.has(PermissionFlagsBits.Administrator)) {
            message.reply("Mohon maaf, perintah ini hanya dapat dijalankan oleh Administrator server.").catch(console.error);
            return;
          }

          const setupEmbed = new EmbedBuilder()
            .setColor("#5865F2")
            .setTitle("AuraBot Configuration Center")
            .setDescription("Selamat datang di pusat pengaturan AuraBot. Gunakan tombol di bawah ini untuk mengelola fungsionalitas bot di server Anda.")
            .addFields(
              { name: "Prefix Saat Ini", value: `\`${guildPrefix}\``, inline: true },
              { name: "Dashboard URL", value: `[Klik di sini](https://${message.guild!.id}.dashboard.aurabot.com)`, inline: true }
            )
            .setFooter({ text: "Sistem Pengaturan Bot • Gunakan dengan bijak" })
            .setTimestamp();

          const row = new ActionRowBuilder<ButtonBuilder>()
            .addComponents(
              new ButtonBuilder()
                .setCustomId('setup_prefix')
                .setLabel('Ganti Prefix')
                .setStyle(ButtonStyle.Primary)
                .setEmoji('⌨️'),
              new ButtonBuilder()
                .setCustomId('setup_roles')
                .setLabel('Kelola Roles')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('🛡️')
            );

          const response = await message.reply({ 
            embeds: [setupEmbed], 
            components: [row] 
          });

          const collector = response.createMessageComponentCollector({ 
            componentType: ComponentType.Button, 
            time: 60000 
          });

          collector.on('collect', async i => {
            if (i.user.id !== message.author.id) {
              await i.reply({ content: "Mohon maaf, hanya pemanggil perintah yang dapat berinteraksi.", ephemeral: true });
              return;
            }

            if (i.customId === 'setup_prefix') {
              await i.reply({ content: "Untuk mengganti prefix, silakan gunakan dashboard website kami untuk keamanan yang lebih baik.", ephemeral: true });
            } else if (i.customId === 'setup_roles') {
              await i.reply({ content: "Pengaturan role dapat dikelola melalui dashboard pada menu 'Manage Server'.", ephemeral: true });
            }
          });

          return;
        }

        if (command === "ping") {
          const pingEmbed = new EmbedBuilder()
            .setColor("#5865F2")
            .setTitle("Status Koneksi")
            .setDescription(`🏓 Latensi bot saat ini adalah **${client?.ws.ping}ms**.`)
            .setTimestamp()
            .setFooter({ text: "Sistem Pemantauan Bot" });
          
          message.reply({ embeds: [pingEmbed] }).catch(console.error);
          return;
        }

        if (command === "purge") {
          if (!message.member?.permissions.has(PermissionFlagsBits.ManageMessages)) {
            message.reply("Mohon maaf, Anda tidak memiliki izin untuk mengelola pesan di saluran ini.").catch(console.error);
            return;
          }

          const amount = parseInt(args[0]);
          if (isNaN(amount) || amount < 1 || amount > 100) {
            message.reply("Silakan masukkan jumlah pesan yang valid (antara 1 hingga 100).").catch(console.error);
            return;
          }

          if (message.channel instanceof TextChannel) {
            try {
              await message.channel.bulkDelete(amount + 1, true);
              const purgeEmbed = new EmbedBuilder()
                .setColor("#10B981")
                .setDescription(`✅ Berhasil menghapus **${amount}** pesan.`)
                .setTimestamp();
              
              const sentMessage = await message.channel.send({ embeds: [purgeEmbed] });
              setTimeout(() => sentMessage.delete().catch(console.error), 5000);
            } catch (err: any) {
              message.reply(`Gagal menghapus pesan: ${err.message}`).catch(console.error);
            }
          }
          return;
        }

        if (command === "help") {
          const helpEmbed = new EmbedBuilder()
            .setColor("#5865F2")
            .setTitle("Panduan Perintah Bot")
            .setDescription("Berikut adalah daftar perintah yang tersedia dalam sistem ini:")
            .addFields(
              { name: `\`${guildPrefix}init\``, value: "Inisialisasi sistem untuk memastikan bot tetap aktif." },
              { name: `\`${guildPrefix}setup\``, value: "Membuka menu pengaturan bot (Admin Only)." },
              { name: `\`${guildPrefix}join\``, value: "Memanggil bot ke saluran suara Anda saat ini." },
              { name: `\`${guildPrefix}leave\``, value: "Memutuskan koneksi bot dari saluran suara." },
              { name: `\`${guildPrefix}ping\``, value: "Menampilkan latensi koneksi bot." },
              { name: `\`${guildPrefix}purge [angka]\``, value: "Menghapus sejumlah pesan di saluran teks (Maksimal 100)." },
              { name: `\`${guildPrefix}help\``, value: "Menampilkan panduan bantuan ini." },
              { name: "Sistem Musik", value: `\`${guildPrefix}play [judul]\` / \`p\`: Memutar musik dari SoundCloud.\n\`${guildPrefix}search [judul]\` / \`s\`: Mencari musik di SoundCloud.\n\`${guildPrefix}stop\` / \`t\`: Menghentikan musik.` }
            )
            .addFields({ 
              name: "Informasi Tambahan", 
              value: "Pastikan bot memiliki izin yang cukup di server ini untuk menjalankan semua fungsi dengan optimal." 
            })
            .setTimestamp()
            .setFooter({ text: "Sistem Bantuan Bot" });

          message.reply({ embeds: [helpEmbed] }).catch(console.error);
          return;
        }
      }

      // Handle Mentions - ONLY direct mentions to this bot (not @everyone or @here)
      if (message.mentions.users.has(BOT_ID)) {
        const randomMessage = responses[Math.floor(Math.random() * responses.length)];
        message.reply(randomMessage).catch(console.error);
      }
    });

    client!.once("ready", async (c) => {
      try {
        console.log(`Bot logged in as ${c.user.tag}`);
        
        // Use hardcoded settings for global presence
        updatePresence(HARDCODED_SETTINGS);

        // If channelId was provided (e.g. from a manual start with old config)
        if (channelId) {
          const channel = await c.channels.fetch(channelId);
          if (channel && channel.isVoiceBased()) {
             const music = MusicManager.getManager(channel.guild.id);
             await music.join(channel.id, channel.guild.id);
          }
        }

        currentStatus = "connected";
        resolve();
      } catch (err: any) {
        console.error("Failed during bot ready:", err);
        currentStatus = "error";
        errorMessage = err.message;
        reject(err);
      }
    });

    client!.once("error", (err) => {
      currentStatus = "error";
      errorMessage = err.message;
    });

    client!.login(BOT_TOKEN).catch((err) => {
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

export function getBotGuilds() {
  if (!client) return [];
  return client.guilds.cache.map(guild => ({
    id: guild.id,
    name: guild.name,
    icon: guild.iconURL(),
    memberCount: guild.memberCount,
  }));
}

export function stopBot() {
  if (client) {
    client.destroy();
    client = null;
  }
  currentStatus = "disconnected";
  errorMessage = undefined;
}
