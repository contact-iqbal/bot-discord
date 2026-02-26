import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Loader2, ShieldCheck, Plus, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";

interface Guild {
  id: string;
  name: string;
  icon: string | null;
  botJoined: boolean;
}

export function ServerList() {
  const [, setLocation] = useLocation();
  const { data: guilds, isLoading, error } = useQuery<Guild[]>({
    queryKey: ["/api/guilds"],
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
        <p className="text-muted-foreground text-sm font-medium">Fetching your servers...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-destructive text-sm font-medium">Failed to load servers.</p>
      </div>
    );
  }

  const botId = "1475678249240494232";
  const inviteUrl = `https://discord.com/oauth2/authorize?client_id=${botId}&permissions=8&scope=bot%20applications.commands`;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-white uppercase text-xs tracking-widest flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-primary" /> Manage Servers
        </h3>
        <p className="text-[10px] text-muted-foreground font-bold uppercase">
          {guilds?.length || 0} Servers Found
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {guilds?.map((guild, index) => (
          <motion.div
            key={guild.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="bg-[#18191c] rounded-xl p-4 border border-white/5 group hover:border-primary/30 transition-all flex items-center gap-4 shadow-lg"
          >
            <div className="relative shrink-0">
              {guild.icon ? (
                <img
                  src={`https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png`}
                  alt={guild.name}
                  className="w-12 h-12 rounded-2xl shadow-inner bg-[#2b2d31]"
                />
              ) : (
                <div className="w-12 h-12 rounded-2xl bg-[#2b2d31] flex items-center justify-center text-lg font-bold text-white shadow-inner">
                  {guild.name.charAt(0)}
                </div>
              )}
              {guild.botJoined && (
                <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-[#23a559] rounded-full border-4 border-[#18191c] flex items-center justify-center">
                  <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-bold text-white truncate group-hover:text-primary transition-colors">
                {guild.name}
              </h4>
              <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-tighter">
                {guild.botJoined ? "Bot is present" : "Bot not invited"}
              </p>
            </div>

            {guild.botJoined ? (
              <Button
                size="sm"
                variant="outline"
                className="h-8 border-white/5 hover:bg-white/5 text-[10px] font-bold uppercase gap-1.5"
                onClick={() => setLocation(`/manage/${guild.id}`)}
              >
                Manage <ExternalLink className="w-3 h-3" />
              </Button>
            ) : (
              <Button
                size="sm"
                className="h-8 bg-[#23a559] hover:bg-[#1a7a42] text-white text-[10px] font-bold uppercase gap-1.5 shadow-lg shadow-emerald-900/20"
                onClick={() => {
                  window.open(inviteUrl + `&guild_id=${guild.id}`, "_blank");
                }}
              >
                Invite <Plus className="w-3 h-3" />
              </Button>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
}
