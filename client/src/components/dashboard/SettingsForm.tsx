import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "framer-motion";
import { Save, Key, Hash, Settings, Loader2 } from "lucide-react";
import { insertBotSettingsSchema } from "@shared/schema";
import type { SaveSettingsInput } from "@shared/routes";
import { useSettings, useSaveSettings } from "@/hooks/use-settings";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";

export function SettingsForm() {
  const { data: settings, isLoading } = useSettings();
  const saveMutation = useSaveSettings();

  const form = useForm<SaveSettingsInput>({
    resolver: zodResolver(insertBotSettingsSchema),
    defaultValues: {
      botToken: "",
      voiceChannelId: "",
      isActive: false,
    },
  });

  // Populate form when data loads
  useEffect(() => {
    if (settings) {
      form.reset({
        botToken: settings.botToken,
        voiceChannelId: settings.voiceChannelId,
        isActive: settings.isActive,
      });
    }
  }, [settings, form]);

  function onSubmit(data: SaveSettingsInput) {
    saveMutation.mutate(data);
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5 }}
      className="glass-panel rounded-3xl p-8 h-full"
    >
      <div className="flex items-center gap-3 mb-8">
        <div className="p-2.5 rounded-lg bg-secondary border border-white/5">
          <Settings className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-white leading-tight">Configuration</h2>
          <p className="text-sm text-muted-foreground">Setup your Discord application credentials</p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center h-64 space-y-4">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
          <p className="text-muted-foreground text-sm font-medium">Decrypting configuration...</p>
        </div>
      ) : (
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="botToken"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-white flex items-center gap-2">
                    <Key className="w-4 h-4 text-muted-foreground" />
                    Bot Token
                  </FormLabel>
                  <FormControl>
                    <Input 
                      type="password" 
                      placeholder="MTIzNDU2Nzg5..." 
                      className="bg-background/50 border-white/10 focus:border-primary/50 focus:ring-primary/20 h-12 rounded-xl text-md transition-all font-mono tracking-wider"
                      {...field} 
                    />
                  </FormControl>
                  <FormDescription className="text-xs text-muted-foreground/70">
                    Your secure Discord bot token. Keep this absolutely secret.
                  </FormDescription>
                  <FormMessage className="text-destructive font-medium" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="voiceChannelId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-white flex items-center gap-2">
                    <Hash className="w-4 h-4 text-muted-foreground" />
                    Target Voice Channel ID
                  </FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="102938475610293847" 
                      className="bg-background/50 border-white/10 focus:border-primary/50 focus:ring-primary/20 h-12 rounded-xl text-md transition-all font-mono"
                      {...field} 
                    />
                  </FormControl>
                  <FormDescription className="text-xs text-muted-foreground/70">
                    Right click a voice channel in Discord and select "Copy Channel ID".
                  </FormDescription>
                  <FormMessage className="text-destructive font-medium" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="isActive"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-xl border border-white/5 bg-secondary/30 p-4 shadow-sm">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base text-white font-medium">
                      Auto-connect on Startup
                    </FormLabel>
                    <FormDescription className="text-xs">
                      Automatically join the voice channel when the server restarts.
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      className="data-[state=checked]:bg-primary"
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <Button 
              type="submit" 
              className="w-full h-12 mt-8 rounded-xl font-bold bg-white text-black hover:bg-white/90 hover:-translate-y-0.5 transition-all shadow-xl shadow-white/10"
              disabled={saveMutation.isPending}
            >
              {saveMutation.isPending ? (
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              ) : (
                <Save className="w-5 h-5 mr-2" />
              )}
              Save Configuration
            </Button>
          </form>
        </Form>
      )}
    </motion.div>
  );
}
