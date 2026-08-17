import { DailyTask, TaskTeam, TeamMember, DailyTaskStatus, DailyTaskPriority, DailyTaskCategory } from "@/types/planner";
import { apiFetch } from "@/utils/api";

// Helper to get today's date formatted as YYYY-MM-DD
export function getTodayString(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// Format friendly display role from role and profession
export function formatStaffRole(role: string, profession?: string | null): string {
  if (profession && profession.trim()) return profession.trim();
  if (role === "admin") return "Admin & Operations Lead";
  if (role === "sports_scientist") return "Sports Scientist";
  if (role === "nutritionist") return "Nutritionist";
  if (role === "sports_physician") return "Sports Physician";
  if (role === "physiotherapist") return "Physiotherapist";
  if (role === "consultant") return "Consultant / Specialist";
  if (role === "hr_manager") return "HR Manager";
  if (role === "manager") return "Operations Manager";
  if (role === "foe") return "Front Office Executive";
  return role || "Staff Member";
}

// Format department from role and profession
export function formatStaffDepartment(role: string, profession?: string | null): string {
  const p = (profession || "").toLowerCase();
  const r = (role || "").toLowerCase();

  if (p.includes("physician") || p.includes("physio") || p.includes("clinical") || r === "sports_physician" || r === "physiotherapist" || r === "consultant") {
    return "Clinical Medicine & Rehab";
  }
  if (p.includes("science") || p.includes("biomechanic") || r === "sports_scientist") {
    return "Sports Science & Biomechanics";
  }
  if (p.includes("nutrition") || p.includes("diet") || r === "nutritionist") {
    return "Clinical Nutrition";
  }
  if (r === "hr_manager") {
    return "Human Resources";
  }
  return "Administration & Operations";
}

// Default empty tasks array - Orbit Planner starts completely empty
export const REAL_INITIAL_TASKS: DailyTask[] = [];

// Base initial team templates that will be populated with real staff members
export const DEFAULT_TEAMS: TaskTeam[] = [
  {
    id: "team_clinical",
    name: "Clinical Medicine & Rehab Team",
    code: "CMT",
    department: "Clinical Medicine & Rehab",
    description: "Medical screenings, physician consultations, musculoskeletal assessments, and clinical return-to-sport protocols.",
    color: "hsl(251 74% 60%)",
    lead_id: "",
    lead_name: "Clinical Lead",
    member_ids: [],
    created_at: getTodayString(),
  },
  {
    id: "team_science",
    name: "Sports Science & Biomechanics Team",
    code: "SST",
    department: "Sports Science & Biomechanics",
    description: "Athlete testing protocols, VO2 max evaluations, force-plate biomechanics, and performance load monitoring.",
    color: "hsl(152 60% 42%)",
    lead_id: "",
    lead_name: "Sports Science Lead",
    member_ids: [],
    created_at: getTodayString(),
  },
  {
    id: "team_ops",
    name: "Facility Operations & Admin Team",
    code: "OAT",
    department: "Administration & Operations",
    description: "Facility operations, equipment inspections, safety compliance audits, and daily appointment coordination.",
    color: "hsl(210 72% 50%)",
    lead_id: "",
    lead_name: "Operations Lead",
    member_ids: [],
    created_at: getTodayString(),
  },
  {
    id: "team_nutrition",
    name: "Nutrition & Dietary Science Team",
    code: "NPT",
    department: "Clinical Nutrition",
    description: "Dietary assessments, personalized meal plans, body composition analysis, and hydration protocols.",
    color: "hsl(32 95% 44%)",
    lead_id: "",
    lead_name: "Nutrition Lead",
    member_ids: [],
    created_at: getTodayString(),
  },
];

// Persistent Local Store Engine with Real-Time User Approvals API Syncing
class PlannerStore {
  private tasks: DailyTask[] = [];
  private teams: TaskTeam[] = [];
  private members: TeamMember[] = [];
  private listeners: (() => void)[] = [];

  constructor() {
    this.loadStore();
    this.fetchRealEmployeesFromAPI();
  }

  private loadStore() {
    try {
      // Check if v3 clean migration has been performed; if not, flush old dummy data
      const isCleanV3 = localStorage.getItem("orbit_planner_v3_clean");
      if (!isCleanV3) {
        localStorage.removeItem("orbit_planner_tasks_v2");
        localStorage.removeItem("orbit_planner_tasks_v1");
        localStorage.setItem("orbit_planner_tasks_v3", JSON.stringify([]));
        localStorage.setItem("orbit_planner_v3_clean", "true");
        this.tasks = [];
      } else {
        const savedTasks = localStorage.getItem("orbit_planner_tasks_v3");
        this.tasks = savedTasks ? JSON.parse(savedTasks) : [];
      }

      const savedTeams = localStorage.getItem("orbit_planner_teams_v3");
      const savedMembers = localStorage.getItem("orbit_planner_members_v3");

      this.teams = savedTeams ? JSON.parse(savedTeams) : DEFAULT_TEAMS;
      this.members = savedMembers ? JSON.parse(savedMembers) : [];
    } catch {
      this.tasks = [];
      this.teams = DEFAULT_TEAMS;
      this.members = [];
    }
  }

  // Asynchronously sync real approved staff members from User Approvals API (/hr/users)
  public async fetchRealEmployeesFromAPI() {
    try {
      const response = await apiFetch<{ data: any[] }>("/hr/users");
      const allUsers = response.data || [];

      if (Array.isArray(allUsers) && allUsers.length > 0) {
        // Filter out super_admin and deleted/ghost users
        const validUsers = allUsers.filter(
          (u) => u.current_role !== "super_admin" && !u.email?.startsWith("deleted_") && u.is_approved !== false
        );

        const fetchedMembers: TeamMember[] = validUsers.map((u) => {
          const fullName = `${u.first_name || ""} ${u.last_name || ""}`.trim() || u.email || "Staff Member";
          const roleTitle = formatStaffRole(u.current_role, u.profession);
          const dept = formatStaffDepartment(u.current_role, u.profession);

          return {
            id: u.id,
            name: fullName,
            role: roleTitle,
            department: dept,
            email: u.email,
            avatar: u.avatar_url,
          };
        });

        this.members = fetchedMembers;

        // Populate and update functional teams with actual staff members
        this.updateTeamsWithMembers(fetchedMembers);
        this.saveStore();
      }
    } catch (e) {
      console.warn("Could not fetch user approval staff:", e);
    }
  }

  // Distribute members into functional teams based on department
  private updateTeamsWithMembers(members: TeamMember[]) {
    if (members.length === 0) return;

    const teamClinical = this.teams.find((t) => t.id === "team_clinical") || DEFAULT_TEAMS[0];
    const teamScience = this.teams.find((t) => t.id === "team_science") || DEFAULT_TEAMS[1];
    const teamOps = this.teams.find((t) => t.id === "team_ops") || DEFAULT_TEAMS[2];
    const teamNutrition = this.teams.find((t) => t.id === "team_nutrition") || DEFAULT_TEAMS[3];

    const clinicalMembers = members.filter((m) => m.department === "Clinical Medicine & Rehab");
    const scienceMembers = members.filter((m) => m.department === "Sports Science & Biomechanics");
    const nutritionMembers = members.filter((m) => m.department === "Clinical Nutrition");
    const opsMembers = members.filter(
      (m) => m.department === "Administration & Operations" || m.department === "Human Resources"
    );

    if (clinicalMembers.length > 0) {
      teamClinical.member_ids = clinicalMembers.map((m) => m.id);
      teamClinical.lead_id = clinicalMembers[0].id;
      teamClinical.lead_name = clinicalMembers[0].name;
    }
    if (scienceMembers.length > 0) {
      teamScience.member_ids = scienceMembers.map((m) => m.id);
      teamScience.lead_id = scienceMembers[0].id;
      teamScience.lead_name = scienceMembers[0].name;
    }
    if (nutritionMembers.length > 0) {
      teamNutrition.member_ids = nutritionMembers.map((m) => m.id);
      teamNutrition.lead_id = nutritionMembers[0].id;
      teamNutrition.lead_name = nutritionMembers[0].name;
    }
    if (opsMembers.length > 0) {
      teamOps.member_ids = opsMembers.map((m) => m.id);
      teamOps.lead_id = opsMembers[0].id;
      teamOps.lead_name = opsMembers[0].name;
    }

    this.teams = [teamClinical, teamScience, teamOps, teamNutrition];
  }

  private saveStore() {
    try {
      localStorage.setItem("orbit_planner_tasks_v3", JSON.stringify(this.tasks));
      localStorage.setItem("orbit_planner_teams_v3", JSON.stringify(this.teams));
      localStorage.setItem("orbit_planner_members_v3", JSON.stringify(this.members));
    } catch (e) {
      console.warn("LocalStorage save error:", e);
    }
    this.notify();
  }

  public subscribe(listener: () => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notify() {
    this.listeners.forEach((l) => l());
  }

  // --- Member Methods ---
  public getMembers(): TeamMember[] {
    return [...this.members];
  }

  public addMember(member: Omit<TeamMember, "id">): TeamMember {
    const newMember: TeamMember = {
      ...member,
      id: "u_" + Date.now(),
    };
    this.members.push(newMember);
    this.saveStore();
    return newMember;
  }

  // --- Team Methods ---
  public getTeams(): TaskTeam[] {
    return [...this.teams];
  }

  public getTeamById(id: string): TaskTeam | undefined {
    return this.teams.find((t) => t.id === id);
  }

  public createTeam(teamData: Omit<TaskTeam, "id" | "created_at">): TaskTeam {
    const newTeam: TaskTeam = {
      ...teamData,
      id: "team_" + Date.now(),
      created_at: getTodayString(),
    };
    this.teams.push(newTeam);
    this.saveStore();
    return newTeam;
  }

  public updateTeam(id: string, updates: Partial<TaskTeam>): TaskTeam | undefined {
    const index = this.teams.findIndex((t) => t.id === id);
    if (index === -1) return undefined;
    this.teams[index] = { ...this.teams[index], ...updates };
    this.saveStore();
    return this.teams[index];
  }

  // --- Daily Task Methods ---
  public getTasks(dateFilter?: string): DailyTask[] {
    if (!dateFilter) return [...this.tasks];
    return this.tasks.filter((t) => {
      // 1. Direct date match (scheduled or created on this date)
      if (t.date === dateFilter) return true;

      // 2. Deadline-based task (tasks with deadlines appear everyday until deadline is reached unless completed)
      if (t.deadline) {
        const isCreatedBeforeOrOn = !t.date || t.date <= dateFilter;
        const isBeforeOrOnDeadline = dateFilter <= t.deadline;
        const isCompleted = t.status === "completed" || t.status === "approved";

        // If not completed, it appears every day between start date and deadline
        if (isCreatedBeforeOrOn && isBeforeOrOnDeadline && !isCompleted) {
          return true;
        }

        // If completed on dateFilter or on t.completed_at, display on that date
        if (isCompleted && (t.completed_at === dateFilter || (!t.completed_at && t.date === dateFilter))) {
          return true;
        }
      }

      return false;
    });
  }

  public getTaskById(id: string): DailyTask | undefined {
    return this.tasks.find((t) => t.id === id);
  }

  public addTask(taskData: Omit<DailyTask, "id" | "created_at">): DailyTask {
    const newTask: DailyTask = {
      ...taskData,
      id: "dt_" + Date.now(),
      created_at: getTodayString(),
      status: taskData.status || (taskData.requires_approval ? "under_review" : "scheduled"),
      approval_status: taskData.requires_approval ? "pending" : undefined,
    };
    this.tasks.unshift(newTask);
    this.saveStore();
    return newTask;
  }

  public updateTaskStatus(id: string, status: DailyTaskStatus): DailyTask | undefined {
    const task = this.tasks.find((t) => t.id === id);
    if (!task) return undefined;

    task.status = status;
    if (status === "under_review" && task.requires_approval) {
      task.approval_status = "pending";
    }
    if (status === "completed" || status === "approved") {
      task.completed_at = task.completed_at || getTodayString();
    }
    this.saveStore();
    return task;
  }

  public updateTask(id: string, updates: Partial<DailyTask>): DailyTask | undefined {
    const index = this.tasks.findIndex((t) => t.id === id);
    if (index === -1) return undefined;
    this.tasks[index] = { ...this.tasks[index], ...updates, updated_at: getTodayString() };
    this.saveStore();
    return this.tasks[index];
  }

  public deleteTask(id: string): boolean {
    const initialLen = this.tasks.length;
    this.tasks = this.tasks.filter((t) => t.id !== id);
    if (this.tasks.length !== initialLen) {
      this.saveStore();
      return true;
    }
    return false;
  }

  // --- Approval Workflow Methods ---
  public getPendingApprovals(): DailyTask[] {
    return this.tasks.filter(
      (t) => t.requires_approval && (t.approval_status === "pending" || t.status === "under_review")
    );
  }

  public getAllApprovals(): DailyTask[] {
    return this.tasks.filter((t) => t.requires_approval);
  }

  public approveTask(id: string, approverName: string, note?: string): DailyTask | undefined {
    const task = this.tasks.find((t) => t.id === id);
    if (!task) return undefined;

    task.approval_status = "approved";
    task.status = "approved";
    task.approval_note = note || "Approved by manager.";
    task.approver_name = approverName;
    task.reviewed_at = getTodayString();
    this.saveStore();
    return task;
  }

  public rejectTask(id: string, approverName: string, reason: string): DailyTask | undefined {
    const task = this.tasks.find((t) => t.id === id);
    if (!task) return undefined;

    task.approval_status = "rejected";
    task.status = "rejected";
    task.rejection_reason = reason;
    task.approver_name = approverName;
    task.reviewed_at = getTodayString();
    this.saveStore();
    return task;
  }
}

export const plannerStore = new PlannerStore();
