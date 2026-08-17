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

// EXACT Real Organization Employees & Staff Members
export const REAL_EMPLOYEES: TeamMember[] = [
  {
    id: "527f7a61-225d-4717-8b25-4741d195803c",
    name: "Abhishek Vadlakonda",
    role: "Admin & Operations Lead",
    department: "Administration",
    email: "abhi79111@gmail.com",
  },
  {
    id: "801cf183-1181-4b3f-bbe4-c3d7d8362fe1",
    name: "Dr. Sai Pavan K",
    role: "Sports Physician",
    department: "Clinical Medicine",
    email: "pavank@gmail.com",
  },
  {
    id: "3e7531f3-2087-4b31-8f05-2c55d40843d1",
    name: "Sai Rupesh Kavuturi",
    role: "Sports Scientist",
    department: "Sports Science",
    email: "saikavuturi24@gmail.com",
  },
  {
    id: "091b3bef-889d-439c-9460-c47b4298201b",
    name: "Ganesh B",
    role: "Nutritionist",
    department: "Clinical Nutrition",
    email: "ganeshb@gmail.com",
  },
  {
    id: "99f47c46-630a-4139-8e14-117a2d09ee5a",
    name: "Raja Prasad M",
    role: "Sports Scientist",
    department: "Biomechanics & Performance",
    email: "rajam@gmail.com",
  },
];

// EXACT Formed Functional Teams
export const REAL_TEAMS: TaskTeam[] = [
  {
    id: "team_clinical",
    name: "Clinical Medicine & Rehab Team",
    code: "CMT",
    department: "Clinical Medicine",
    description: "Responsible for medical screenings, physician consultation procedures, joint assessments, and clinical sign-offs.",
    color: "hsl(251 74% 60%)",
    lead_id: "801cf183-1181-4b3f-bbe4-c3d7d8362fe1",
    lead_name: "Dr. Sai Pavan K",
    member_ids: [
      "801cf183-1181-4b3f-bbe4-c3d7d8362fe1",
      "091b3bef-889d-439c-9460-c47b4298201b",
      "3e7531f3-2087-4b31-8f05-2c55d40843d1"
    ],
    created_at: getTodayString(),
  },
  {
    id: "team_science",
    name: "Sports Science & Biomechanics Team",
    code: "SST",
    department: "Sports Science",
    description: "Athlete VO2 max testing, force-plate biomechanics evaluations, GPS load monitoring, and conditioning plans.",
    color: "hsl(152 60% 42%)",
    lead_id: "3e7531f3-2087-4b31-8f05-2c55d40843d1",
    lead_name: "Sai Rupesh Kavuturi",
    member_ids: [
      "3e7531f3-2087-4b31-8f05-2c55d40843d1",
      "99f47c46-630a-4139-8e14-117a2d09ee5a"
    ],
    created_at: getTodayString(),
  },
  {
    id: "team_ops",
    name: "Facility Operations & Admin Team",
    code: "OAT",
    department: "Administration",
    description: "Facility readiness, equipment safety audits, staff shift coordination, and clinical operations management.",
    color: "hsl(210 72% 50%)",
    lead_id: "527f7a61-225d-4717-8b25-4741d195803c",
    lead_name: "Abhishek Vadlakonda",
    member_ids: [
      "527f7a61-225d-4717-8b25-4741d195803c",
      "99f47c46-630a-4139-8e14-117a2d09ee5a"
    ],
    created_at: getTodayString(),
  },
  {
    id: "team_nutrition",
    name: "Nutrition & Dietary Science Team",
    code: "NPT",
    department: "Clinical Nutrition",
    description: "Metabolic rate assessments, daily meal plan protocols, hydration monitoring, and body composition audits.",
    color: "hsl(32 95% 44%)",
    lead_id: "091b3bef-889d-439c-9460-c47b4298201b",
    lead_name: "Ganesh B",
    member_ids: [
      "091b3bef-889d-439c-9460-c47b4298201b",
      "801cf183-1181-4b3f-bbe4-c3d7d8362fe1"
    ],
    created_at: getTodayString(),
  },
];

// Seeded Daily Tasks assigned to REAL EMPLOYEES & REAL TEAMS
const today = getTodayString();

export const REAL_INITIAL_TASKS: DailyTask[] = [
  {
    id: "dt_real_1",
    title: "Morning Operations Briefing & Equipment Safety Check",
    description: "Review daily appointment rosters, inspect force plates, and check medical equipment calibration.",
    date: today,
    start_time: "08:30",
    end_time: "09:15",
    category: "staff_briefing",
    priority: "high",
    status: "completed",
    task_type: "group",
    assigner_id: "527f7a61-225d-4717-8b25-4741d195803c",
    assigner_name: "Abhishek Vadlakonda",
    team_id: "team_ops",
    team_name: "Facility Operations & Admin Team",
    creator_id: "527f7a61-225d-4717-8b25-4741d195803c",
    creator_name: "Abhishek Vadlakonda",
    requires_approval: false,
    created_at: today,
  },
  {
    id: "dt_real_2",
    title: "Clinical Musculoskeletal Screening & Medical Evaluation",
    description: "Perform comprehensive joint mobility assessment and physician sign-off for national athletes.",
    date: today,
    start_time: "09:30",
    end_time: "10:30",
    category: "clinical_care",
    priority: "critical",
    status: "in_progress",
    task_type: "individual",
    assigner_id: "527f7a61-225d-4717-8b25-4741d195803c",
    assigner_name: "Abhishek Vadlakonda",
    assignee_id: "801cf183-1181-4b3f-bbe4-c3d7d8362fe1",
    assignee_name: "Dr. Sai Pavan K",
    team_id: "team_clinical",
    team_name: "Clinical Medicine & Rehab Team",
    creator_id: "527f7a61-225d-4717-8b25-4741d195803c",
    creator_name: "Abhishek Vadlakonda",
    requires_approval: true,
    approver_id: "801cf183-1181-4b3f-bbe4-c3d7d8362fe1",
    approver_name: "Dr. Sai Pavan K",
    approval_status: "pending",
    created_at: today,
  },
  {
    id: "dt_real_3",
    title: "VO2 Max & Athletic Biomechanics Testing Protocol",
    description: "Conduct high-performance treadmill protocol and 3D kinematics motion capture analysis.",
    date: today,
    start_time: "11:00",
    end_time: "12:00",
    category: "rehab_evaluation",
    priority: "high",
    status: "scheduled",
    task_type: "individual",
    assigner_id: "801cf183-1181-4b3f-bbe4-c3d7d8362fe1",
    assigner_name: "Dr. Sai Pavan K",
    assignee_id: "3e7531f3-2087-4b31-8f05-2c55d40843d1",
    assignee_name: "Sai Rupesh Kavuturi",
    team_id: "team_science",
    team_name: "Sports Science & Biomechanics Team",
    creator_id: "801cf183-1181-4b3f-bbe4-c3d7d8362fe1",
    creator_name: "Dr. Sai Pavan K",
    requires_approval: true,
    approver_id: "801cf183-1181-4b3f-bbe4-c3d7d8362fe1",
    approver_name: "Dr. Sai Pavan K",
    approval_status: "pending",
    created_at: today,
  },
  {
    id: "dt_real_4",
    title: "Metabolic Rate & Customized Dietary Plan Review",
    description: "Analyze dietary logs, calculate macronutrient targets, and prepare hydration plans.",
    date: today,
    start_time: "13:30",
    end_time: "14:30",
    category: "clinical_care",
    priority: "medium",
    status: "under_review",
    task_type: "individual",
    assigner_id: "801cf183-1181-4b3f-bbe4-c3d7d8362fe1",
    assigner_name: "Dr. Sai Pavan K",
    assignee_id: "091b3bef-889d-439c-9460-c47b4298201b",
    assignee_name: "Ganesh B",
    team_id: "team_nutrition",
    team_name: "Nutrition & Dietary Science Team",
    creator_id: "801cf183-1181-4b3f-bbe4-c3d7d8362fe1",
    creator_name: "Dr. Sai Pavan K",
    requires_approval: true,
    approver_id: "801cf183-1181-4b3f-bbe4-c3d7d8362fe1",
    approver_name: "Dr. Sai Pavan K",
    approval_status: "pending",
    created_at: today,
  },
  {
    id: "dt_real_5",
    title: "Force-Plate Jump & Asymmetry Analysis",
    description: "Measure rate of force development (RFD) and leg asymmetry index post-rehabilitation.",
    date: today,
    start_time: "15:00",
    end_time: "16:00",
    category: "rehab_evaluation",
    priority: "medium",
    status: "scheduled",
    task_type: "group",
    assigner_id: "3e7531f3-2087-4b31-8f05-2c55d40843d1",
    assigner_name: "Sai Rupesh Kavuturi",
    team_id: "team_science",
    team_name: "Sports Science & Biomechanics Team",
    creator_id: "3e7531f3-2087-4b31-8f05-2c55d40843d1",
    creator_name: "Sai Rupesh Kavuturi",
    requires_approval: true,
    approver_id: "3e7531f3-2087-4b31-8f05-2c55d40843d1",
    approver_name: "Sai Rupesh Kavuturi",
    approval_status: "pending",
    created_at: today,
  },
  {
    id: "dt_real_6",
    title: "Return-to-Sport Medical Clearance Sign-Off",
    description: "Final evaluation and clearance approval for athlete return-to-competition status.",
    date: today,
    start_time: "16:30",
    end_time: "17:30",
    category: "rehab_evaluation",
    priority: "critical",
    status: "approved",
    task_type: "individual",
    assigner_id: "527f7a61-225d-4717-8b25-4741d195803c",
    assigner_name: "Abhishek Vadlakonda",
    assignee_id: "801cf183-1181-4b3f-bbe4-c3d7d8362fe1",
    assignee_name: "Dr. Sai Pavan K",
    team_id: "team_clinical",
    team_name: "Clinical Medicine & Rehab Team",
    creator_id: "801cf183-1181-4b3f-bbe4-c3d7d8362fe1",
    creator_name: "Dr. Sai Pavan K",
    requires_approval: true,
    approver_id: "801cf183-1181-4b3f-bbe4-c3d7d8362fe1",
    approver_name: "Dr. Sai Pavan K",
    approval_status: "approved",
    approval_note: "Cleared after passing 95% strength symmetry and functional hop test protocols.",
    reviewed_at: today,
    created_at: today,
  },
  {
    id: "dt_real_7",
    title: "Quarterly High-Performance Facility Audit & Compliance Report",
    description: "Inspect athlete testing labs, force plate calibration records, and submit compliance certification.",
    date: today,
    has_time_slot: false,
    deadline: (() => {
      const d = new Date();
      d.setDate(d.getDate() + 3);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    })(),
    deadline_time: "18:00",
    category: "equipment_check",
    priority: "high",
    status: "scheduled",
    task_type: "group",
    assigner_id: "527f7a61-225d-4717-8b25-4741d195803c",
    assigner_name: "Abhishek Vadlakonda",
    team_id: "team_ops",
    team_name: "Facility Operations & Admin Team",
    creator_id: "527f7a61-225d-4717-8b25-4741d195803c",
    creator_name: "Abhishek Vadlakonda",
    requires_approval: false,
    created_at: today,
  },
];

// Persistent Local Store Engine with API Syncing
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
      const savedTasks = localStorage.getItem("orbit_planner_tasks_v2");
      const savedTeams = localStorage.getItem("orbit_planner_teams_v2");
      const savedMembers = localStorage.getItem("orbit_planner_members_v2");

      this.tasks = savedTasks ? JSON.parse(savedTasks) : REAL_INITIAL_TASKS;
      this.teams = savedTeams ? JSON.parse(savedTeams) : REAL_TEAMS;
      this.members = savedMembers ? JSON.parse(savedMembers) : REAL_EMPLOYEES;
    } catch {
      this.tasks = REAL_INITIAL_TASKS;
      this.teams = REAL_TEAMS;
      this.members = REAL_EMPLOYEES;
    }
  }

  // Asynchronously sync real employees from API if running backend
  private async fetchRealEmployeesFromAPI() {
    try {
      const apiStaff = await apiFetch<any[]>("/hr/employees?role_type=clinical");
      if (Array.isArray(apiStaff) && apiStaff.length > 0) {
        const fetchedMembers: TeamMember[] = apiStaff.map((p) => ({
          id: p.id,
          name: `${p.first_name || ""} ${p.last_name || ""}`.trim() || p.email,
          role: p.profession || p.role || "Specialist",
          department: p.profession ? `${p.profession} Dept` : "Clinical",
          email: p.email,
        }));

        // Merge with existing members
        const existingIds = new Set(this.members.map((m) => m.id));
        let updated = false;

        fetchedMembers.forEach((m) => {
          if (!existingIds.has(m.id)) {
            this.members.push(m);
            updated = true;
          }
        });

        if (updated) {
          this.saveStore();
        }
      }
    } catch (e) {
      // Backend offline or fallback to seeded REAL_EMPLOYEES
    }
  }

  private saveStore() {
    try {
      localStorage.setItem("orbit_planner_tasks_v2", JSON.stringify(this.tasks));
      localStorage.setItem("orbit_planner_teams_v2", JSON.stringify(this.teams));
      localStorage.setItem("orbit_planner_members_v2", JSON.stringify(this.members));
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
