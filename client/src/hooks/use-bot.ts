import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { useToast } from "@/hooks/use-toast";

export function useBotStatus() {
  return useQuery({
    queryKey: [api.bot.status.path],
    queryFn: async () => {
      const res = await fetch(api.bot.status.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch bot status");
      return api.bot.status.responses[200].parse(await res.json());
    },
    refetchInterval: 3000, // Poll every 3 seconds for real-time status
    refetchIntervalInBackground: true,
  });
}

export function useStartBot() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async () => {
      const res = await fetch(api.bot.start.path, { 
        method: api.bot.start.method,
        credentials: "include" 
      });
      
      if (!res.ok) {
        if (res.status === 400) {
          const err = api.bot.start.responses[400].parse(await res.json());
          throw new Error(err.message);
        }
        throw new Error("Failed to start bot");
      }
      
      return api.bot.start.responses[200].parse(await res.json());
    },
    onSuccess: () => {
      toast({
        title: "Booting Sequence Initiated",
        description: "The bot is connecting to the voice channel...",
      });
      // Invalidate immediately to show 'connecting' state
      queryClient.invalidateQueries({ queryKey: [api.bot.status.path] });
    },
    onError: (error) => {
      toast({
        title: "Startup Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  });
}

export function useStopBot() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async () => {
      const res = await fetch(api.bot.stop.path, { 
        method: api.bot.stop.method,
        credentials: "include" 
      });
      
      if (!res.ok) throw new Error("Failed to stop bot");
      
      return api.bot.stop.responses[200].parse(await res.json());
    },
    onSuccess: () => {
      toast({
        title: "Bot Terminated",
        description: "Successfully disconnected from the voice channel.",
      });
      queryClient.invalidateQueries({ queryKey: [api.bot.status.path] });
    },
    onError: (error) => {
      toast({
        title: "Termination Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  });
}
