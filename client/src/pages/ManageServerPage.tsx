import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { motion } from "framer-motion";
import { 
  Loader2, 
  ShieldCheck, 
  ChevronLeft, 
  Save, 
  Users, 
  CheckCircle2, 
  XCircle,
  AlertCircle,
  Terminal
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";

interface Role {
  id: string;
  name: string;
  color: number;
}

interface GuildSettings {
  guildId: string;
  prefix: string;
  allowedRoles: string[];
  blockedRoles: string[];
}

export default function ManageServerPage() {
  const { guildId } = useParams<{ guildId: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const [prefix, setPrefix] = useState("!");
  const [selectedAllowed, setSelectedAllowed] = useState<string[]>([]);
  const [selectedBlocked, setSelectedBlocked] = useState<string[]>([]);

  const { data: roles, isLoading: rolesLoading, error: rolesError } = useQuery<Role[]>({
    queryKey: [`/api/guilds/${guildId}/roles`],
  });

  const { data: settings, isLoading: settingsLoading, error: settingsError } = useQuery<GuildSettings>({
    queryKey: [`/api/guilds/${guildId}/settings`],
  });

  useEffect(() => {
    if (settings) {
      setPrefix(settings.prefix || "!");
      setSelectedAllowed(settings.allowedRoles);
      setSelectedBlocked(settings.blockedRoles);
    }
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: async (data: Partial<GuildSettings>) => {
      await apiRequest("POST", `/api/guilds/${guildId}/settings`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/guilds/${guildId}/settings`] });
      toast({
        title: "Settings Saved",
        description: "Guild settings updated successfully.",
      });
    },
    onError: (err: Error) => {
      toast({
        title: "Save Failed",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  if (rolesLoading || settingsLoading) {
    return (
      <div className="min-h-screen bg-[#111214] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (rolesError || settingsError) {
    return (
      <div className="min-h-screen bg-[#111214] flex flex-col items-center justify-center p-6 text-center space-y-4">
        <AlertCircle className="w-12 h-12 text-destructive" />
        <h2 className="text-2xl font-bold text-white">Gagal Memuat Pengaturan</h2>
        <p className="text-muted-foreground max-w-md">
          Pastikan bot AuraBot sudah bergabung ke server ini dan Anda memiliki izin yang cukup.
        </p>
        <Button onClick={() => setLocation("/")} variant="outline" className="mt-4">
          <ChevronLeft className="w-4 h-4 mr-2" /> Kembali ke Dashboard
        </Button>
      </div>
    );
  }

  const isDirty = 
    prefix !== (settings?.prefix || "!") ||
    JSON.stringify(selectedAllowed) !== JSON.stringify(settings?.allowedRoles) ||
    JSON.stringify(selectedBlocked) !== JSON.stringify(settings?.blockedRoles);

  const toggleAllowed = (roleId: string) => {
    setSelectedAllowed(prev => 
      prev.includes(roleId) ? prev.filter(id => id !== roleId) : [...prev, roleId]
    );
    setSelectedBlocked(prev => prev.filter(id => id !== roleId));
  };

  const toggleBlocked = (roleId: string) => {
    setSelectedBlocked(prev => 
      prev.includes(roleId) ? prev.filter(id => id !== roleId) : [...prev, roleId]
    );
    setSelectedAllowed(prev => prev.filter(id => id !== roleId));
  };

  return (
    <div className="min-h-screen bg-[#111214] flex flex-col">
      <nav className="border-b border-white/5 bg-[#111214]/80 backdrop-blur-md px-6 h-16 flex items-center gap-4">
        <Button 
          variant="ghost" 
          size="icon" 
          className="text-muted-foreground hover:text-white"
          onClick={() => setLocation("/")}
        >
          <ChevronLeft className="w-5 h-5" />
        </Button>
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-primary" />
          <h1 className="font-bold text-white tracking-tight">Manage Server Settings</h1>
        </div>
      </nav>

      <main className="flex-1 container mx-auto px-4 py-8 max-w-4xl">
        <div className="space-y-6">
          {/* Prefix Configuration Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-[#18191c] rounded-2xl p-6 border border-white/5 shadow-xl space-y-4"
          >
            <div className="flex items-center gap-2 text-primary">
              <Terminal className="w-5 h-5" />
              <h3 className="font-bold text-white uppercase text-xs tracking-widest">General Configuration</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Custom Prefix</label>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    value={prefix}
                    onChange={(e) => setPrefix(e.target.value)}
                    maxLength={3}
                    className="flex h-10 w-full rounded-lg border border-white/5 bg-[#111214] px-3 py-2 text-sm text-white font-mono focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                    placeholder="!"
                  />
                  <div className="bg-primary/10 border border-primary/20 px-3 flex items-center justify-center rounded-lg">
                    <span className="text-primary text-xs font-bold font-mono">{prefix}help</span>
                  </div>
                </div>
                <p className="text-[10px] text-muted-foreground italic">Gunakan prefix unik untuk server ini.</p>
              </div>
            </div>
          </motion.div>

          {/* Combined Role Permissions Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-[#18191c] rounded-2xl p-6 border border-white/5 shadow-xl space-y-6"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-primary">
                <Users className="w-5 h-5" />
                <h3 className="font-bold text-white uppercase text-xs tracking-widest">Role Permissions</h3>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-3 bg-emerald-500/5 rounded-xl border border-emerald-500/10">
                <div className="flex items-center gap-2 mb-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                  <span className="text-[10px] font-bold text-emerald-500 uppercase">Allowed Roles</span>
                </div>
                <p className="text-[10px] text-muted-foreground leading-tight">Diberikan izin khusus interaksi.</p>
              </div>
              <div className="p-3 bg-destructive/5 rounded-xl border border-destructive/10">
                <div className="flex items-center gap-2 mb-1">
                  <XCircle className="w-3 h-3 text-destructive" />
                  <span className="text-[10px] font-bold text-destructive uppercase">Blocked Roles</span>
                </div>
                <p className="text-[10px] text-muted-foreground leading-tight">Dilarang menggunakan bot.</p>
              </div>
            </div>

            <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
              {roles?.map(role => (
                <div 
                  key={role.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-[#111214] border border-white/5 hover:border-primary/20 transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: role.color ? `#${role.color.toString(16).padStart(6, '0')}` : '#99aab5' }} />
                    <span className="text-sm font-medium text-white">{role.name}</span>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-gray-500 uppercase font-bold tracking-tighter hidden group-hover:block">Allow</span>
                      <Checkbox 
                        checked={selectedAllowed.includes(role.id)}
                        onCheckedChange={() => toggleAllowed(role.id)}
                        className="border-white/20 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500"
                      />
                    </div>
                    <div className="w-px h-4 bg-white/5" />
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-gray-500 uppercase font-bold tracking-tighter hidden group-hover:block">Block</span>
                      <Checkbox 
                        checked={selectedBlocked.includes(role.id)}
                        onCheckedChange={() => toggleBlocked(role.id)}
                        className="border-white/20 data-[state=checked]:bg-destructive data-[state=checked]:border-destructive"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Info Box */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="mt-8 p-4 bg-primary/5 rounded-xl border border-primary/10 flex gap-4"
        >
          <AlertCircle className="w-5 h-5 text-primary shrink-0" />
          <p className="text-xs text-primary/80 leading-relaxed italic">
            Tips: Jika Allowed Roles kosong, semua role dapat berinteraksi kecuali yang berada dalam daftar Blocked Roles.
          </p>
        </motion.div>
      </main>

      {/* Floating Save Banner */}
      <motion.div
        initial={{ y: 100 }}
        animate={{ y: isDirty ? 0 : 100 }}
        className="fixed bottom-0 left-0 right-0 p-6 z-50 flex justify-center pointer-events-none"
      >
        <div className="bg-[#111214] border border-white/5 px-6 py-4 rounded-xl shadow-2xl flex items-center gap-6 pointer-events-auto max-w-xl w-full">
          <p className="text-sm font-medium text-white flex-1">
            Ada perubahan yang belum disimpan!
          </p>
          <div className="flex items-center gap-3">
            <Button 
              variant="ghost" 
              size="sm"
              className="text-white hover:bg-white/5 text-xs font-bold uppercase"
              onClick={() => {
                setPrefix(settings?.prefix || "!");
                setSelectedAllowed(settings?.allowedRoles || []);
                setSelectedBlocked(settings?.blockedRoles || []);
              }}
            >
              Reset
            </Button>
            <Button 
              size="sm"
              className="bg-[#23a559] hover:bg-[#1a7a42] text-white text-xs font-bold uppercase flex items-center gap-2 px-6"
              onClick={() => saveMutation.mutate({ 
                prefix,
                allowedRoles: selectedAllowed, 
                blockedRoles: selectedBlocked 
              })}
              disabled={saveMutation.isPending}
            >
              {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Changes
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
