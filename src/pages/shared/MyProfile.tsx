import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { User, Mail, Phone, Upload, Loader2, Save } from "lucide-react";

export default function MyProfile() {
    const { user, profile, roles } = useAuth();
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);

    // Core Profile State
    const [firstName, setFirstName] = useState(profile?.first_name || "");
    const [lastName, setLastName] = useState(profile?.last_name || "");
    const [mobileNo, setMobileNo] = useState("");
    const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || "");

    // Client specific State
    const [isClient, setIsClient] = useState(false);
    const [clientDataId, setClientDataId] = useState("");
    const [gender, setGender] = useState("");
    const [age, setAge] = useState("");
    const [bloodGroup, setBloodGroup] = useState("");
    const [uhid, setUhid] = useState("");

    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (profile) {
            setFirstName(profile.first_name || "");
            setLastName(profile.last_name || "");
            setAvatarUrl(profile.avatar_url || "");

            // If they are a client/patient, fetch their expanded record
            if (roles.includes("client") || roles.includes("athlete") || roles.includes("Patient")) {
                setIsClient(true);
                fetchClientDetails();
            } else {
                // If consultant/admin, just try to get their mobile from profile
                setMobileNo(profile.mobile_no || "");
            }
        }
    }, [profile, roles]);

    const fetchClientDetails = async () => {
        if (!user?.id) return;

        try {
            // Find the client record associated with this profile
            const { data, error } = await supabase
                .from('clients')
                .select('*')
                .eq('profile_id', user.id)
                .single();

            if (error) {
                if (error.code !== 'PGRST116') { // PGRST116 is "Rows not found", which is fine for brand new clients without complete setup
                    console.error("Error fetching client details:", error);
                }
                return;
            }

            if (data) {
                setClientDataId(data.id);
                setMobileNo(data.mobile_no || "");
                setGender(data.gender || "");
                setAge(data.age?.toString() || "");
                setBloodGroup(data.blood_group || "");
                setUhid(data.uhid || "");
            }
        } catch (err) {
            console.error("Failed to fetch client details:", err);
        }
    };

    const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        try {
            setUploading(true);

            if (!event.target.files || event.target.files.length === 0) {
                throw new Error('You must select an image to upload.');
            }

            const file = event.target.files[0];
            const fileExt = file.name.split('.').pop();
            const filePath = `${user?.id}-${Math.random()}.${fileExt}`;

            // Upload to Supabase Storage
            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            // Get public URL
            const { data: { publicUrl } } = supabase.storage
                .from('avatars')
                .getPublicUrl(filePath);

            setAvatarUrl(publicUrl);

            // Update profile
            const { error: updateError } = await supabase
                .from('profiles')
                .update({ avatar_url: publicUrl })
                .eq('id', user?.id);

            if (updateError) throw updateError;

            toast({
                title: "Avatar Updated",
                description: "Your profile picture has been successfully updated."
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

            // 1. Update master profile
            const { error: profileError } = await supabase
                .from('profiles')
                .update({
                    first_name: firstName,
                    last_name: lastName,
                    // We only save mobile_no to profile if they are NOT a client, 
                    // otherwise client table is the source of truth
                    ...(isClient ? {} : { mobile_no: mobileNo })
                })
                .eq('id', user.id);

            if (profileError) throw profileError;

            // 2. If client, update extended client table
            if (isClient && clientDataId) {
                const { error: clientError } = await supabase
                    .from('clients')
                    .update({
                        first_name: firstName,
                        last_name: lastName,
                        mobile_no: mobileNo,
                        gender,
                        age: parseInt(age) || null,
                        blood_group: bloodGroup
                    })
                    .eq('id', clientDataId);

                if (clientError) throw clientError;
            }

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
    else if (roles.includes("consultant")) displayRole = "Consultant";
    else if (roles.includes("client")) displayRole = "Client";
    else if (roles.includes("athlete")) displayRole = "Athlete";

    return (
        <DashboardLayout role={roles[0] || "client"}>
            <div className="space-y-6 max-w-4xl mx-auto">
                <div>
                    <h1 className="text-2xl font-display font-bold text-foreground">My Profile</h1>
                    <p className="text-muted-foreground text-sm mt-0.5">Manage your personal information and preferences.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Left Column: Avatar & Summary */}
                    <div className="md:col-span-1 space-y-6">
                        <Card className="border-border">
                            <CardContent className="pt-6 flex flex-col items-center text-center">
                                <div className="relative group mb-4">
                                    <Avatar className="w-32 h-32 border-4 border-background shadow-md">
                                        <AvatarImage src={avatarUrl} alt={`${firstName} ${lastName}`} />
                                        <AvatarFallback className="text-4xl bg-primary/10 text-primary font-display">
                                            {firstName?.charAt(0)}{lastName?.charAt(0)}
                                        </AvatarFallback>
                                    </Avatar>

                                    <label
                                        className="absolute inset-0 flex items-center justify-center bg-black/50 text-white opacity-0 group-hover:opacity-100 rounded-full cursor-pointer transition-opacity"
                                        htmlFor="avatar-upload"
                                    >
                                        {uploading ? <Loader2 className="w-8 h-8 animate-spin" /> : <Upload className="w-8 h-8" />}
                                    </label>
                                    <input
                                        type="file"
                                        id="avatar-upload"
                                        accept="image/*"
                                        className="hidden"
                                        ref={fileInputRef}
                                        onChange={handleAvatarUpload}
                                        disabled={uploading}
                                    />
                                </div>

                                <h3 className="text-xl font-bold font-display">{firstName} {lastName}</h3>
                                <p className="text-muted-foreground text-sm font-medium mt-1">{displayRole}</p>

                                {isClient && uhid && (
                                    <div className="mt-4 px-3 py-1 bg-muted/50 rounded-md font-mono text-sm text-foreground/80">
                                        UHID: {uhid}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    {/* Right Column: Edit Form */}
                    <div className="md:col-span-2 space-y-6">
                        <Card className="border-border">
                            <CardHeader>
                                <CardTitle className="text-lg">Personal Details</CardTitle>
                                <CardDescription>Update your contact and demographic information universally.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="firstName">First Name</Label>
                                        <div className="relative">
                                            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                            <Input
                                                id="firstName"
                                                value={firstName}
                                                onChange={(e) => setFirstName(e.target.value)}
                                                className="pl-9"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="lastName">Last Name</Label>
                                        <div className="relative">
                                            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                            <Input
                                                id="lastName"
                                                value={lastName}
                                                onChange={(e) => setLastName(e.target.value)}
                                                className="pl-9"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2 sm:col-span-2">
                                        <Label htmlFor="email">Email Address <span className="text-muted-foreground font-normal text-xs ml-2">(Cannot be changed instantly)</span></Label>
                                        <div className="relative">
                                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                            <Input
                                                id="email"
                                                value={user?.email || ""}
                                                disabled
                                                className="pl-9 bg-muted/50"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="mobile">Mobile Number</Label>
                                        <div className="relative">
                                            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                            <Input
                                                id="mobile"
                                                value={mobileNo}
                                                onChange={(e) => setMobileNo(e.target.value)}
                                                className="pl-9"
                                                placeholder="+91..."
                                            />
                                        </div>
                                    </div>

                                    {/* Client Specific Demographics */}
                                    {isClient && (
                                        <>
                                            <div className="space-y-2">
                                                <Label htmlFor="age">Age</Label>
                                                <Input
                                                    id="age"
                                                    type="number"
                                                    value={age}
                                                    onChange={(e) => setAge(e.target.value)}
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="gender">Gender</Label>
                                                <Select value={gender} onValueChange={setGender}>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select gender" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="Male">Male</SelectItem>
                                                        <SelectItem value="Female">Female</SelectItem>
                                                        <SelectItem value="Other">Other</SelectItem>
                                                        <SelectItem value="Prefer not to say">Prefer not to say</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="bloodGroup">Blood Group</Label>
                                                <Select value={bloodGroup} onValueChange={setBloodGroup}>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select group" />
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

                                <div className="pt-4 flex justify-end">
                                    <Button onClick={handleSave} disabled={loading} className="gap-2">
                                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                        Save Changes
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
