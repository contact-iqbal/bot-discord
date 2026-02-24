import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, type SaveSettingsInput } from "@shared/routes";
import { useToast } from "@/hooks/use-toast";

export function useSettings() {
  return useQuery({
    queryKey: [api.settings.get.path],
    queryFn: async () => {
      const res = await fetch(api.settings.get.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch settings");
      return api.settings.get.responses[200].parse(await res.json());
    },
  });
}

export function useSaveSettings() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async (data: SaveSettingsInput) => {
      const res = await fetch(api.settings.save.path, {
        method: api.settings.save.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      
      if (!res.ok) {
        if (res.status === 400) {
          const err = api.settings.save.responses[400].parse(await res.json());
          throw new Error(err.message || "Validation failed");
        }
        throw new Error("Failed to save settings");
      }
      
      return api.settings.save.responses[200].parse(await res.json());
    },
    onSuccess: () => {
      toast({
        title: "Configuration Saved",
        description: "Your bot settings have been successfully updated.",
      });
      queryClient.invalidateQueries({ queryKey: [api.settings.get.path] });
    },
    onError: (error) => {
      toast({
        title: "Save Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  });
}
