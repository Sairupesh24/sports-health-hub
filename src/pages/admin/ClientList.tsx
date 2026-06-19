import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { apiFetch } from "@/utils/api";
import { UserPlus, Search, Users, ArrowUp, ArrowDown, ArrowUpDown, Download } from "lucide-react";
import { format } from "date-fns";
import { ClientBulkUpload } from "@/components/admin/ClientBulkUpload";
import { VIPBadge, VIPName } from "@/components/ui/VIPBadge";
import { toast } from "@/hooks/use-toast";
import * as XLSX from "xlsx";

export default function ClientList() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const todayStr = format(new Date(), "yyyy-MM-dd");
  const [startDate, setStartDate] = useState<string>(todayStr);
  const [endDate, setEndDate] = useState<string>(todayStr);

  const { data: clients, isLoading } = useQuery({
    queryKey: ["clients", search, startDate, endDate],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.append("search", search);
      if (startDate) params.append("startDate", startDate);
      if (endDate) params.append("endDate", endDate);
      const queryString = params.toString();
      const endpoint = `/clients${queryString ? `?${queryString}` : ""}`;
      return apiFetch<any[]>(endpoint);
    },
  });

  const [sortField, setSortField] = useState<string>("registered_on");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const sortedClients = [...(clients || [])].sort((a, b) => {
    let aValue: any = a[sortField];
    let bValue: any = b[sortField];

    if (sortField === "name") {
      aValue = [a.first_name, a.middle_name, a.last_name].filter(Boolean).join(" ").toLowerCase();
      bValue = [b.first_name, b.middle_name, b.last_name].filter(Boolean).join(" ").toLowerCase();
    } else if (sortField === "registered_on") {
      aValue = a.registered_on ? new Date(a.registered_on).getTime() : 0;
      bValue = b.registered_on ? new Date(b.registered_on).getTime() : 0;
    } else if (typeof aValue === "string") {
      aValue = aValue.toLowerCase();
      bValue = bValue ? bValue.toLowerCase() : "";
    }

    if (aValue === undefined || aValue === null) return sortDirection === "asc" ? 1 : -1;
    if (bValue === undefined || bValue === null) return sortDirection === "asc" ? -1 : 1;

    if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
    if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
    return 0;
  });

  const handleExportClients = () => {
    if (!sortedClients || sortedClients.length === 0) {
      toast({
        title: "No Clients",
        description: "There are no clients in the current timeframe to export.",
        variant: "destructive",
      });
      return;
    }

    const exportData = sortedClients.map(c => ({
      "UHID": c.uhid,
      "Registration Date": c.registered_on ? format(new Date(c.registered_on), "yyyy-MM-dd") : "",
      "Honorific": c.honorific || "",
      "First Name": c.first_name || "",
      "Middle Name": c.middle_name || "",
      "Last Name": c.last_name || "",
      "Gender": c.gender || "",
      "Mobile No": c.mobile_no || "",
      "Aadhaar No": c.aadhaar_no || "",
      "Blood Group": c.blood_group || "",
      "DOB": c.dob ? format(new Date(c.dob), "yyyy-MM-dd") : "",
      "Age": c.age ?? "",
      "Email": c.email || "",
      "Alternate Mobile No": c.alternate_mobile_no || "",
      "Occupation": c.occupation || "",
      "Sport": c.sport || "",
      "Athlete Type": c.athlete_type || "",
      "Organization Name": c.org_name || "",
      "Address": c.address || "",
      "Locality": c.locality || "",
      "Pincode": c.pincode || "",
      "City": c.city || "",
      "District": c.district || "",
      "State": c.state || "",
      "Country": c.country || "",
      "Has Insurance": c.has_insurance ? "Yes" : "No",
      "Insurance Provider": c.insurance_provider || "",
      "Insurance Policy No": c.insurance_policy_no || "",
      "Insurance Validity": c.insurance_validity ? format(new Date(c.insurance_validity), "yyyy-MM-dd") : "",
      "Insurance Coverage Amount": c.insurance_coverage_amount ?? "",
      "Is VIP": c.is_vip ? "Yes" : "No",
      "Referral Source": c.referral_source || "",
      "Referral Source Detail": c.referral_source_detail || ""
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Clients");
    
    let filename = "clients_export";
    if (startDate && endDate) {
      filename += `_${startDate}_to_${endDate}`;
    } else if (startDate) {
      filename += `_from_${startDate}`;
    } else if (endDate) {
      filename += `_to_${endDate}`;
    } else {
      filename += "_all";
    }
    filename += ".xlsx";

    XLSX.writeFile(wb, filename);
    
    toast({
      title: "Export Successful",
      description: `Exported ${exportData.length} client records.`,
    });
  };

  const renderHeader = (label: string, field: string) => {
    const isSorted = sortField === field;
    return (
      <TableHead 
        onClick={() => handleSort(field)} 
        className="cursor-pointer select-none hover:bg-muted/50 hover:text-foreground transition-colors group py-3"
      >
        <div className="flex items-center gap-1.5 font-semibold text-xs uppercase tracking-wider">
          {label}
          {isSorted ? (
            sortDirection === "asc" ? (
              <ArrowUp className="w-3.5 h-3.5 text-primary shrink-0" />
            ) : (
              <ArrowDown className="w-3.5 h-3.5 text-primary shrink-0" />
            )
          ) : (
            <ArrowUpDown className="w-3.5 h-3.5 text-muted-foreground/30 group-hover:text-muted-foreground/80 shrink-0 transition-colors" />
          )}
        </div>
      </TableHead>
    );
  };

  return (
    <DashboardLayout role="admin">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-0">
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground">Clients</h1>
            <p className="text-muted-foreground text-sm mt-0.5">Manage your client registrations</p>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <ClientBulkUpload />
            <Button onClick={() => navigate("/admin/clients/register")} className="gap-2 shrink-0">
              <UserPlus className="w-4 h-4" />
              Register Client
            </Button>
          </div>
        </div>

        <Card className="gradient-card border-border">
          <CardHeader className="pb-4">
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
              <CardTitle className="text-lg flex items-center gap-2 shrink-0">
                <Users className="w-5 h-5 text-primary" />
                All Clients
              </CardTitle>

              {/* Search Bar (Center) */}
              <div className="relative w-full lg:w-72 lg:mx-auto">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, UHID, mobile..."
                  className="pl-9 bg-muted/30 border-border"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              {/* Date Filter & Export (Right) */}
              <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto justify-start lg:justify-end">
                <div className="flex items-center gap-1.5 bg-muted/30 border border-border rounded-md px-2.5 py-1 text-xs">
                  <span className="text-muted-foreground font-medium">From:</span>
                  <Input
                    type="date"
                    className="h-7 w-[125px] text-xs bg-transparent border-0 focus-visible:ring-0 focus-visible:ring-offset-0 p-0 text-foreground"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                  <span className="text-muted-foreground font-medium px-0.5">—</span>
                  <span className="text-muted-foreground font-medium">To:</span>
                  <Input
                    type="date"
                    className="h-7 w-[125px] text-xs bg-transparent border-0 focus-visible:ring-0 focus-visible:ring-offset-0 p-0 text-foreground"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
                {(startDate || endDate) && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-8 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/30"
                    onClick={() => {
                      setStartDate("");
                      setEndDate("");
                    }}
                  >
                    Clear Filter
                  </Button>
                )}
                <Button 
                  onClick={handleExportClients}
                  variant="outline" 
                  size="sm" 
                  className="h-9 gap-1.5 shrink-0"
                >
                  <Download className="w-4 h-4" />
                  Export Clients
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-12 text-muted-foreground">Loading clients...</div>
            ) : !clients?.length ? (
              <div className="text-center py-12 space-y-3">
                <Users className="w-10 h-10 mx-auto text-muted-foreground/40" />
                <p className="text-muted-foreground">No clients found</p>
                <Button variant="outline" onClick={() => navigate("/admin/clients/register")}>
                  Register First Client
                </Button>
              </div>
            ) : (
              <div className="rounded-lg border border-border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30">
                      {renderHeader("UHID", "uhid")}
                      {renderHeader("Name", "name")}
                      {renderHeader("Mobile", "mobile_no")}
                      {renderHeader("Gender", "gender")}
                      {renderHeader("Age", "age")}
                      {renderHeader("Registered", "registered_on")}
                      {renderHeader("Insurance", "has_insurance")}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedClients.map((c) => (
                      <TableRow key={c.id} onClick={() => navigate(`/admin/clients/${c.id}`)} className="cursor-pointer hover:bg-muted/20">
                        <TableCell className="font-mono text-primary font-medium">{c.uhid}</TableCell>
                        <TableCell className="font-medium">
                          <VIPName 
                            name={[c.honorific, c.first_name, c.middle_name, c.last_name].filter(Boolean).join(" ")} 
                            isVIP={(c as any).is_vip} 
                          />
                        </TableCell>
                        <TableCell>{c.mobile_no}</TableCell>
                        <TableCell>{c.gender || "—"}</TableCell>
                        <TableCell>{c.age ?? "—"}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {format(new Date(c.registered_on), "dd MMM yyyy")}
                        </TableCell>
                        <TableCell>
                          {c.has_insurance ? (
                            <Badge variant="secondary" className="bg-primary/10 text-primary">Insured</Badge>
                          ) : (
                            <span className="text-muted-foreground text-xs">—</span>
                          )}
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
