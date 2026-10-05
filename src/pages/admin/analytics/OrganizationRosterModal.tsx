import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/utils/api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Building2,
  Search,
  Users,
  Calendar,
  Activity,
  Loader2,
  ExternalLink,
  ShieldCheck,
  UserCheck
} from "lucide-react";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";

interface ClientRosterItem {
  id: string;
  name: string;
  uhid: string;
  gender?: string;
  age?: number;
  mobile?: string;
  email?: string;
  sport?: string;
  athleteType?: string;
  registeredOn?: string;
  sessionsCompleted: number;
  lastSessionDate?: string;
}

interface OrganizationRosterModalProps {
  isOpen: boolean;
  onClose: () => void;
  orgName: string | null;
  startDate?: string;
  endDate?: string;
}

export default function OrganizationRosterModal({
  isOpen,
  onClose,
  orgName,
  startDate,
  endDate,
}: OrganizationRosterModalProps) {
  const [search, setSearch] = useState("");
  const navigate = useNavigate();

  const { data: clients, isLoading } = useQuery<ClientRosterItem[]>({
    queryKey: ["org-clients", orgName, search, startDate, endDate],
    queryFn: async () => {
      if (!orgName) return [];
      const params = new URLSearchParams();
      params.append("orgName", orgName);
      if (search) params.append("search", search);
      if (startDate) params.append("startDate", startDate);
      if (endDate) params.append("endDate", endDate);
      const res = await apiFetch<ClientRosterItem[]>(`/api/analytics/organization-clients?${params.toString()}`);
      return res || [];
    },
    enabled: isOpen && !!orgName,
  });

  if (!orgName) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col p-6 overflow-hidden rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-2xl">
        <DialogHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold font-display text-foreground flex items-center gap-2">
                {orgName}
                <Badge variant="outline" className="text-xs bg-primary/5 text-primary border-primary/20 font-medium">
                  Affiliated Roster
                </Badge>
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Client directory, registered athletic profiles, and session activity for this institutional partner.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Search & Counter Filter */}
        <div className="flex items-center justify-between gap-4 py-2">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by client name, UHID..."
              className="pl-9 h-9 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700"
            />
          </div>
          <div className="text-xs text-muted-foreground">
            Showing <strong className="text-foreground">{clients?.length || 0}</strong> registered clients
          </div>
        </div>

        {/* Table Content */}
        <div className="flex-1 overflow-y-auto min-h-[300px] border border-slate-100 dark:border-slate-800 rounded-xl">
          {isLoading ? (
            <div className="h-64 flex flex-col items-center justify-center gap-2 text-muted-foreground">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
              <p className="text-xs">Loading roster members...</p>
            </div>
          ) : !clients || clients.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center gap-2 text-center p-6 text-muted-foreground">
              <Users className="w-10 h-10 opacity-30" />
              <p className="text-sm font-medium text-foreground">No clients found</p>
              <p className="text-xs max-w-xs">No clients match your filter or are affiliated with this organization.</p>
            </div>
          ) : (
            <Table>
              <TableHeader className="bg-slate-50 dark:bg-slate-800/60 sticky top-0 z-10">
                <TableRow className="border-slate-100 dark:border-slate-800 hover:bg-transparent">
                  <TableHead className="text-xs font-semibold text-foreground">Client Name & UHID</TableHead>
                  <TableHead className="text-xs font-semibold text-foreground">Sport & Discipline</TableHead>
                  <TableHead className="text-xs font-semibold text-foreground">Level / Category</TableHead>
                  <TableHead className="text-xs font-semibold text-foreground">Registered</TableHead>
                  <TableHead className="text-xs font-semibold text-foreground text-center">Sessions</TableHead>
                  <TableHead className="text-xs font-semibold text-foreground text-right">Profile</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clients.map((client) => (
                  <TableRow
                    key={client.id}
                    className="border-slate-100 dark:border-slate-800 hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <TableCell className="py-3">
                      <div className="font-semibold text-sm text-foreground">{client.name}</div>
                      <div className="text-[11px] font-mono text-muted-foreground">{client.uhid}</div>
                    </TableCell>

                    <TableCell className="py-3">
                      <div className="flex items-center gap-1.5">
                        <Activity className="w-3.5 h-3.5 text-primary shrink-0" />
                        <span className="text-xs font-medium text-foreground">{client.sport || "General"}</span>
                      </div>
                    </TableCell>

                    <TableCell className="py-3">
                      <Badge
                        variant="secondary"
                        className="text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-none"
                      >
                        {client.athleteType || "Standard"}
                      </Badge>
                    </TableCell>

                    <TableCell className="py-3 text-xs text-muted-foreground">
                      {client.registeredOn ? format(new Date(client.registeredOn), "dd MMM yyyy") : "N/A"}
                    </TableCell>

                    <TableCell className="py-3 text-center">
                      <Badge
                        variant="outline"
                        className={`text-xs font-bold ${
                          client.sessionsCompleted > 0
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                            : "bg-slate-100 text-slate-500 border-slate-200"
                        }`}
                      >
                        {client.sessionsCompleted} attended
                      </Badge>
                    </TableCell>

                    <TableCell className="py-3 text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 px-2.5 text-xs text-primary hover:text-primary hover:bg-primary/10 rounded-lg gap-1"
                        onClick={() => {
                          onClose();
                          navigate(`/admin/clients/${client.id}`);
                        }}
                      >
                        <span>View</span>
                        <ExternalLink className="w-3 h-3" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end">
          <Button variant="outline" size="sm" onClick={onClose} className="rounded-xl text-xs">
            Close Roster
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
