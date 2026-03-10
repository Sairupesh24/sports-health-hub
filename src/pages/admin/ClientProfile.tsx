import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, User, Phone, MapPin, Shield, Activity, CalendarDays, FileText, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

export default function ClientProfile() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [client, setClient] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    // Mock billing history since backend doesn't support bills yet
    const mockBills = [
        { id: "INV-1044", date: "2023-11-01T10:00:00Z", package: "Initial Consultation", amount: 1500, status: "Paid", method: "UPI" },
        { id: "INV-2099", date: "2023-11-20T14:30:00Z", package: "Rehab Session", amount: 800, status: "Pending", method: "-" },
    ];

    useEffect(() => {
        async function fetchClient() {
            if (!id) return;
            const { data, error } = await supabase
                .from("clients")
                .select("*")
                .eq("id", id)
                .single();

            if (!error && data) {
                setClient(data);
            }
            setLoading(false);
        }
        fetchClient();
    }, [id]);

    if (loading) {
        return <DashboardLayout role="admin"><div className="flex justify-center py-20">Loading profile...</div></DashboardLayout>;
    }

    if (!client) {
        return <DashboardLayout role="admin">
            <div className="flex flex-col items-center justify-center py-20">
                <h2 className="text-xl font-bold mb-4">Client not found</h2>
                <Button onClick={() => navigate("/admin/clients")}>Go Back to Clients List</Button>
            </div>
        </DashboardLayout>;
    }

    const {
        first_name, last_name, uhid, honorific, gender, age, dob, blood_group,
        mobile_no, email, occupation, sport, org_name,
        address, locality, city, state, pincode, country,
        has_insurance, insurance_provider, insurance_policy_no, insurance_coverage_amount,
        registered_on
    } = client;

    const fullName = `${honorific ? honorific + " " : ""}${first_name} ${last_name}`;

    return (
        <DashboardLayout role="admin">
            <div className="max-w-5xl mx-auto space-y-6 pb-12">
                {/* Header */}
                <div className="flex items-center gap-4 border-b pb-6">
                    <Button variant="ghost" size="icon" onClick={() => navigate("/admin/clients")}>
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                    <div className="flex-1">
                        <h1 className="text-3xl font-display font-bold text-foreground">{fullName}</h1>
                        <p className="text-muted-foreground flex items-center gap-2 mt-1">
                            <span className="bg-primary/10 text-primary px-2 py-0.5 rounded text-xs font-semibold">UHID: {uhid}</span>
                            <span>•</span>
                            <span>Registered on: {format(new Date(registered_on), "dd MMM yyyy")}</span>
                        </p>
                    </div>
                </div>

                {/* Content */}
                <Tabs defaultValue="profile" className="w-full">
                    <TabsList className="mb-6 grid w-full max-w-md grid-cols-2">
                        <TabsTrigger value="profile">Profile Details</TabsTrigger>
                        <TabsTrigger value="billing">Billing History</TabsTrigger>
                    </TabsList>

                    {/* PROFILE TAB */}
                    <TabsContent value="profile" className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Personal Info */}
                            <Card className="gradient-card border-border">
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-lg flex items-center gap-2">
                                        <User className="w-5 h-5 text-primary" />
                                        Personal Information
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="grid grid-cols-2 gap-y-4 gap-x-6 text-sm">
                                        <div><span className="text-muted-foreground block mb-1">Gender</span><span className="font-medium">{gender || "-"}</span></div>
                                        <div><span className="text-muted-foreground block mb-1">Age / DOB</span><span className="font-medium">{age || "-"} yrs {dob ? `(${format(new Date(dob), "dd/MM/yyyy")})` : ""}</span></div>
                                        <div><span className="text-muted-foreground block mb-1">Blood Group</span><span className="font-medium">{blood_group || "-"}</span></div>
                                        <div><span className="text-muted-foreground block mb-1">Occupation</span><span className="font-medium">{occupation || "-"}</span></div>
                                        <div><span className="text-muted-foreground block mb-1">Sport</span><span className="font-medium">{sport || "-"}</span></div>
                                        <div><span className="text-muted-foreground block mb-1">Organization</span><span className="font-medium">{org_name || "-"}</span></div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Contact Info */}
                            <Card className="gradient-card border-border">
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-lg flex items-center gap-2">
                                        <Phone className="w-5 h-5 text-primary" />
                                        Contact & Address
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="grid grid-cols-1 gap-y-4 text-sm">
                                        <div><span className="text-muted-foreground block mb-1">Mobile</span><span className="font-medium">{mobile_no}</span></div>
                                        {email && <div><span className="text-muted-foreground block mb-1">Email</span><span className="font-medium">{email}</span></div>}
                                        <div>
                                            <span className="text-muted-foreground block mb-1">Address</span>
                                            <span className="font-medium">
                                                {[address, locality, city, state, pincode, country].filter(Boolean).join(", ") || "-"}
                                            </span>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Insurance */}
                            <Card className="gradient-card border-border md:col-span-2">
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-lg flex items-center gap-2">
                                        <Shield className="w-5 h-5 text-primary" />
                                        Insurance Information
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    {!has_insurance ? (
                                        <p className="text-sm text-muted-foreground">No insurance details provided.</p>
                                    ) : (
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-y-4 gap-x-6 text-sm">
                                            <div><span className="text-muted-foreground block mb-1">Provider</span><span className="font-medium">{insurance_provider || "-"}</span></div>
                                            <div><span className="text-muted-foreground block mb-1">Policy No</span><span className="font-medium">{insurance_policy_no || "-"}</span></div>
                                            <div><span className="text-muted-foreground block mb-1">Coverage Amount</span><span className="font-medium">{insurance_coverage_amount ? `Rs. ${insurance_coverage_amount}` : "-"}</span></div>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>

                    {/* BILLING HISTORY TAB */}
                    <TabsContent value="billing">
                        <Card className="gradient-card border-border">
                            <CardHeader>
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <FileText className="w-5 h-5 text-primary" />
                                    Billing History
                                </CardTitle>
                                <CardDescription>
                                    This is a mocked history of recent bills for this client.
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="rounded-md border overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b bg-muted/50 text-left">
                                                <th className="p-3 font-medium text-muted-foreground">Invoice #</th>
                                                <th className="p-3 font-medium text-muted-foreground">Date</th>
                                                <th className="p-3 font-medium text-muted-foreground">Package</th>
                                                <th className="p-3 font-medium text-muted-foreground text-right">Amount</th>
                                                <th className="p-3 font-medium text-muted-foreground text-center">Status</th>
                                                <th className="p-3 font-medium text-muted-foreground text-right">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {mockBills.map((bill) => (
                                                <tr key={bill.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                                                    <td className="p-3 font-medium text-foreground">{bill.id}</td>
                                                    <td className="p-3 text-muted-foreground">{format(new Date(bill.date), "dd MMM yyyy")}</td>
                                                    <td className="p-3 text-muted-foreground">{bill.package}</td>
                                                    <td className="p-3 text-right font-medium">Rs. {bill.amount}</td>
                                                    <td className="p-3 text-center">
                                                        {bill.status === "Paid" ? (
                                                            <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-emerald-500/10 text-emerald-500">Paid ({bill.method})</span>
                                                        ) : (
                                                            <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-amber-500/10 text-amber-500">Pending</span>
                                                        )}
                                                    </td>
                                                    <td className="p-3 text-right">
                                                        <Button size="icon" variant="ghost" title="Download Invoice">
                                                            <Download className="w-4 h-4 text-primary" />
                                                        </Button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>
        </DashboardLayout>
    );
}
