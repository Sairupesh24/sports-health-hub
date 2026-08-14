import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import MobileConsultantLayout from "@/components/layout/MobileConsultantLayout";
import MobileSpecialistLayout from "@/components/layout/MobileSpecialistLayout";
import { apiFetch } from "@/utils/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { User, Mail, Phone, Upload, Loader2, Save, LogOut, ShieldCheck, Building2, Activity, CheckCircle2 } from "lucide-react";
import { haptic } from "@/utils/haptic";
import { useNavigate } from "react-router-dom";

export default function MobileProfilePage() {
  const { user, profile, roles, signOut, refreshAuth } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Core Profile State
  const [firstName, setFirstName] = useState(profile?.first_name || "");
  const [lastName, setLastName] = useState(profile?.last_name || "");
  const [mobileNo, setMobileNo] = useState("");
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || "");

  // Client / Patient specific State
  const [isClient, setIsClient] = useState(false);
  const [gender, setGender] = useState("");
  const [age, setAge] = useState("");
  const [bloodGroup, setBloodGroup] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (profile) {
      setFirstName(profile.first_name || "");
      setLastName(profile.last_name || "");
      setAvatarUrl(profile.avatar_url || "");

      if (roles.includes("client") || roles.includes("athlete") || roles.includes("Patient")) {
        setIsClient(true);
        fetchClientDetails();
      } else {
        setMobileNo(profile.mobile_no || "");
      }
    }
  }, [profile, roles]);

  const fetchClientDetails = async () => {
    if (!user?.id) return;
    try {
      const data = await apiFetch<any>('/api/clients/profile');
      if (data) {
        setMobileNo(data.mobile_no || "");
        setGender(data.gender || "");
        setAge(data.age?.toString() || "");
        setBloodGroup(data.blood_group || "");
      }
    } catch (err: any) {
      console.error("Failed to fetch client profile details:", err);
    }
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);
      if (!event.target.files || event.target.files.length === 0) {
        throw new Error('You must select an image to upload.');
      }

      const file = event.target.files[0];
      const formData = new FormData();
      formData.append('file', file);

      const token = localStorage.getItem('ishpo_jwt');
      const res = await fetch('/api/upload/single', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Upload failed');
      }

      const { publicUrl } = await res.json();
      setAvatarUrl(publicUrl);

      await apiFetch('/auth/me', {
        method: 'PATCH',
        data: { avatar_url: publicUrl }
      });

      if (refreshAuth) await refreshAuth();

      toast({
        title: "Avatar Updated",
        description: "Your profile picture has been updated."
      });
    } catch (error: any) {
      toast({
        title: "Upload Error",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!user?.id) return;
    try {
      setLoading(true);

      const updates: any = {
        first_name: firstName,
        last_name: lastName,
        mobile_no: mobileNo
      };
      
      if (isClient) {
        updates.gender = gender;
        updates.age = parseInt(age) || null;
        updates.blood_group = bloodGroup;
      }

      await apiFetch('/auth/me', {
        method: 'PATCH',
        data: updates
      });

      if (refreshAuth) await refreshAuth();

      toast({
        title: "Profile Updated",
        description: "Your information has been saved successfully."
      });
    } catch (error: any) {
      toast({
        title: "Update Failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Determine primary role for display
  let displayRole = "User";
  if (roles.includes("super_admin")) displayRole = "Super Administrator";
  else if (roles.includes("admin")) displayRole = "Administrator";
  else if (profile?.profession) displayRole = profile.profession;
  else if (roles.includes("consultant") || roles.includes("sports_physician") || roles.includes("physiotherapist")) displayRole = "Clinical Specialist";
  else if (roles.includes("sports_scientist")) displayRole = "Sports Scientist";
  else if (roles.includes("nutritionist")) displayRole = "Nutritionist";
  else if (roles.includes("foe")) displayRole = "Front Office Executive";
  else if (roles.includes("hr_manager")) displayRole = "HR Manager";
  else if (roles.includes("client") || roles.includes("athlete")) displayRole = "Client / Athlete";

  const isSpecialistLayout = roles.includes("sports_scientist");
  const LayoutToUse = isSpecialistLayout ? MobileSpecialistLayout : MobileConsultantLayout;

  return (
    <LayoutToUse title="My Profile">
      <div className="space-y-5 pb-8 font-sans">
        
        {/* Profile Card Summary */}
        <div className="relative rounded-3xl p-6 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white shadow-xl overflow-hidden border border-white/10">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 rounded-full blur-2xl pointer-events-none" />
          
          <div className="flex flex-col items-center text-center space-y-3 relative z-10">
            <div className="relative group">
              <Avatar className="w-24 h-24 border-4 border-white/20 shadow-xl">
                <AvatarImage src={avatarUrl} alt={`${firstName} ${lastName}`} />
                <AvatarFallback className="text-2xl bg-primary text-white font-black">
                  {firstName?.charAt(0)}{lastName?.charAt(0)}
                </AvatarFallback>
              </Avatar>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center shadow-lg border-2 border-slate-900 active:scale-90 transition-transform"
              >
                {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarUpload}
                className="hidden"
              />
            </div>

            <div>
              <h2 className="text-xl font-black text-white tracking-tight">
                {firstName} {lastName}
              </h2>
              <p className="text-xs text-slate-300 font-medium flex items-center justify-center gap-1.5 mt-0.5">
                <Mail className="w-3 h-3 text-primary" />
                {profile?.email}
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
              <Badge className="bg-primary/20 text-teal-300 border-primary/30 text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5">
                {displayRole}
              </Badge>

              {(profile?.organization?.name || profile?.organization_name) && (
                <Badge className="bg-white/10 text-white border-white/20 text-[10px] font-bold px-2.5 py-0.5 flex items-center gap-1">
                  <Building2 className="w-3 h-3 text-teal-400" />
                  {profile?.organization?.name || profile?.organization_name}
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Personal Info Form Card */}
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
              <User className="w-4 h-4 text-primary" />
              Personal Details
            </h3>
            <span className="text-[10px] font-bold text-slate-400">Profile Settings</span>
          </div>

          <div className="space-y-3">
            <div>
              <Label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 block">First Name</Label>
              <Input
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="First name"
                className="h-11 rounded-xl text-xs font-medium border-slate-200 dark:border-slate-800"
              />
            </div>

            <div>
              <Label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 block">Last Name</Label>
              <Input
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Last name"
                className="h-11 rounded-xl text-xs font-medium border-slate-200 dark:border-slate-800"
              />
            </div>

            <div>
              <Label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 block">Mobile Phone</Label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                <Input
                  value={mobileNo}
                  onChange={(e) => setMobileNo(e.target.value)}
                  placeholder="Enter mobile number"
                  className="h-11 pl-9 rounded-xl text-xs font-medium border-slate-200 dark:border-slate-800"
                />
              </div>
            </div>

            {isClient && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 block">Gender</Label>
                    <Select value={gender} onValueChange={setGender}>
                      <SelectTrigger className="h-11 rounded-xl text-xs font-medium">
                        <SelectValue placeholder="Gender" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Male">Male</SelectItem>
                        <SelectItem value="Female">Female</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 block">Age</Label>
                    <Input
                      type="number"
                      value={age}
                      onChange={(e) => setAge(e.target.value)}
                      placeholder="Age"
                      className="h-11 rounded-xl text-xs font-medium"
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 block">Blood Group</Label>
                  <Select value={bloodGroup} onValueChange={setBloodGroup}>
                    <SelectTrigger className="h-11 rounded-xl text-xs font-medium">
                      <SelectValue placeholder="Select blood group" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="A+">A+</SelectItem>
                      <SelectItem value="A-">A-</SelectItem>
                      <SelectItem value="B+">B+</SelectItem>
                      <SelectItem value="B-">B-</SelectItem>
                      <SelectItem value="O+">O+</SelectItem>
                      <SelectItem value="O-">O-</SelectItem>
                      <SelectItem value="AB+">AB+</SelectItem>
                      <SelectItem value="AB-">AB-</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
          </div>

          <Button
            onClick={() => {
              haptic.light();
              handleSave();
            }}
            disabled={loading}
            className="w-full h-11 rounded-xl font-bold text-xs gap-2 shadow-md shadow-primary/20"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Profile Changes
          </Button>
        </div>

        {/* Quick App Gallery Navigation Card */}
        <div 
          onClick={() => {
            haptic.light();
            navigate("/app-gallery");
          }}
          className="p-4 rounded-2xl bg-teal-50/80 dark:bg-teal-950/30 border border-teal-200/80 dark:border-teal-900/50 flex items-center justify-between cursor-pointer active:scale-98 transition-transform"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-600 text-white flex items-center justify-center shadow-md">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-900 dark:text-white">Return to App Gallery</h4>
              <p className="text-[10px] text-slate-500 font-medium">Switch applications or consoles</p>
            </div>
          </div>
          <Badge className="bg-teal-600 text-white text-[10px] font-bold px-2 py-1">Open</Badge>
        </div>

        {/* Prominent Full-Width Red Sign Out Button */}
        <Button
          variant="outline"
          onClick={() => {
            haptic.medium();
            signOut();
          }}
          className="w-full h-12 rounded-2xl border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 font-bold text-xs gap-2 active:scale-95 transition-transform shadow-xs"
        >
          <LogOut className="w-4 h-4 text-rose-600 dark:text-rose-400" />
          Sign Out / Logout Account
        </Button>

      </div>
    </LayoutToUse>
  );
}
