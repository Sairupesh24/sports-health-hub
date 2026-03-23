import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { UserPlus, Search, Users } from "lucide-react";
import { format } from "date-fns";
import { ClientBulkUpload } from "@/components/admin/ClientBulkUpload";

export default function ClientList() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");

  const { data: clients, isLoading } = useQuery({
    queryKey: ["clients", search],
    queryFn: async () => {
      let query = supabase
        .from("clients")
        .select("*")
        .is("deleted_at", null)
        .order("created_at", { ascending: false });

      if (search.trim()) {
        query = query.or(
          `first_name.ilike.%${search}%,last_name.ilike.%${search}%,uhid.ilike.%${search}%,mobile_no.ilike.%${search}%`
        );
      }

      const { data, error } = await query.limit(50);
      if (error) throw error;
      return data;
    },
  });

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
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                All Clients
              </CardTitle>
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, UHID, mobile..."
                  className="pl-9 bg-muted/30 border-border"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
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
                      <TableHead>UHID</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Mobile</TableHead>
                      <TableHead>Gender</TableHead>
                      <TableHead>Age</TableHead>
                      <TableHead>Registered</TableHead>
                      <TableHead>Insurance</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {clients.map((c) => (
                      <TableRow key={c.id} onClick={() => navigate(`/admin/clients/${c.id}`)} className="cursor-pointer hover:bg-muted/20">
                        <TableCell className="font-mono text-primary font-medium">{c.uhid}</TableCell>
                        <TableCell className="font-medium">
                          {[c.honorific, c.first_name, c.middle_name, c.last_name].filter(Boolean).join(" ")}
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
