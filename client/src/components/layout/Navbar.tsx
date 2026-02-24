import { Bot, ShieldAlert } from "lucide-react";
import { motion } from "framer-motion";

export function Navbar() {
  return (
    <motion.header 
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="sticky top-0 z-50 w-full border-b border-white/5 bg-background/50 backdrop-blur-md"
    >
      <div className="container mx-auto px-4 h-16 flex items-center justify-between max-w-6xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center shadow-lg shadow-primary/20">
            <Bot className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white leading-none">Aura<span className="text-primary">Bot</span></h1>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Voice Control Center</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary/50 border border-white/5 text-xs font-medium text-muted-foreground">
          <ShieldAlert className="w-3.5 h-3.5" />
          <span>Encrypted Connection</span>
        </div>
      </div>
    </motion.header>
  );
}
