import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Users,
  Plus,
  Shield,
  Briefcase,
  Search,
  ChevronLeft,
  CalendarClock,
  Trash2,
  MoreVertical,
  RotateCw,
  UserCheck,
  CheckCircle2,
  Layers,
  Sparkles,
  UserPlus,
  Edit,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { plannerStore } from "@/services/plannerStore";
import { TaskTeam, TeamMember, DailyTask } from "@/types/planner";
import NewTeamDialog from "@/components/planner/NewTeamDialog";
import EditTeamDialog from "@/components/planner/EditTeamDialog";
import NewTaskDialog from "@/components/planner/NewTaskDialog";
import { toast } from "@/hooks/use-toast";

export default function TeamsPage() {
  const navigate = useNavigate();
  const [teams, setTeams] = useState<TaskTeam[]>(() => plannerStore.getTeams());
  const [members, setMembers] = useState<TeamMember[]>(() => plannerStore.getMembers());
  const [allTasks, setAllTasks] = useState<DailyTask[]>(() => plannerStore.getTasks());
  
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [newTeamOpen, setNewTeamOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState<TaskTeam | null>(null);
  const [newTaskOpen, setNewTaskOpen] = useState(false);
  const [selectedTeamForTask, setSelectedTeamForTask] = useState<string | null>(null);

  const refreshData = () => {
    setTeams(plannerStore.getTeams());
    setMembers(plannerStore.getMembers());
    setAllTasks(plannerStore.getTasks());
  };

  useEffect(() => {
    plannerStore.syncWithServer();
    const unsubscribe = plannerStore.subscribe(refreshData);
    return unsubscribe;
  }, []);

  const handleDeleteTeam = (teamId: string, teamName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm(`Are you sure you want to disband/delete team "${teamName}"?`)) {
      plannerStore.deleteTeam(teamId);
      toast({
        title: "Team Disbanded",
        description: `Team "${teamName}" was removed.`,
      });
      refreshData();
    }
  };

  const filteredTeams = teams.filter(
    (t) =>
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.department.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.lead_name && t.lead_name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const totalGroupTasks = allTasks.filter((t) => Boolean(t.team_id)).length;
  const pendingApprovals = allTasks.filter((t) => t.requires_approval && (t.approval_status === "pending" || t.status === "under_review")).length;

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
                  Teams Manager
                </h1>
                <Badge className="bg-purple-100 text-purple-800 border-purple-200 font-extrabold text-[10px] px-2">
                  {teams.length} Teams
                </Badge>
              </div>
              <p className="text-[11px] font-medium text-slate-500 hidden sm:block">
                Form squads, manage staff rosters & assign team procedures
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 text-slate-700 hover:bg-white hover:text-slate-900 rounded-full"
              onClick={() => setShowSearch(!showSearch)}
            >
              <Search className="w-5 h-5" />
            </Button>

            <Button
              size="sm"
              className="bg-fuchsia-600 hover:bg-fuchsia-700 text-white font-bold text-xs rounded-xl h-9 px-3 gap-1 shadow-xs"
              onClick={() => setNewTeamOpen(true)}
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Form Team</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Collapsible Search Bar */}
      {showSearch && (
        <div className="flex-shrink-0 px-3.5 sm:px-6 py-2 bg-white/80 border-b border-purple-100 z-30">
          <div className="max-w-2xl mx-auto w-full">
            <Input
              placeholder="Search team name, department, or team lead..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 text-xs bg-white border-purple-200 text-slate-900 rounded-xl"
              autoFocus
            />
          </div>
        </div>
      )}

      {/* Main Content Area - Scrollable */}
      <main className="flex-1 overflow-y-auto overflow-x-hidden px-3.5 sm:px-6 pt-3 space-y-4 max-w-2xl mx-auto w-full">
        
        {/* Top 4 Pastel Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <div className="p-3 rounded-2xl bg-white border border-slate-100 shadow-xs space-y-1">
            <div className="w-7 h-7 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
            <p className="text-[11px] font-medium text-slate-500">Formed Teams</p>
            <h4 className="text-base font-black text-slate-900">{teams.length}</h4>
          </div>

          <div className="p-3 rounded-2xl bg-white border border-slate-100 shadow-xs space-y-1">
            <div className="w-7 h-7 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">
              <UserCheck className="w-4 h-4" />
            </div>
            <p className="text-[11px] font-medium text-slate-500">Staff Registered</p>
            <h4 className="text-base font-black text-slate-900">{members.length}</h4>
          </div>

          <div className="p-3 rounded-2xl bg-white border border-slate-100 shadow-xs space-y-1">
            <div className="w-7 h-7 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
              <Briefcase className="w-4 h-4" />
            </div>
            <p className="text-[11px] font-medium text-slate-500">Group Tasks</p>
            <h4 className="text-base font-black text-slate-900">{totalGroupTasks}</h4>
          </div>

          <div className="p-3 rounded-2xl bg-white border border-slate-100 shadow-xs space-y-1">
            <div className="w-7 h-7 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Shield className="w-4 h-4" />
            </div>
            <p className="text-[11px] font-medium text-slate-500">Pending Approvals</p>
            <h4 className="text-base font-black text-slate-900">{pendingApprovals}</h4>
          </div>
        </div>

        {/* Teams List Header */}
        <div className="flex items-center justify-between px-1 pt-1">
          <h3 className="font-extrabold text-sm text-slate-700">
            Functional Teams ({filteredTeams.length})
          </h3>
          <span className="text-xs text-slate-400 font-semibold">{members.length} total staff</span>
        </div>

        {/* Teams Cards Stream */}
        {filteredTeams.length === 0 ? (
          <div className="p-8 bg-white rounded-3xl border border-purple-100 text-center space-y-3 shadow-xs my-3">
            <Users className="w-10 h-10 text-purple-300 mx-auto" />
            <h4 className="font-bold text-slate-800 text-sm">No teams found</h4>
            <p className="text-xs text-slate-500">
              Tap the button below to form your first operational team.
            </p>
            <Button
              size="sm"
              className="bg-fuchsia-600 hover:bg-fuchsia-700 text-white font-bold text-xs rounded-xl"
              onClick={() => setNewTeamOpen(true)}
            >
              + Form Team
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredTeams.map((team) => {
              const teamMembers = members.filter((m) => team.member_ids.includes(m.id));
              const teamTasks = allTasks.filter((t) => t.team_id === team.id);
              const inProgressTasks = teamTasks.filter((t) => t.status === "in_progress" || t.status === "scheduled").length;
              const teamPendingApprovals = teamTasks.filter((t) => t.requires_approval && (t.approval_status === "pending" || t.status === "under_review")).length;

              return (
                <div
                  key={team.id}
                  className="bg-white rounded-3xl border border-purple-100 shadow-xs hover:shadow-md transition-all p-4 sm:p-5 space-y-3.5 relative overflow-hidden"
                >
                  {/* Color Header Accent Stripe */}
                  <div
                    className="absolute top-0 left-0 right-0 h-1.5"
                    style={{ background: team.color || "#9333ea" }}
                  />

                  {/* Team Header */}
                  <div className="flex items-start justify-between gap-3 pt-1">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] font-extrabold tracking-wider uppercase bg-purple-50 text-purple-800 border border-purple-200 px-2 py-0.5 rounded-full">
                          {team.code || "TEAM"} • {team.department}
                        </span>
                        <span className="text-[11px] text-slate-400 font-semibold">
                          {teamMembers.length} members
                        </span>
                      </div>
                      <h3 className="font-black text-base sm:text-lg text-slate-900">
                        {team.name}
                      </h3>
                    </div>

                    <div
                      className="w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-white shadow-sm shrink-0"
                      style={{ background: team.color || "#9333ea" }}
                    >
                      <Users className="w-5 h-5 text-white" />
                    </div>
                  </div>

                  {/* Description */}
                  {team.description && (
                    <p className="text-xs text-slate-600 leading-relaxed line-clamp-2">
                      {team.description}
                    </p>
                  )}

                  {/* Team Lead Section */}
                  <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-3 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
                        <Shield className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-[10px] uppercase font-extrabold text-slate-400">Team Lead / Manager</p>
                        <p className="text-xs font-bold text-slate-800">{team.lead_name || "Unassigned"}</p>
                      </div>
                    </div>
                    <Badge className="bg-white text-fuchsia-700 border border-fuchsia-200 font-bold text-[10px]">
                      LEAD
                    </Badge>
                  </div>

                  {/* Team Members Roster */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs text-slate-500 font-semibold px-0.5">
                      <span>Team Staff Roster ({teamMembers.length})</span>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      {teamMembers.map((m) => (
                        <div
                          key={m.id}
                          className="inline-flex items-center gap-1.5 text-xs font-semibold bg-slate-50 text-slate-800 px-2.5 py-1 rounded-xl border border-slate-200/80"
                        >
                          <Avatar className="w-4 h-4">
                            <AvatarFallback className="text-[8px] bg-fuchsia-600 text-white font-extrabold">
                              {m.name.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <span>{m.name}</span>
                          <span className="text-[10px] text-slate-400">• {m.role}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Workload Metrics & Quick Actions */}
                  <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                    <div className="flex items-center gap-3 text-xs font-semibold text-slate-500">
                      <span>Tasks: <strong className="text-slate-900">{teamTasks.length}</strong></span>
                      <span>Active: <strong className="text-fuchsia-700">{inProgressTasks}</strong></span>
                      {teamPendingApprovals > 0 && (
                        <span className="text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200 text-[11px] font-bold">
                          {teamPendingApprovals} Awaiting Approval
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap">
                      <Button
                        variant="outline"
                        size="sm"
                        className="bg-white border-purple-200 text-slate-700 hover:text-fuchsia-700 hover:bg-purple-50 font-bold text-xs rounded-xl h-8 px-2.5 gap-1.5 shadow-2xs"
                        onClick={() => setEditingTeam(team)}
                      >
                        <Edit className="w-3.5 h-3.5 text-fuchsia-600" />
                        Edit Team
                      </Button>

                      <Button
                        size="sm"
                        className="bg-fuchsia-600 hover:bg-fuchsia-700 text-white font-bold text-xs rounded-xl h-8 px-3 gap-1.5 shadow-xs"
                        onClick={() => {
                          setSelectedTeamForTask(team.id);
                          setNewTaskOpen(true);
                        }}
                      >
                        <CalendarClock className="w-3.5 h-3.5" />
                        Assign Task
                      </Button>

                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-rose-500 hover:bg-rose-50 rounded-xl"
                        onClick={(e) => handleDeleteTeam(team.id, team.name, e)}
                        title="Disband Team"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                </div>
              );
            })}
          </div>
        )}

        {/* Bottom Clearance Spacer so floating bar never covers content */}
        <div className="h-16 w-full" />
      </main>

      {/* FLOATING BOTTOM ACTION CAPSULE BAR */}
      <div className="fixed bottom-3 left-0 right-0 z-50 px-3.5 sm:px-6 max-w-2xl mx-auto pointer-events-none">
        <div
          onClick={() => setNewTeamOpen(true)}
          className="bg-white/95 backdrop-blur-lg border border-purple-200/80 rounded-full p-2 pl-4 flex items-center justify-between shadow-2xl cursor-pointer active:scale-[0.99] transition-transform pointer-events-auto"
        >
          <span className="text-xs sm:text-sm text-slate-600 font-medium flex items-center gap-2">
            <UserPlus className="w-4 h-4 text-fuchsia-600" />
            Form new functional team or squad...
          </span>

          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-gradient-to-r from-fuchsia-600 to-purple-700 text-white flex items-center justify-center shadow-md shadow-fuchsia-600/30 shrink-0">
            <Plus className="w-5 h-5 stroke-[2.5]" />
          </div>
        </div>
      </div>

      {/* Dialog Modals */}
      <NewTeamDialog
        open={newTeamOpen}
        onOpenChange={setNewTeamOpen}
        onTeamCreated={refreshData}
      />

      <EditTeamDialog
        open={Boolean(editingTeam)}
        onOpenChange={(open) => {
          if (!open) setEditingTeam(null);
        }}
        team={editingTeam}
        onTeamUpdated={refreshData}
      />

      <NewTaskDialog
        open={newTaskOpen}
        onOpenChange={setNewTaskOpen}
        onTaskCreated={refreshData}
      />

    </div>
  );
}
