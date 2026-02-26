import { motion } from "framer-motion";
import { Info, MessageSquare, Mic, Terminal, ShieldCheck, Activity, Music, Play, Search, Square } from "lucide-react";

interface InformationPanelProps {
  prefix: string;
}

export function InformationPanel({ prefix }: InformationPanelProps) {
  const commands = [
    { 
      name: `${prefix}play [judul]`, 
      desc: "Memutar lagu dari SoundCloud berdasarkan judul atau URL.",
      icon: <Play className="w-4 h-4 text-emerald-400" />
    },
    { 
      name: `${prefix}search [judul]`, 
      desc: "Mencari daftar lagu di SoundCloud sesuai judul.",
      icon: <Search className="w-4 h-4 text-blue-400" />
    },
    { 
      name: `${prefix}stop`, 
      desc: "Menghentikan musik dan menghapus seluruh antrean.",
      icon: <Square className="w-4 h-4 text-destructive" />
    },
    { 
      name: `${prefix}init`, 
      desc: "Inisialisasi sistem untuk memastikan bot tetap aktif.",
      icon: <Terminal className="w-4 h-4 text-yellow-400" />
    },
    { 
      name: `${prefix}join`, 
      desc: "Meminta bot masuk ke saluran suara Anda.",
      icon: <Mic className="w-4 h-4 text-emerald-400" />
    },
    { 
      name: `${prefix}help`, 
      desc: "Menampilkan panduan bantuan lengkap bot.",
      icon: <Info className="w-4 h-4 text-purple-400" />
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5 }}
      className="bg-[#18191c] rounded-xl p-6 border border-white/5 shadow-lg space-y-6"
    >
      <div className="flex items-center gap-2 mb-2 text-primary">
        <Info className="w-5 h-5" />
        <h3 className="font-bold text-white uppercase text-xs tracking-widest">Bot Information</h3>
      </div>

      <div className="space-y-6">
        {/* Commands Section */}
        <div>
          <p className="text-[10px] font-bold uppercase text-muted-foreground mb-3 tracking-wider flex items-center gap-1.5">
            <Terminal className="w-3 h-3" /> Commands
          </p>
          <div className="space-y-3">
            {commands.map((cmd) => (
              <div key={cmd.name} className="bg-[#111214] p-3 rounded-lg border border-white/5 group hover:border-primary/30 transition-all">
                <div className="flex items-center gap-2 mb-1">
                  {cmd.icon}
                  <span className="text-sm font-bold text-white font-mono">{cmd.name}</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {cmd.desc}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Requirements Section */}
        <div>
          <p className="text-[10px] font-bold uppercase text-muted-foreground mb-3 tracking-wider flex items-center gap-1.5">
            <ShieldCheck className="w-3 h-3" /> Requirements
          </p>
          <ul className="space-y-2">
            <li className="text-xs text-gray-400 flex items-start gap-2 leading-relaxed">
              <div className="w-1 h-1 rounded-full bg-primary mt-1.5 shrink-0" />
              Aktifkan <span className="text-white font-semibold">Message Content Intent</span> di Discord Developer Portal.
            </li>
            <li className="text-xs text-gray-400 flex items-start gap-2 leading-relaxed">
              <div className="w-1 h-1 rounded-full bg-primary mt-1.5 shrink-0" />
              Bot harus memiliki izin <span className="text-white font-semibold">View Channel</span>, <span className="text-white font-semibold">Connect</span>, dan <span className="text-white font-semibold">Speak</span>.
            </li>
            <li className="text-xs text-gray-400 flex items-start gap-2 leading-relaxed">
              <div className="w-1 h-1 rounded-full bg-primary mt-1.5 shrink-0" />
              Bot dikonfigurasi untuk tetap aktif di saluran suara secara otomatis (24/7).
            </li>
          </ul>
        </div>

        {/* Hint */}
        <div className="bg-primary/5 p-3 rounded-lg border border-primary/10">
          <p className="text-[10px] text-primary leading-relaxed italic">
            Tips: Bot akan otomatis merespon jika Anda memention langsung akun bot-nya di channel manapun!
          </p>
        </div>
      </div>
    </motion.div>
  );
}
