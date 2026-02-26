import { useAuth } from "@/hooks/use-auth";
import { Redirect } from "wouter";
import { motion } from "framer-motion";
import { SiDiscord } from "react-icons/si";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

export default function LoginPage() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#111214] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (user) {
    return <Redirect to="/" />;
  }

  return (
    <div className="min-h-screen bg-[#111214] relative flex flex-col items-center justify-center overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 bg-grid-pattern pointer-events-none opacity-10 z-0" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/20 rounded-full blur-[120px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="z-10 bg-[#18191c] p-8 md:p-12 rounded-2xl border border-white/5 shadow-2xl max-w-md w-full text-center space-y-8"
      >
        <div className="space-y-2">
          <h1 className="text-4xl font-extrabold text-gradient tracking-tight">
            AuraBot
          </h1>
          <p className="text-muted-foreground font-medium">
            Masuk untuk mengelola bot di server Anda
          </p>
        </div>

        <div className="bg-[#111214] rounded-xl p-6 border border-white/5 space-y-4">
          <p className="text-xs text-gray-400 leading-relaxed">
            Dengan melanjutkan, Anda setuju untuk memberikan akses informasi akun dasar dan daftar server Anda kepada AuraBot.
          </p>
          
          <Button
            className="w-full bg-[#5865F2] hover:bg-[#4752C4] text-white h-12 text-md font-bold transition-all shadow-lg hover:shadow-primary/20 flex items-center justify-center gap-3"
            onClick={() => {
              window.location.href = "/api/auth/discord";
            }}
          >
            <SiDiscord className="w-6 h-6" />
            Login with Discord
          </Button>
        </div>

        <p className="text-[10px] text-muted-foreground/50 uppercase tracking-widest font-bold">
          Protected by Discord OAuth2
        </p>
      </motion.div>
    </div>
  );
}
