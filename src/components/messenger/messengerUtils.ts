export function formatUserRole(role?: string | null, profession?: string | null): string {
  if (profession && profession.trim()) {
    return profession.trim();
  }
  if (!role) return "Member";
  const r = role.toLowerCase().trim();
  switch (r) {
    case "sports_physician":
      return "Sports Physician";
    case "physiotherapist":
      return "Physiotherapist";
    case "sports_scientist":
      return "Sports Scientist";
    case "nutritionist":
      return "Nutritionist";
    case "coach":
      return "Coach";
    case "admin":
      return "Admin";
    case "super_admin":
      return "Super Admin";
    case "foe":
      return "Front Office Exec";
    case "hr_manager":
      return "HR Manager";
    case "athlete":
      return "Athlete";
    case "client":
      return "Client";
    case "consultant":
      return "Consultant";
    case "massage_therapist":
      return "Massage Therapist";
    default:
      return role.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  }
}

export function getRoleBadgeStyle(role?: string | null): { bg: string; text: string; border: string } {
  const r = (role || "").toLowerCase().trim();
  switch (r) {
    case "super_admin":
    case "admin":
      return { bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-200" };
    case "sports_physician":
    case "physiotherapist":
    case "consultant":
      return { bg: "bg-teal-50", text: "text-teal-700", border: "border-teal-200" };
    case "sports_scientist":
      return { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" };
    case "nutritionist":
      return { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" };
    case "coach":
      return { bg: "bg-indigo-50", text: "text-indigo-700", border: "border-indigo-200" };
    case "hr_manager":
      return { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" };
    case "foe":
      return { bg: "bg-orange-50", text: "text-orange-700", border: "border-orange-200" };
    case "athlete":
    case "client":
      return { bg: "bg-sky-50", text: "text-sky-700", border: "border-sky-200" };
    default:
      return { bg: "bg-slate-100", text: "text-slate-700", border: "border-slate-200" };
  }
}
