import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import {
  ArrowLeft, User, Phone, Mail, MapPin, Shield, Dumbbell,
  Receipt, Calendar, CreditCard, Building2, Heart
} from "lucide-react";
import { format } from "date-fns";

export default function ClientDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: client, isLoading } = useQuery({
    queryKey: ["client", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clients")
        .select("*")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: bills } = useQuery({
    queryKey: ["client-bills", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bills")
        .select("*, packages(name), referral_sources(name)")
        .eq("client_id", id!)
        .is("deleted_at", null)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <DashboardLayout role="admin">
        <div className="text-center py-20 text-muted-foreground">Loading client...</div>
      </DashboardLayout>
    );
  }

  if (!client) {
    return (
      <DashboardLayout role="admin">
        <div className="text-center py-20 space-y-3">
          <p className="text-muted-foreground">Client not found</p>
          <Button variant="outline" onClick={() => navigate("/admin/clients")}>Back to Clients</Button>
        </div>
      </DashboardLayout>
    );
  }

  const fullName = [client.honorific, client.first_name, client.middle_name, client.last_name]
    .filter(Boolean)
    .join(" ");

  const addressParts = [client.address, client.locality, client.city, client.district, client.state, client.pincode, client.country]
    .filter(Boolean)
    .join(", ");

  const totalBilled = bills?.reduce((sum, b) => sum + Number(b.total), 0) ?? 0;
  const totalPaid = bills?.filter((b) => b.status === "paid").reduce((sum, b) => sum + Number(b.total), 0) ?? 0;
  const pendingAmount = totalBilled - totalPaid;

  const InfoRow = ({ label, value, icon: Icon }: { label: string; value: string | null | undefined; icon?: React.ElementType }) => {
    if (!value) return null;
    return (
      <div className="flex items-start gap-3 py-2">
        {Icon && <Icon className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />}
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-sm font-medium text-foreground">{value}</p>
        </div>
      </div>
    );
  };

  return (
    <DashboardLayout role="admin">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/admin/clients")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-display font-bold text-foreground">{fullName}</h1>
              <Badge variant="outline" className="font-mono text-primary">{client.uhid}</Badge>
            </div>
            <p className="text-muted-foreground text-sm mt-0.5">
              Registered on {format(new Date(client.registered_on), "dd MMM yyyy, hh:mm a")}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left column - Client info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Personal Info */}
            <Card className="gradient-card border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <User className="w-4 h-4 text-primary" />
                  Personal Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6">
                  <InfoRow label="Gender" value={client.gender} />
                  <InfoRow label="Date of Birth" value={client.dob ? format(new Date(client.dob), "dd MMM yyyy") : null} icon={Calendar} />
                  <InfoRow label="Age" value={client.age?.toString()} />
                  <InfoRow label="Blood Group" value={client.blood_group} icon={Heart} />
                  <InfoRow label="Aadhaar No" value={client.aadhaar_no} />
                  <InfoRow label="Occupation" value={client.occupation} />
                  <InfoRow label="Sport" value={client.sport} icon={Dumbbell} />
                  <InfoRow label="Organization" value={client.org_name} icon={Building2} />
                </div>
              </CardContent>
            </Card>

            {/* Contact Info */}
            <Card className="gradient-card border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Phone className="w-4 h-4 text-primary" />
                  Contact Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6">
                  <InfoRow label="Mobile" value={client.mobile_no} icon={Phone} />
                  <InfoRow label="Alternate Mobile" value={client.alternate_mobile_no} icon={Phone} />
                  <InfoRow label="Email" value={client.email} icon={Mail} />
                </div>
                {addressParts && (
                  <>
                    <Separator className="my-3" />
                    <InfoRow label="Address" value={addressParts} icon={MapPin} />
                  </>
                )}
              </CardContent>
            </Card>

            {/* Insurance */}
            {client.has_insurance && (
              <Card className="gradient-card border-border">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Shield className="w-4 h-4 text-primary" />
                    Insurance Details
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6">
                    <InfoRow label="Provider" value={client.insurance_provider} />
                    <InfoRow label="Policy No" value={client.insurance_policy_no} />
                    <InfoRow label="Validity" value={client.insurance_validity ? format(new Date(client.insurance_validity), "dd MMM yyyy") : null} />
                    <InfoRow label="Coverage Amount" value={client.insurance_coverage_amount ? `₹${Number(client.insurance_coverage_amount).toLocaleString("en-IN")}` : null} />
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right column - Billing summary */}
          <div className="space-y-6">
            <Card className="gradient-card border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-primary" />
                  Billing Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total Billed</span>
                  <span className="font-semibold">₹{totalBilled.toLocaleString("en-IN")}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total Paid</span>
                  <span className="font-semibold text-green-600">₹{totalPaid.toLocaleString("en-IN")}</span>
                </div>
                <Separator />
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Pending</span>
                  <span className={`font-semibold ${pendingAmount > 0 ? "text-yellow-600" : "text-green-600"}`}>
                    ₹{pendingAmount.toLocaleString("en-IN")}
                  </span>
                </div>
                <div className="flex justify-between text-sm pt-1">
                  <span className="text-muted-foreground">Total Bills</span>
                  <span>{bills?.length ?? 0}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Billing History */}
        <Card className="gradient-card border-border">
          <CardHeader className="pb-4">
            <CardTitle className="text-base flex items-center gap-2">
              <Receipt className="w-4 h-4 text-primary" />
              Billing History
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!bills?.length ? (
              <p className="text-center py-8 text-muted-foreground">No billing records yet</p>
            ) : (
              <div className="rounded-lg border border-border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30">
                      <TableHead>Date</TableHead>
                      <TableHead>Package</TableHead>
                      <TableHead>Referral</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead className="text-right">Discount</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead>Payment</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bills.map((bill) => (
                      <TableRow key={bill.id}>
                        <TableCell className="text-muted-foreground text-sm">
                          {format(new Date(bill.created_at), "dd MMM yyyy")}
                        </TableCell>
                        <TableCell>{(bill as any).packages?.name ?? "—"}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {(bill as any).referral_sources?.name ?? "—"}
                        </TableCell>
                        <TableCell className="text-right">₹{Number(bill.amount).toLocaleString("en-IN")}</TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          ₹{Number(bill.discount).toLocaleString("en-IN")}
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          ₹{Number(bill.total).toLocaleString("en-IN")}
                        </TableCell>
                        <TableCell>
                          {bill.payment_method ? (
                            <Badge variant="outline" className="capitalize">{bill.payment_method}</Badge>
                          ) : (
                            <span className="text-muted-foreground text-xs">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="secondary"
                            className={
                              bill.status === "paid"
                                ? "bg-green-500/10 text-green-600"
                                : "bg-yellow-500/10 text-yellow-600"
                            }
                          >
                            {bill.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
