import PlannerLayout from "@/components/planner/PlannerLayout";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import {
  Settings, Users, Sliders, Calendar, Bell, ClipboardList, UserPlus
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export default function PlannerSettings() {
  return (
    <PlannerLayout>
      <div className="p-6 max-w-screen-lg mx-auto space-y-5">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground tracking-tight flex items-center gap-2">
            <Settings className="w-6 h-6" /> Settings
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">Manage workspace and planner preferences.</p>
        </div>

        <Tabs defaultValue="workspace">
          <TabsList className="h-9">
            <TabsTrigger value="workspace" className="text-xs gap-1.5"><Users className="w-3 h-3" /> Workspace</TabsTrigger>
            <TabsTrigger value="custom-fields" className="text-xs gap-1.5"><Sliders className="w-3 h-3" /> Custom Fields</TabsTrigger>
            <TabsTrigger value="calendars" className="text-xs gap-1.5"><Calendar className="w-3 h-3" /> Calendars</TabsTrigger>
            <TabsTrigger value="notifications" className="text-xs gap-1.5"><Bell className="w-3 h-3" /> Notifications</TabsTrigger>
            <TabsTrigger value="audit" className="text-xs gap-1.5"><ClipboardList className="w-3 h-3" /> Audit Log</TabsTrigger>
          </TabsList>

          {/* Workspace */}
          <TabsContent value="workspace" className="mt-4 space-y-5">
            <div className="planner-card p-5 space-y-4">
              <h3 className="font-display font-semibold text-foreground">Workspace Details</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Workspace Name</Label>
                  <Input defaultValue="Sports Performance Clinic" className="h-9" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Default Currency</Label>
                  <Select defaultValue="INR">
                    <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="INR">INR ₹</SelectItem>
                      <SelectItem value="USD">USD $</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Week Start</Label>
                  <Select defaultValue="monday">
                    <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monday">Monday</SelectItem>
                      <SelectItem value="sunday">Sunday</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button size="sm" style={{ background: "hsl(var(--planner-primary))" }}>Save Changes</Button>
            </div>

            <div className="planner-card p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-display font-semibold text-foreground">Members</h3>
                <Button size="sm" variant="outline" className="gap-1.5">
                  <UserPlus className="w-3.5 h-3.5" /> Invite
                </Button>
              </div>
              {[
                { name: "Sarah Kim", role: "Owner", initials: "SK" },
                { name: "James Park", role: "Admin", initials: "JP" },
                { name: "Ana Diaz", role: "Contributor", initials: "AD" },
                { name: "Tom Roberts", role: "Contributor", initials: "TR" },
                { name: "Priya Mehta", role: "Viewer", initials: "PM" },
              ].map((m) => (
                <div key={m.name} className="flex items-center justify-between gap-3 py-2 border-b border-border/20 last:border-0">
                  <div className="flex items-center gap-2.5">
                    <Avatar className="w-7 h-7">
                      <AvatarFallback className="text-xs font-bold text-white" style={{ background: "hsl(var(--planner-primary))" }}>{m.initials}</AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium text-foreground">{m.name}</span>
                  </div>
                  <Select defaultValue={m.role.toLowerCase()}>
                    <SelectTrigger className="h-7 text-xs w-32"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="owner">Owner</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="manager">Manager</SelectItem>
                      <SelectItem value="contributor">Contributor</SelectItem>
                      <SelectItem value="viewer">Viewer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
          </TabsContent>

          {/* Custom Fields */}
          <TabsContent value="custom-fields" className="mt-4">
            <div className="planner-card p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-display font-semibold text-foreground">Custom Fields</h3>
                <Button size="sm" style={{ background: "hsl(var(--planner-primary))" }}>+ Add Field</Button>
              </div>
              <p className="text-sm text-muted-foreground">Define custom fields for work items and projects.</p>
              <div className="space-y-2">
                {[
                  { name: "Story Points", type: "number", scope: "Work Item" },
                  { name: "Risk Level", type: "dropdown", scope: "Work Item" },
                  { name: "Client Facing", type: "boolean", scope: "Project" },
                  { name: "QA Checklist URL", type: "text", scope: "Work Item" },
                ].map((f) => (
                  <div key={f.name} className="flex items-center justify-between px-3 py-2.5 rounded-lg border border-border/40 bg-muted/10">
                    <div>
                      <span className="text-sm font-medium text-foreground">{f.name}</span>
                      <span className="ml-2 text-xs text-muted-foreground">{f.scope}</span>
                    </div>
                    <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded capitalize">{f.type}</span>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          {/* Calendars */}
          <TabsContent value="calendars" className="mt-4">
            <div className="planner-card p-5 space-y-4">
              <h3 className="font-display font-semibold text-foreground">Working Calendar</h3>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Working Days</Label>
                  <div className="flex gap-2">
                    {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d, i) => (
                      <button
                        key={d}
                        className={`w-10 h-10 rounded-lg text-xs font-semibold transition-colors ${i < 5 ? "text-white" : "bg-muted text-muted-foreground"}`}
                        style={i < 5 ? { background: "hsl(var(--planner-primary))" } : {}}
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Work Start</Label>
                    <Input type="time" defaultValue="09:00" className="h-9" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Work End</Label>
                    <Input type="time" defaultValue="18:00" className="h-9" />
                  </div>
                </div>
              </div>
              <Button size="sm" style={{ background: "hsl(var(--planner-primary))" }}>Save Calendar</Button>
            </div>
          </TabsContent>

          {/* Notifications */}
          <TabsContent value="notifications" className="mt-4">
            <div className="planner-card p-5 space-y-4">
              <h3 className="font-display font-semibold text-foreground">Notification Preferences</h3>
              {[
                { label: "Work item assigned to me", defaultOn: true },
                { label: "@Mention in comments", defaultOn: true },
                { label: "Due date approaching (48h)", defaultOn: true },
                { label: "Status changes on my items", defaultOn: true },
                { label: "Sprint starts", defaultOn: false },
                { label: "Sprint completes", defaultOn: true },
                { label: "Milestone reached", defaultOn: true },
                { label: "New project members added", defaultOn: false },
              ].map((n) => (
                <div key={n.label} className="flex items-center justify-between py-2 border-b border-border/20 last:border-0">
                  <span className="text-sm text-foreground">{n.label}</span>
                  <Switch defaultChecked={n.defaultOn} />
                </div>
              ))}
            </div>
          </TabsContent>

          {/* Audit Log */}
          <TabsContent value="audit" className="mt-4">
            <div className="planner-card overflow-hidden">
              <div className="px-5 py-3 border-b border-border/40 flex items-center justify-between">
                <h3 className="font-display font-semibold text-foreground">Audit Log</h3>
                <Button variant="outline" size="sm">Export CSV</Button>
              </div>
              <table className="w-full text-sm">
                <thead className="bg-muted/20">
                  <tr className="border-b border-border/40">
                    <th className="text-left px-5 py-2.5 text-xs font-semibold text-muted-foreground">User</th>
                    <th className="text-left px-5 py-2.5 text-xs font-semibold text-muted-foreground">Action</th>
                    <th className="text-left px-5 py-2.5 text-xs font-semibold text-muted-foreground">Entity</th>
                    <th className="text-left px-5 py-2.5 text-xs font-semibold text-muted-foreground">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { user: "Sarah Kim",  action: "create", entity: "Work Item: Design System Tokens", time: "Aug 12, 14:30" },
                    { user: "James Park", action: "update", entity: "Project: Website Replatform — status → at_risk", time: "Aug 12, 13:15" },
                    { user: "Ana Diaz",   action: "delete", entity: "Work Item: Old wireframes", time: "Aug 12, 11:00" },
                    { user: "Tom Roberts",action: "create", entity: "Sprint 4", time: "Aug 8, 09:00" },
                    { user: "Sarah Kim",  action: "update", entity: "Milestone: Alpha Release — date → Aug 15", time: "Aug 5, 10:30" },
                  ].map((a, i) => (
                    <tr key={i} className="border-b border-border/20 hover:bg-muted/10">
                      <td className="px-5 py-2.5 text-xs font-medium text-foreground">{a.user}</td>
                      <td className="px-5 py-2.5 text-xs capitalize">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                          a.action === "create" ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400"
                          : a.action === "delete" ? "bg-red-50 text-red-600 dark:bg-red-950 dark:text-red-400"
                          : "bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400"
                        }`}>{a.action}</span>
                      </td>
                      <td className="px-5 py-2.5 text-xs text-muted-foreground">{a.entity}</td>
                      <td className="px-5 py-2.5 text-xs text-muted-foreground whitespace-nowrap">{a.time}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </PlannerLayout>
  );
}
