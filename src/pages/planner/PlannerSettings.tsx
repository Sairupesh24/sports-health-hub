import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Settings,
  ChevronLeft,
  CalendarClock,
  ShieldCheck,
  Users,
  Bell,
  CheckCircle2,
  Save,
  Clock,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";

import { plannerStore } from "@/services/plannerStore";

export default function PlannerSettings() {
  const navigate = useNavigate();
  const initialSettings = plannerStore.getSettings();

  const [startTime, setStartTime] = useState(initialSettings.startTime || "08:00");
  const [endTime, setEndTime] = useState(initialSettings.endTime || "18:00");
  const [duration, setDuration] = useState(initialSettings.duration || "60");
  const [firstDay, setFirstDay] = useState(initialSettings.firstDay || "1");
  
  const [requireHighPriorityApproval, setRequireHighPriorityApproval] = useState(initialSettings.requireHighPriorityApproval ?? true);
  const [notifyApprover, setNotifyApprover] = useState(initialSettings.notifyApprover ?? true);
  const [requireSignoffNote, setRequireSignoffNote] = useState(initialSettings.requireSignoffNote ?? false);
  const [allowCrossDept, setAllowCrossDept] = useState(initialSettings.allowCrossDept ?? true);
  const [enableReminders, setEnableReminders] = useState(initialSettings.enableReminders ?? true);
  const [reminderLeadTime, setReminderLeadTime] = useState(initialSettings.reminderLeadTime || "15");

  const handleSave = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    plannerStore.updateSettings({
      startTime,
      endTime,
      duration,
      firstDay,
      requireHighPriorityApproval,
      notifyApprover,
      requireSignoffNote,
      allowCrossDept,
      enableReminders,
      reminderLeadTime,
    });
    toast({
      title: "Planner Settings Saved",
      description: "Task scheduler & reminder configuration updated successfully.",
    });
  };

  return (
    <div className="h-screen flex flex-col bg-[#f3f4fd] text-slate-900 font-sans antialiased overflow-hidden w-full relative">
      
      {/* Light Clean Top Header - Mobile One UI Style */}
      <header className="flex-shrink-0 z-40 bg-[#f3f4fd]/95 backdrop-blur-md px-3.5 sm:px-6 py-3.5 border-b border-purple-100/60 shadow-2xs">
        <div className="max-w-2xl mx-auto w-full flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 text-slate-700 hover:bg-white hover:text-slate-900 rounded-full shrink-0"
              onClick={() => navigate("/planner")}
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>

            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-[#1e295b]">
                  Planner Settings
                </h1>
                <Badge className="bg-purple-100 text-purple-800 border-purple-200 font-extrabold text-[10px] px-2">
                  Preferences
                </Badge>
              </div>
              <p className="text-[11px] font-medium text-slate-500 hidden sm:block">
                Configure work hours, approval workflow rules & notifications
              </p>
            </div>
          </div>

          <Button
            size="sm"
            className="bg-fuchsia-600 hover:bg-fuchsia-700 text-white font-bold text-xs rounded-xl h-9 px-3 gap-1.5 shadow-xs"
            onClick={() => handleSave()}
          >
            <Save className="w-4 h-4" />
            <span>Save</span>
          </Button>
        </div>
      </header>

      {/* Main Content Area - Scrollable */}
      <main className="flex-1 overflow-y-auto overflow-x-hidden px-3.5 sm:px-6 pt-3 space-y-4 max-w-2xl mx-auto w-full pb-36 sm:pb-40">
        
        <form onSubmit={handleSave} className="space-y-4">
          
          {/* Card 1: Working Hours & Schedule Preferences */}
          <div className="bg-white rounded-3xl border border-purple-100/90 shadow-xs p-4 sm:p-5 space-y-4">
            <div className="flex items-center gap-2.5 pb-2 border-b border-purple-100/70">
              <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                <CalendarClock className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-extrabold text-sm text-slate-900">Work Hours & Time Slots</h3>
                <p className="text-[11px] text-slate-500">Default operational shifts and slot increments</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">Start of Day</Label>
                <Input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="h-10 text-xs rounded-xl border-purple-100 bg-slate-50/70"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">End of Day</Label>
                <Input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="h-10 text-xs rounded-xl border-purple-100 bg-slate-50/70"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">Default Slot Duration</Label>
                <Select value={duration} onValueChange={setDuration}>
                  <SelectTrigger className="h-10 text-xs rounded-xl border-purple-100 bg-slate-50/70">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="30">30 minutes</SelectItem>
                    <SelectItem value="45">45 minutes</SelectItem>
                    <SelectItem value="60">60 minutes (1 Hour)</SelectItem>
                    <SelectItem value="90">90 minutes</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">First Day of Week</Label>
                <Select value={firstDay} onValueChange={setFirstDay}>
                  <SelectTrigger className="h-10 text-xs rounded-xl border-purple-100 bg-slate-50/70">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Monday</SelectItem>
                    <SelectItem value="0">Sunday</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Card 2: Approvals & Governance Workflow */}
          <div className="bg-white rounded-3xl border border-purple-100/90 shadow-xs p-4 sm:p-5 space-y-3.5">
            <div className="flex items-center gap-2.5 pb-2 border-b border-purple-100/70">
              <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-extrabold text-sm text-slate-900">Approvals & Governance</h3>
                <p className="text-[11px] text-slate-500">Sign-off rules and manager verification triggers</p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-100">
                <div className="pr-3">
                  <p className="text-xs font-bold text-slate-900">Mandatory Manager Approval for High Priority</p>
                  <p className="text-[11px] text-slate-500">Auto-toggle approval requirement for critical & high priority tasks.</p>
                </div>
                <Switch
                  checked={requireHighPriorityApproval}
                  onCheckedChange={setRequireHighPriorityApproval}
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-100">
                <div className="pr-3">
                  <p className="text-xs font-bold text-slate-900">Notify Approver on Task Submission</p>
                  <p className="text-[11px] text-slate-500">Send high-priority alerts to the designated approver.</p>
                </div>
                <Switch
                  checked={notifyApprover}
                  onCheckedChange={setNotifyApprover}
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-100">
                <div className="pr-3">
                  <p className="text-xs font-bold text-slate-900">Require Sign-Off Note on Approval</p>
                  <p className="text-[11px] text-slate-500">Approver must provide clinical or operational remarks before verifying.</p>
                </div>
                <Switch
                  checked={requireSignoffNote}
                  onCheckedChange={setRequireSignoffNote}
                />
              </div>
            </div>
          </div>

          {/* Card 3: Team Roster & Task Assignment Rules */}
          <div className="bg-white rounded-3xl border border-purple-100/90 shadow-xs p-4 sm:p-5 space-y-3.5">
            <div className="flex items-center gap-2.5 pb-2 border-b border-purple-100/70">
              <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">
                <Users className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-extrabold text-sm text-slate-900">Team Delegation & Rostering</h3>
                <p className="text-[11px] text-slate-500">Functional squads, group tasks and cross-discipline sharing</p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-100">
                <div className="pr-3">
                  <p className="text-xs font-bold text-slate-900">Allow Cross-Department Delegation</p>
                  <p className="text-[11px] text-slate-500">Allow staff from Clinical, Science, and Rehab to assign tasks across teams.</p>
                </div>
                <Switch
                  checked={allowCrossDept}
                  onCheckedChange={setAllowCrossDept}
                />
              </div>
            </div>
          </div>

          {/* Card 4: Reminders & Notifications */}
          <div className="bg-white rounded-3xl border border-purple-100/90 shadow-xs p-4 sm:p-5 space-y-3.5">
            <div className="flex items-center gap-2.5 pb-2 border-b border-purple-100/70">
              <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <Bell className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-extrabold text-sm text-slate-900">Task Reminders & Alerts</h3>
                <p className="text-[11px] text-slate-500">Timing and alerts for upcoming scheduled procedures</p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-100">
                <div className="pr-3">
                  <p className="text-xs font-bold text-slate-900">Push Reminders Before Task Start</p>
                  <p className="text-[11px] text-slate-500">Notify assigned staff before procedure begins.</p>
                </div>
                <Switch
                  checked={enableReminders}
                  onCheckedChange={setEnableReminders}
                />
              </div>

              {enableReminders && (
                <div className="space-y-1.5 pt-1">
                  <Label className="text-xs font-bold text-slate-700">Reminder Lead Time</Label>
                  <Select value={reminderLeadTime} onValueChange={setReminderLeadTime}>
                    <SelectTrigger className="h-10 text-xs rounded-xl border-purple-100 bg-slate-50/70">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">At time of task (0 minutes)</SelectItem>
                      <SelectItem value="5">5 minutes before</SelectItem>
                      <SelectItem value="10">10 minutes before</SelectItem>
                      <SelectItem value="15">15 minutes before</SelectItem>
                      <SelectItem value="30">30 minutes before</SelectItem>
                      <SelectItem value="60">1 hour before</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </div>

          <div className="pt-2">
            <Button
              type="submit"
              className="w-full bg-fuchsia-600 hover:bg-fuchsia-700 text-white font-bold text-sm h-11 rounded-2xl shadow-sm gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              Save Planner Configuration
            </Button>
          </div>
        </form>

        {/* Bottom Clearance Spacer */}
        <div className="h-16 w-full" />
      </main>

    </div>
  );
}
