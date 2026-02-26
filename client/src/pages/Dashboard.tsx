import { motion } from "framer-motion";
import { InformationPanel } from "@/components/dashboard/InformationPanel";
import { ServerList } from "@/components/dashboard/ServerList";
import { useAuth } from "@/hooks/use-auth";
import { LogOut, User as UserIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

export default function Dashboard() {
  const { user, logoutMutation } = useAuth();

  return (
    <div className="min-h-screen relative flex flex-col bg-[#111214]">
      {/* Absolute background effects */}
      <div className="absolute inset-0 bg-grid-pattern pointer-events-none opacity-10 z-0" />
      
      {/* Header / Navbar */}
      <nav className="relative z-20 border-b border-white/5 bg-[#111214]/80 backdrop-blur-md px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center font-bold text-white shadow-lg shadow-primary/20">
            A
          </div>
          <span className="font-bold text-white tracking-tight">AuraBot Dashboard</span>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3 bg-white/5 px-3 py-1.5 rounded-full border border-white/5">
            <Avatar className="w-6 h-6 border border-white/10">
              <AvatarImage src={`https://cdn.discordapp.com/avatars/${user?.discordId}/${user?.avatar}.png`} />
              <AvatarFallback className="bg-primary/20 text-[10px] text-primary">
                {user?.username.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <span className="text-xs font-bold text-white truncate max-w-[100px]">
              {user?.username}
            </span>
          </div>

          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all gap-2 h-8 px-3"
            onClick={() => logoutMutation.mutate()}
            disabled={logoutMutation.isPending}
          >
            <LogOut className="w-4 h-4" />
            <span className="text-xs font-bold uppercase tracking-wider">Logout</span>
          </Button>
        </div>
      </nav>

      <main className="flex-1 container mx-auto px-4 py-12 relative z-10 max-w-5xl">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-4 space-y-8">
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="text-left"
            >
              <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-4 text-gradient">
                Welcome Back!
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Kelola server Anda dan pantau status AuraBot langsung dari sini. Pastikan bot sudah diundang ke server yang ingin dikelola.
              </p>
            </motion.div>
            <InformationPanel prefix="!" />
          </div>

          <div className="lg:col-span-8">
            <ServerList />
          </div>
        </div>
      </main>

      <footer className="py-6 border-t border-white/5 relative z-10 text-center">
        <p className="text-sm text-muted-foreground/60 font-medium">
          AuraBot Dashboard System &copy; {new Date().getFullYear()}
        </p>
      </footer>
    </div>
  );
}
