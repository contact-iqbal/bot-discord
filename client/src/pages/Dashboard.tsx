import { motion } from "framer-motion";
import { Navbar } from "@/components/layout/Navbar";
import { SettingsForm } from "@/components/dashboard/SettingsForm";
import { StatusPanel } from "@/components/dashboard/StatusPanel";

export default function Dashboard() {
  return (
    <div className="min-h-screen relative flex flex-col bg-background">
      {/* Absolute background effects */}
      <div className="absolute inset-0 bg-grid-pattern pointer-events-none opacity-30 z-0" />
      <div className="absolute top-0 w-full h-[500px] bg-gradient-to-b from-primary/5 to-transparent pointer-events-none z-0" />
      
      <Navbar />

      <main className="flex-1 container mx-auto px-4 py-12 relative z-10 max-w-6xl">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-12"
        >
          <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4 text-gradient">
            Command Center
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl">
            Configure your Discord bot token and manage its persistent voice channel presence with ultra-low latency real-time controls.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-7">
            <SettingsForm />
          </div>
          <div className="lg:col-span-5">
            <StatusPanel />
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
