import { motion, AnimatePresence } from "framer-motion";
import { useBotStatus, useStartBot, useStopBot } from "@/hooks/use-bot";
import { Power, Activity, AlertCircle, Loader2, Radio } from "lucide-react";
import { Button } from "@/components/ui/button";

export function StatusPanel() {
  const { data, isLoading, isError } = useBotStatus();
  const startBot = useStartBot();
  const stopBot = useStopBot();

  const status = data?.status || "disconnected";
  const errorMessage = data?.errorMessage;

  const isConnected = status === "connected";
  const isConnecting = status === "connecting";
  const hasError = status === "error" || isError;

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, delay: 0.1 }}
      className="glass-panel rounded-3xl p-8 relative overflow-hidden flex flex-col items-center justify-center min-h-[360px] text-center"
    >
      {/* Background Glows based on status */}
      <AnimatePresence>
        {isConnected && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 bg-emerald-500/5 blur-3xl pointer-events-none" 
          />
        )}
        {hasError && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 bg-destructive/5 blur-3xl pointer-events-none" 
          />
        )}
      </AnimatePresence>

      <div className="relative z-10 w-full max-w-sm">
        <h2 className="text-xl font-bold text-white mb-8 text-left flex items-center gap-2">
          <Activity className="w-5 h-5 text-muted-foreground" />
          System Status
        </h2>

        {/* Status Indicator Orb */}
        <div className="flex flex-col items-center justify-center mb-10">
          <div className="relative mb-6">
            {isLoading ? (
               <div className="w-24 h-24 rounded-full bg-secondary flex items-center justify-center">
                 <Loader2 className="w-10 h-10 text-muted-foreground animate-spin" />
               </div>
            ) : (
              <motion.div
                animate={
                  isConnecting ? { scale: [1, 1.1, 1], opacity: [0.5, 1, 0.5] } : 
                  isConnected ? { boxShadow: ["0 0 0 0 rgba(16, 185, 129, 0)", "0 0 20px 10px rgba(16, 185, 129, 0.15)", "0 0 0 0 rgba(16, 185, 129, 0)"] } :
                  {}
                }
                transition={{ duration: 2, repeat: Infinity }}
                className={`w-28 h-28 rounded-full flex items-center justify-center border-4 shadow-xl ${
                  isConnected ? 'bg-emerald-500/10 border-emerald-500 text-emerald-500' :
                  isConnecting ? 'bg-yellow-500/10 border-yellow-500 text-yellow-500' :
                  hasError ? 'bg-destructive/10 border-destructive text-destructive' :
                  'bg-secondary border-muted-foreground/30 text-muted-foreground'
                }`}
              >
                {isConnected ? <Radio className="w-12 h-12" /> :
                 isConnecting ? <Loader2 className="w-12 h-12 animate-spin" /> :
                 hasError ? <AlertCircle className="w-12 h-12" /> :
                 <Power className="w-12 h-12" />}
              </motion.div>
            )}
            
            {/* Connecting pulsing rings */}
            {isConnecting && (
              <>
                <div className="absolute inset-0 rounded-full border border-yellow-500/30 animate-ping" style={{ animationDuration: '2s' }} />
                <div className="absolute inset-[-10px] rounded-full border border-yellow-500/20 animate-ping" style={{ animationDuration: '2.5s', animationDelay: '0.2s' }} />
              </>
            )}
          </div>
          
          <h3 className="text-2xl font-bold capitalize tracking-wider">
            {isLoading ? "Checking..." : status}
          </h3>
          
          <AnimatePresence>
            {hasError && errorMessage && (
              <motion.p 
                initial={{ opacity: 0, y: -10 }} 
                animate={{ opacity: 1, y: 0 }}
                className="mt-3 text-sm text-destructive max-w-xs mx-auto bg-destructive/10 px-4 py-2 rounded-lg border border-destructive/20"
              >
                {errorMessage}
              </motion.p>
            )}
          </AnimatePresence>
        </div>

        {/* Controls */}
        <div className="w-full">
          {isConnected || isConnecting ? (
            <Button 
              size="lg" 
              variant="destructive" 
              className="w-full h-14 rounded-xl text-lg font-bold shadow-lg shadow-destructive/20 hover:shadow-destructive/40 transition-all active:scale-[0.98]"
              onClick={() => stopBot.mutate()}
              disabled={stopBot.isPending}
            >
              {stopBot.isPending ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Power className="w-5 h-5 mr-2" />}
              Terminate Connection
            </Button>
          ) : (
            <Button 
              size="lg" 
              className="w-full h-14 rounded-xl text-lg font-bold bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all active:scale-[0.98]"
              onClick={() => startBot.mutate()}
              disabled={startBot.isPending || isLoading}
            >
              {startBot.isPending ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Radio className="w-5 h-5 mr-2" />}
              Initialize Bot
            </Button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
