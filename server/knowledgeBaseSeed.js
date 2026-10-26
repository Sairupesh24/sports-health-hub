/**
 * ISHPO Knowledge Base Seed Data
 * Integrated Sports Health and Physio Operating System
 *
 * Folder Directory Structure:
 * 1. Set-up, Sign-up and Log-in
 *    1.1 Set-up
 *        1.1.1 Hardware & Browser Requirements
 *        1.1.2 Clinic Workspace & Initial Configuration
 *    1.2 Sign-up
 *        1.2.1 Staff & Athlete Invitations
 *        1.2.2 Role Assignment & Permissions
 *    1.3 Log-in
 *        1.3.1 Secure Authentication & Multi-Role Access
 *        1.3.2 Password Reset & Session Security
 * 2. Front Office Executive (FOE) & Reception
 *    2.1 Patient & Athlete Intake
 *        2.1.1 UHID Generation & Demographics
 *        2.1.2 Emergency Contacts & Sport Tagging
 *    2.2 Appointment Booking & Queue
 *        2.2.1 Practitioner Calendar Scheduling
 *        2.2.2 Waiting Lounge Check-In & Live Queue
 *    2.3 Fast Billing & Invoicing
 *        2.3.1 Consultation & Service Billing
 *        2.3.2 Payment Modes & PDF Receipts
 * 3. Clinical Case Sheet & Physical Therapy
 *    3.1 Subjective Assessment
 *        3.1.1 Chief Complaint & Onset Mechanism
 *        3.1.2 VAS Pain Scale & Symptom History
 *    3.2 Objective Examination
 *        3.2.1 Interactive Anatomical Body Highlighter (2D/3D)
 *        3.2.2 Range of Motion (ROM) & Goniometry
 *        3.2.3 Manual Muscle Testing (MMT) & Special Tests
 *    3.3 Treatment & Rehab Protocols
 *        3.3.1 Clinical Interventions & Modalities
 *        3.3.2 Home Exercise Program (HEP) Delivery
 * 4. Sports Science & High-Performance Testing
 *    4.1 Force Plate Testing & Jump Batteries
 *        4.1.1 Countermovement Jump (CMJ) & RSI
 *        4.1.2 Bilateral Asymmetry & Landing Mechanics
 *    4.2 Speed, Agility & Conditioning
 *        4.2.1 Timing Gate Sprints (10m, 20m, 30m)
 *        4.2.2 Agility Tests (5-0-5, Pro Agility)
 *    4.3 Dynamometry & Return-to-Play Norms
 *        4.3.1 Isometric Peak Torque
 *        4.3.2 Return-to-Play Clearance Thresholds
 * 5. Athlete Management System (AMS) & Load Monitoring
 *    5.1 Daily Athlete Readiness & Wellness
 *        5.1.1 Morning Wellness Questionnaires
 *        5.1.2 Traffic-Light Readiness Indicators
 *    5.2 Training Load Monitoring
 *        5.2.1 Session RPE & Total Workload
 *        5.2.2 Acute:Chronic Workload Ratio (ACWR)
 *    5.3 Workout Builder & Periodization
 *        5.3.1 Exercise Library & Prescription
 *        5.3.2 Real-Time Session Execution
 * 6. Sports Nutrition & Dietary Management
 *    6.1 Body Composition & Caloric Targets
 *        6.1.1 Skinfold & Bio-impedance Assessments
 *        6.1.2 Macronutrient Distribution (P/C/F)
 *    6.2 Meal Planning & Supplements
 *        6.2.1 Periodized Fueling Templates
 *        6.2.2 Anti-Doping (WADA) Compliance
 * 7. HRMS, Attendance & Permissions
 *    7.1 Staff Attendance & Duty Logs
 *        7.1.1 Clock-In, Clock-Out & Clinical Duty
 *        7.1.2 Work Presence & Session Verification
 *    7.2 Leave Management & Rostering
 *        7.2.1 Leave Applications & Approvals
 *        7.2.2 Staff Shift Planning
 *    7.3 Role Permissions & Access Control
 *        7.3.1 Granular Feature Permissions
 *        7.3.2 Granting & Revoking KB Editor Access
 * 8. OrbitFlow & Team Collaboration
 *    8.1 Task Management & Milestones
 *        8.1.1 OrbitFlow Board & Clinical Handoffs
 *        8.1.2 Task Assignments & Deadlines
 *    8.2 TeamComms Messenger
 *        8.2.1 Channels & Direct Messages
 *        8.2.2 Athlete Communications
 * 9. Administration & Security
 *    9.1 Multi-Tenant Organization Isolation
 *        9.1.1 Workspace Setup & Branding
 *    9.2 Audit Logs & Version Control
 *        9.2.1 Immutable Audit Log Inspection
 *        9.2.2 Knowledge Base Drafting, Publishing & Revisions
 */

export const DEFAULT_KB_ARTICLES = [
  // ==========================================
  // TOPIC 1: Set-up, Sign-up and Log-in
  // ==========================================
  {
    id: "kb-1-setup-signup-login",
    section_number: "1",
    parent_id: null,
    category: "getting_started",
    title: "Set-up, Sign-up and Log-in",
    description: "Master onboarding guide for ISHPO: system prerequisites, staff invitations, and secure authentication.",
    module_href: "/login",
    sort_order: 10,
    is_published: true,
    tags: ["setup", "signup", "login", "authentication"],
    content: `
<h1>1. Set-up, Sign-up and Log-in</h1>
<p class="lead">Welcome to the <strong>ISHPO</strong> (<em>Integrated Sports Health and Physio Operating System</em>) onboarding manual. This chapter provides foundational instructions for configuring your clinic environment, inviting multidisciplinary staff, and logging in securely.</p>

<div class="p-4 my-4 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-900">
  <p class="font-medium text-sm">💡 Quick Navigation</p>
  <p class="text-sm">Use the left directory to jump into specific sub-topics: <strong>1.1 Set-up</strong> (hardware & workspace setup), <strong>1.2 Sign-up</strong> (staff invites & role assignment), and <strong>1.3 Log-in</strong> (credentials & password recovery).</p>
</div>

<h3>Chapter Overview</h3>
<ul>
  <li><strong>1.1 Set-up:</strong> Review network bandwidth recommendations, supported modern browsers (Chrome, Edge, Safari, Firefox), and initial clinic tenant settings.</li>
  <li><strong>1.2 Sign-up:</strong> How administrators invite orthopedic doctors, physiotherapists, S&amp;C coaches, and front desk executives.</li>
  <li><strong>1.3 Log-in:</strong> Accessing your role-tailored workspace with multi-disciplinary routing, session presence tracking, and password reset flows.</li>
</ul>
    `
  },
  {
    id: "kb-1-1-setup",
    section_number: "1.1",
    parent_id: "kb-1-setup-signup-login",
    category: "getting_started",
    title: "Set-up",
    description: "Technical prerequisites, workstation setup, display resolutions, and browser compatibility.",
    module_href: "/app-gallery",
    sort_order: 11,
    is_published: true,
    tags: ["setup", "workstation", "browsers", "compatibility"],
    content: `
<h1>1.1 Set-up</h1>
<p class="lead">Preparing your sports institute or physiotherapy clinic hardware and network for optimal ISHPO responsiveness.</p>

<hr/>

<h3>Key Requirements for High-Performance Clinical Use</h3>
<p>ISHPO is engineered as a cloud-native, high-frequency web application that powers real-time anatomical 3D mapping, high-speed sprint timing gate imports, and live appointment queues:</p>
<ul>
  <li><strong>Workstations &amp; Tablets:</strong> Modern desktop PCs, laptops, iPads, or Android tablets with at least 4GB RAM (8GB recommended for simultaneous 3D body rendering and force plate graphing).</li>
  <li><strong>Recommended Browsers:</strong> Google Chrome (v110+), Microsoft Edge (v110+), Safari (v16+), or Mozilla Firefox (v115+). Chromium-based browsers offer the highest WebGL and Canvas performance.</li>
  <li><strong>Network Bandwidth:</strong> A stable broadband or 5G connection with minimum 10 Mbps download and 5 Mbps upload per clinic branch.</li>
</ul>

<div class="p-4 my-4 rounded-lg bg-slate-50 border border-slate-200">
  <h4 class="font-semibold text-slate-800">Next Steps:</h4>
  <p class="text-sm text-slate-600">Proceed to <strong>1.1.1 Hardware & Browser Requirements</strong> for full specs or <strong>1.1.2 Clinic Workspace Setup</strong> to configure clinic branding.</p>
</div>
    `
  },
  {
    id: "kb-1-1-1-hardware-browsers",
    section_number: "1.1.1",
    parent_id: "kb-1-1-setup",
    category: "getting_started",
    title: "Hardware & Browser Requirements",
    description: "Detailed hardware specifications, tablet touchscreen support, and browser GPU acceleration.",
    module_href: "/app-gallery",
    sort_order: 12,
    is_published: true,
    tags: ["hardware", "browsers", "gpu", "touchscreen"],
    content: `
<h1>1.1.1 Hardware & Browser Requirements</h1>
<p class="lead">Detailed technical specification sheet for clinic workstations, consultation rooms, and athletic testing labs.</p>

<hr/>

<h3>1. Consultation Room & Front Desk Terminals</h3>
<p>For Front Office Executives (FOE) and clinical doctors:</p>
<table class="w-full border-collapse border border-slate-200 my-4 text-sm">
  <thead class="bg-slate-100">
    <tr>
      <th class="border border-slate-200 p-2 text-left">Component</th>
      <th class="border border-slate-200 p-2 text-left">Minimum Specification</th>
      <th class="border border-slate-200 p-2 text-left">Recommended</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td class="border border-slate-200 p-2 font-medium">Processor (CPU)</td>
      <td class="border border-slate-200 p-2">Intel Core i3 / AMD Ryzen 3</td>
      <td class="border border-slate-200 p-2">Intel Core i5 / Apple M1 or higher</td>
    </tr>
    <tr>
      <td class="border border-slate-200 p-2 font-medium">System Memory (RAM)</td>
      <td class="border border-slate-200 p-2">4 GB</td>
      <td class="border border-slate-200 p-2">8 GB – 16 GB</td>
    </tr>
    <tr>
      <td class="border border-slate-200 p-2 font-medium">Screen Resolution</td>
      <td class="border border-slate-200 p-2">1366 x 768 px</td>
      <td class="border border-slate-200 p-2">1920 x 1080 (Full HD) or 2K Retina</td>
    </tr>
    <tr>
      <td class="border border-slate-200 p-2 font-medium">Peripherals</td>
      <td class="border border-slate-200 p-2">Standard Keyboard &amp; Mouse</td>
      <td class="border border-slate-200 p-2">Touchscreen Display / Stylus Pen for pain mapping</td>
    </tr>
  </tbody>
</table>

<hr/>

<h3>2. Browser Settings & GPU Acceleration</h3>
<p>To ensure fluid 60 FPS transitions during interactive body mapping and sports testing chart rendering:</p>
<ol>
  <li>Open your Chrome or Edge browser settings (<code>chrome://settings/system</code>).</li>
  <li>Ensure <strong>"Use graphics acceleration when available"</strong> is toggled <strong>ON</strong>.</li>
  <li>Ensure JavaScript and LocalStorage cookies are enabled for your clinic's ISHPO domain.</li>
</ol>
    `
  },
  {
    id: "kb-1-1-2-clinic-workspace-setup",
    section_number: "1.1.2",
    parent_id: "kb-1-1-setup",
    category: "getting_started",
    title: "Clinic Workspace & Initial Configuration",
    description: "Configuring organization profile, official clinic logo, invoice headers, and business hours.",
    module_href: "/admin/settings",
    sort_order: 13,
    is_published: true,
    tags: ["workspace", "settings", "logo", "invoicing"],
    content: `
<h1>1.1.2 Clinic Workspace & Initial Configuration</h1>
<p class="lead">Customizing your organization profile, official logos, tax registration, and clinic operational hours.</p>

<hr/>

<h3>Step 1: Accessing Organization Settings</h3>
<p>Only users with <strong>Admin</strong> or <strong>Super Admin</strong> roles can edit global organization settings:</p>
<ol>
  <li>Navigate to the left navigation bar and click <strong>Settings</strong> (or go to <code>/admin/settings</code>).</li>
  <li>Select the <strong>Organization Profile</strong> tab.</li>
  <li>Enter the legal name of your Sports Institute or Clinic, Tax / GST ID, Contact Email, and Clinic Phone.</li>
</ol>

<hr/>

<h3>Step 2: Uploading Clinic Branding & Invoicing Header</h3>
<p>The logo uploaded here appears automatically on athlete receipts, clinical referral letters, and PDF testing battery reports:</p>
<ul>
  <li><strong>File Formats:</strong> PNG, SVG, or high-res JPG.</li>
  <li><strong>Dimensions:</strong> 400x120px transparent background recommended.</li>
  <li>Click <strong>Save Changes</strong> to immediately propagate branding across all staff workstations.</li>
</ul>
    `
  },
  {
    id: "kb-1-2-signup",
    section_number: "1.2",
    parent_id: "kb-1-setup-signup-login",
    category: "getting_started",
    title: "Sign-up",
    description: "Staff onboarding workflows, athlete registration, and role assignment overview.",
    module_href: "/admin/users",
    sort_order: 14,
    is_published: true,
    tags: ["signup", "invitation", "staff", "onboarding"],
    content: `
<h1>1.2 Sign-up</h1>
<p class="lead">How administrators provision accounts for clinical specialists, sports scientists, administrative staff, and athletes.</p>

<hr/>

<h3>Account Provisioning Model in ISHPO</h3>
<p>To maintain medical confidentiality and sports team data integrity, ISHPO utilizes an <strong>Enterprise Invitation-Driven Sign-up Model</strong>:</p>
<ul>
  <li>Staff members do not register publicly; instead, an Administrator or HR Manager issues an invitation from <strong>Console Access / User Management</strong>.</li>
  <li>Each invitee receives an activation link containing their temporary credentials or email verification token.</li>
  <li>Athletes are either onboarded directly by Front Desk executives or synced via squad rosters in the Athlete Management System (AMS).</li>
</ul>
    `
  },
  {
    id: "kb-1-2-1-staff-athlete-invitations",
    section_number: "1.2.1",
    parent_id: "kb-1-2-signup",
    category: "getting_started",
    title: "Staff & Athlete Invitations",
    description: "Step-by-step instructions for sending email invitations, bulk imports, and welcome onboarding.",
    module_href: "/admin/users",
    sort_order: 15,
    is_published: true,
    tags: ["invitations", "email", "staff", "athletes"],
    content: `
<h1>1.2.1 Staff & Athlete Invitations</h1>
<p class="lead">Issuing single or bulk invitations to medical practitioners, performance staff, and athletes.</p>

<hr/>

<h3>Step 1: Open User Management</h3>
<ol>
  <li>Navigate to <strong>Settings → Console Access</strong> (<code>/admin/settings/console-access</code>).</li>
  <li>Click the <strong>+ Invite Staff Member</strong> button in the top-right toolbar.</li>
</ol>

<hr/>

<h3>Step 2: Enter Profile Details</h3>
<ul>
  <li><strong>Full Name:</strong> First name and surname.</li>
  <li><strong>Work Email:</strong> Official clinic or organization email address.</li>
  <li><strong>Primary Department:</strong> Clinical, Sports Science, Strength &amp; Conditioning, Nutrition, Front Desk, or Administration.</li>
  <li><strong>Clinical Designation / Specialty:</strong> e.g., Senior Sports Physiotherapist, High-Performance Director.</li>
</ul>

<hr/>

<h3>Step 3: Send Invitation & Verification</h3>
<p>Click <strong>Send Invitation</strong>. An automated onboarding email containing secure login instructions is immediately delivered to the recipient.</p>
    `
  },
  {
    id: "kb-1-2-2-role-assignment-permissions",
    section_number: "1.2.2",
    parent_id: "kb-1-2-signup",
    category: "getting_started",
    title: "Role Assignment & Permissions",
    description: "Configuring granular role matrices: Clinical, FOE, Sports Scientist, Nutritionist, and KB Editor.",
    module_href: "/admin/settings/console-access",
    sort_order: 16,
    is_published: true,
    tags: ["roles", "permissions", "rbac", "security"],
    content: `
<h1>1.2.2 Role Assignment & Permissions</h1>
<p class="lead">Configuring Role-Based Access Control (RBAC) to ensure each practitioner accesses precisely what they need.</p>

<hr/>

<h3>Core System Roles in ISHPO</h3>
<ul>
  <li><strong>Super Admin:</strong> Full tenant provisioning, database migration management, and system-wide audit ledger access.</li>
  <li><strong>Admin / Practice Manager:</strong> Billing management, client group configuration, staff duty rosters, and full console management.</li>
  <li><strong>Physiotherapist / Sports Physician:</strong> Subjective/objective case sheets, 2D/3D body highlighter, ROM/MMT documentation, and HEP video prescriptions.</li>
  <li><strong>Sports Scientist:</strong> High-performance testing batteries (CMJ force plate, timing gate sprints, isokinetic dynamometry, and fatigue reports).</li>
  <li><strong>Front Office Executive (FOE):</strong> Patient intake, calendar appointment booking, fast billing, and waiting lounge queue management.</li>
  <li><strong>Sports Nutritionist:</strong> Body composition (skinfold/BIA), macro allocation, and fueling templates.</li>
  <li><strong>Knowledge Base Editor:</strong> Special toggle permitting authoring, updating, and publishing guides in this Knowledge Base.</li>
</ul>
    `
  },
  {
    id: "kb-1-3-login",
    section_number: "1.3",
    parent_id: "kb-1-setup-signup-login",
    category: "getting_started",
    title: "Log-in",
    description: "Logging into your account, workspace selection, session tracking, and sign-out protocols.",
    module_href: "/login",
    sort_order: 17,
    is_published: true,
    tags: ["login", "credentials", "session", "signout"],
    content: `
<h1>1.3 Log-in</h1>
<p class="lead">Secure authentication workflow, session presence tracking, and multi-disciplinary landing routing.</p>

<hr/>

<h3>Logging In</h3>
<ol>
  <li>Visit your clinic's ISHPO portal URL (e.g., <code>http://localhost:3001/login</code>).</li>
  <li>Enter your registered email address (e.g. <code>abhi79111@gmail.com</code>).</li>
  <li>Enter your confidential password.</li>
  <li>Click <strong>Sign In to ISHPO</strong>.</li>
</ol>
<p>Upon authentication, ISHPO automatically verifies your active roles and presents your tailored dashboard or the universal <strong>App Gallery</strong> launchpad.</p>
    `
  },
  {
    id: "kb-1-3-1-secure-authentication",
    section_number: "1.3.1",
    parent_id: "kb-1-3-login",
    category: "getting_started",
    title: "Secure Authentication & Multi-Role Access",
    description: "Multi-role navigation, automatic session renewal, JWT security, and duty presence indicators.",
    module_href: "/login",
    sort_order: 18,
    is_published: true,
    tags: ["security", "jwt", "presence", "multi-role"],
    content: `
<h1>1.3.1 Secure Authentication & Multi-Role Access</h1>
<p class="lead">Understanding how ISHPO handles tokens, role switching, and real-time practitioner presence tracking.</p>

<hr/>

<h3>Practitioner Presence & Live Status</h3>
<p>When you log in, your presence is broadcast to the front desk reception console:</p>
<ul>
  <li><strong>Green Live Pulse:</strong> Indicates you are currently active on the clinic floor and available to accept waiting patients.</li>
  <li><strong>Session Timeout:</strong> For HIPAA and medical privacy compliance, sessions automatically lock after periods of inactivity.</li>
  <li><strong>Role Switching:</strong> Users with multiple credentials (e.g., Clinical Lead + Admin) can seamlessly toggle their active view from the top-right profile avatar.</li>
</ul>
    `
  },
  {
    id: "kb-1-3-2-password-reset-recovery",
    section_number: "1.3.2",
    parent_id: "kb-1-3-login",
    category: "getting_started",
    title: "Password Reset & Session Security",
    description: "Self-service password recovery, admin password resets, and session termination.",
    module_href: "/login",
    sort_order: 19,
    is_published: true,
    tags: ["password", "recovery", "security", "reset"],
    content: `
<h1>1.3.2 Password Reset & Session Security</h1>
<p class="lead">Procedures for recovering forgotten passwords and securely resetting staff credentials.</p>

<hr/>

<h3>Self-Service Password Reset</h3>
<ol>
  <li>On the login screen (<code>/login</code>), click the <strong>Forgot Password?</strong> link.</li>
  <li>Enter your registered email address.</li>
  <li>Check your inbox for a 6-digit verification code or secure reset link.</li>
  <li>Set a strong password containing at least 8 characters, one number, and one uppercase letter.</li>
</ol>

<hr/>

<h3>Administrative Password Reset</h3>
<p>If a practitioner is locked out or has lost email access, an Administrator can navigate to <strong>Settings → Console Access</strong>, select the user's profile, and click <strong>Issue Temporary Password</strong>.</p>
    `
  },

  // ==========================================
  // TOPIC 2: Front Office Executive (FOE) & Reception
  // ==========================================
  {
    id: "kb-2-foe-reception",
    section_number: "2",
    parent_id: null,
    category: "foe",
    title: "Front Office Executive (FOE) & Reception",
    description: "Complete operations manual for front desk staff: arrivals, scheduling, fast invoicing, and queue management.",
    module_href: "/admin/foe",
    sort_order: 20,
    is_published: true,
    tags: ["foe", "front desk", "reception", "appointments", "billing"],
    content: `
<h1>2. Front Office Executive (FOE) & Reception</h1>
<p class="lead">The Front Office Console is the operational nerve center of the clinic, managing athlete check-ins, multi-specialist calendars, walk-in billing, and waiting room flow.</p>

<hr/>

<h3>Sub-Topics in this Chapter</h3>
<ul>
  <li><strong>2.1 Patient &amp; Athlete Intake:</strong> UHID generation, emergency contacts, medical disclosures, and primary sports tagging.</li>
  <li><strong>2.2 Appointment Booking &amp; Queue:</strong> Live calendar grid, practitioner scheduling, and waiting lounge queue updates.</li>
  <li><strong>2.3 Fast Billing &amp; Invoicing:</strong> Generating receipts, package redemptions, and handling UPI, Card, and Cash transactions.</li>
</ul>
    `
  },
  {
    id: "kb-2-1-patient-intake",
    section_number: "2.1",
    parent_id: "kb-2-foe-reception",
    category: "foe",
    title: "Patient & Athlete Intake",
    description: "Creating client records, capturing contact info, and tagging sports disciplines.",
    module_href: "/admin/foe",
    sort_order: 21,
    is_published: true,
    tags: ["intake", "uhid", "registration", "patient"],
    content: `
<h1>2.1 Patient & Athlete Intake</h1>
<p class="lead">SOP for onboarding new athletes and private patients into ISHPO with unique health identifiers (UHID).</p>

<hr/>

<h3>Intake Workflow</h3>
<ol>
  <li>Open the <strong>Front Desk Console</strong> (<code>/admin/foe</code>).</li>
  <li>Click <strong>+ Register New Client</strong>.</li>
  <li>Capture personal information: Name, Mobile, Email, Date of Birth, Gender, and Blood Group.</li>
  <li>Tag primary sport (e.g. Badminton, Football, Tennis) and playing level (Recreational, State, Elite).</li>
  <li>Save to automatically generate a permanent medical UHID.</li>
</ol>
    `
  },
  {
    id: "kb-2-2-appointment-booking",
    section_number: "2.2",
    parent_id: "kb-2-foe-reception",
    category: "foe",
    title: "Appointment Booking & Queue",
    description: "Managing doctor, physio, and trainer appointment slots, check-in status, and waiting times.",
    module_href: "/admin/foe",
    sort_order: 22,
    is_published: true,
    tags: ["booking", "calendar", "queue", "scheduling"],
    content: `
<h1>2.2 Appointment Booking & Queue</h1>
<p class="lead">Managing multi-specialist booking grids, slot durations, and waiting lounge flow.</p>

<hr/>

<h3>Checking in Arrived Patients</h3>
<p>When an athlete arrives at reception:</p>
<ul>
  <li>Locate their appointment in the <strong>Today's Schedule</strong> list.</li>
  <li>Click the green <strong>Check-In</strong> button.</li>
  <li>The athlete's card immediately transitions to <strong>Waiting</strong>, alerting the assigned therapist.</li>
</ul>
    `
  },
  {
    id: "kb-2-3-fast-billing",
    section_number: "2.3",
    parent_id: "kb-2-foe-reception",
    category: "foe",
    title: "Fast Billing & Invoicing",
    description: "Creating consultation invoices, processing payment methods, and generating PDF receipts.",
    module_href: "/admin/billing",
    sort_order: 23,
    is_published: true,
    tags: ["billing", "invoicing", "receipts", "payments"],
    content: `
<h1>2.3 Fast Billing & Invoicing</h1>
<p class="lead">Rapid point-of-sale invoicing for consultations, recovery sessions, and athletic testing packages.</p>

<hr/>

<h3>Billing Procedure</h3>
<ol>
  <li>Click <strong>Invoice Patient</strong> from the check-in list or open <strong>Billing</strong>.</li>
  <li>Select items: Initial Physio Assessment, Normatec Session, or CMJ Testing Battery.</li>
  <li>Choose payment method: <strong>UPI QR code</strong>, <strong>Card Swipe</strong>, <strong>Cash</strong>, or <strong>Corporate Sponsor</strong>.</li>
  <li>Click <strong>Complete &amp; Print Receipt</strong> to trigger receipt generation.</li>
</ol>
    `
  },

  // ==========================================
  // TOPIC 3: Clinical Case Sheet & Physical Therapy
  // ==========================================
  {
    id: "kb-3-clinical-physio",
    section_number: "3",
    parent_id: null,
    category: "clinical",
    title: "Clinical Case Sheet & Physical Therapy",
    description: "Medical documentation protocols: 2D/3D injury mapping, objective ROM/MMT testing, and rehab plans.",
    module_href: "/consultant",
    sort_order: 30,
    is_published: true,
    tags: ["clinical", "physio", "case sheet", "rom", "mmt"],
    content: `
<h1>3. Clinical Case Sheet & Physical Therapy</h1>
<p class="lead">Comprehensive clinical electronic health record system specifically tailored for sports physicians and physiotherapists.</p>

<hr/>

<h3>Sub-Topics in this Chapter</h3>
<ul>
  <li><strong>3.1 Subjective Assessment:</strong> Documenting chief complaint, VAS pain scale, and injury mechanisms.</li>
  <li><strong>3.2 Objective Examination:</strong> Interactive anatomical body mapping, Range of Motion (ROM), and Manual Muscle Testing (MMT).</li>
  <li><strong>3.3 Treatment &amp; Rehab Protocols:</strong> Modalities, manual therapy, dry needling, and Home Exercise Programs (HEP).</li>
</ul>
    `
  },
  {
    id: "kb-3-1-subjective-assessment",
    section_number: "3.1",
    parent_id: "kb-3-clinical-physio",
    category: "clinical",
    title: "Subjective Assessment",
    description: "Documenting chief complaints, pain trajectory, aggravating factors, and previous surgical history.",
    module_href: "/consultant",
    sort_order: 31,
    is_published: true,
    tags: ["subjective", "pain", "vas", "complaint"],
    content: `
<h1>3.1 Subjective Assessment</h1>
<p class="lead">Capturing the athlete's symptom story, traumatic vs. atraumatic onset, and 24-hour pain behavior.</p>

<hr/>

<h3>Documenting History</h3>
<ul>
  <li><strong>Chief Complaint:</strong> Primary functional limitation (e.g. inability to decelerate without anterior knee pain).</li>
  <li><strong>VAS Pain Scale:</strong> Quantitative score from 0 (no pain) to 10 (unbearable pain) at rest vs. sport loading.</li>
  <li><strong>Mechanism of Injury:</strong> Contact tackle, non-contact pivot, overuse spike.</li>
</ul>
    `
  },
  {
    id: "kb-3-2-objective-examination",
    section_number: "3.2",
    parent_id: "kb-3-clinical-physio",
    category: "clinical",
    title: "Objective Examination & Anatomical Mapping",
    description: "Interactive body highlighter, ROM goniometry, MMT grades, and special orthopedic tests.",
    module_href: "/consultant",
    sort_order: 32,
    is_published: true,
    tags: ["objective", "body mapping", "rom", "mmt", "goniometry"],
    content: `
<h1>3.2 Objective Examination & Anatomical Mapping</h1>
<p class="lead">Medical-grade physical assessment with 2D/3D muscle and joint highlighting.</p>

<hr/>

<h3>Interactive Body Highlighter</h3>
<ol>
  <li>Select anatomical view: <strong>Anterior</strong>, <strong>Posterior</strong>, or <strong>Lateral</strong>.</li>
  <li>Click on the specific muscle belly or joint capsule (e.g., Right Hamstring - Biceps Femoris).</li>
  <li>The segment highlights in real-time and auto-populates the anatomical region tag.</li>
</ol>

<hr/>

<h3>ROM & MMT Documentation</h3>
<ul>
  <li><strong>ROM:</strong> Active vs Passive joint angles in degrees, noting end-feel (empty, firm, boney).</li>
  <li><strong>MMT:</strong> Standard Medical Research Council grades 0 to 5.</li>
</ul>
    `
  },
  {
    id: "kb-3-3-treatment-rehab-protocols",
    section_number: "3.3",
    parent_id: "kb-3-clinical-physio",
    category: "clinical",
    title: "Treatment & Rehabilitation Protocols",
    description: "Prescribing clinical interventions, electrotherapy, dry needling, and video HEP programs.",
    module_href: "/consultant",
    sort_order: 33,
    is_published: true,
    tags: ["treatment", "rehab", "hep", "modalities"],
    content: `
<h1>3.3 Treatment & Rehabilitation Protocols</h1>
<p class="lead">Structuring rehabilitation phases from acute protection to return-to-play clearance.</p>

<hr/>

<h3>Modalities & Home Exercise Programs</h3>
<ul>
  <li><strong>In-Clinic Interventions:</strong> Joint mobilization, myofascial release, dry needling, TECAR therapy.</li>
  <li><strong>HEP Delivery:</strong> Select exercise videos from the ISHPO exercise library and dispatch directly to the athlete's client portal.</li>
</ul>
    `
  },

  // ==========================================
  // TOPIC 4: Sports Science & High-Performance Testing
  // ==========================================
  {
    id: "kb-4-sports-science",
    section_number: "4",
    parent_id: null,
    category: "sports_scientist",
    title: "Sports Science & High-Performance Testing",
    description: "Standard operating procedures for force plates, timing gates, dynamometry, and normative scoring.",
    module_href: "/sports-scientist",
    sort_order: 40,
    is_published: true,
    tags: ["sports science", "force plate", "cmj", "sprints", "dynamometry"],
    content: `
<h1>4. Sports Science & High-Performance Testing</h1>
<p class="lead">Protocol directory for physiological testing batteries, power diagnostics, and neuromuscular fatigue tracking.</p>

<hr/>

<h3>Sub-Topics in this Chapter</h3>
<ul>
  <li><strong>4.1 Force Plate Testing &amp; Jump Batteries:</strong> Countermovement Jump (CMJ), Reactive Strength Index (RSI), and asymmetry.</li>
  <li><strong>4.2 Speed, Agility &amp; Conditioning:</strong> Optical timing gates (10m/20m/30m splits) and change-of-direction testing.</li>
  <li><strong>4.3 Dynamometry &amp; Return-to-Play Norms:</strong> Isometric peak force and limb symmetry indexes (LSI).</li>
</ul>
    `
  },
  {
    id: "kb-4-1-force-plates-cmj",
    section_number: "4.1",
    parent_id: "kb-4-sports-science",
    category: "sports_scientist",
    title: "Force Plate Testing & Jump Batteries",
    description: "Countermovement Jump (CMJ), squat jump, RSI, and bilateral asymmetry calculations.",
    module_href: "/sports-scientist",
    sort_order: 41,
    is_published: true,
    tags: ["force plates", "cmj", "rsi", "asymmetry"],
    content: `
<h1>4.1 Force Plate Testing & Jump Batteries</h1>
<p class="lead">Executing standardized vertical jump assessments on dual uniaxial/triaxial force plates.</p>

<hr/>

<h3>Testing Protocol</h3>
<ol>
  <li>Ensure athlete is warmed up with dynamic mobility drills.</li>
  <li>Athlete steps onto plates with hands placed firmly on hips to eliminate arm swing variance.</li>
  <li>On cue, execute a rapid countermovement jump with maximum vertical intent.</li>
  <li>Review jump height (flight time vs impulse-momentum), Reactive Strength Index Modified (RSImod), and peak landing force asymmetry.</li>
</ol>
    `
  },
  {
    id: "kb-4-2-sprint-timing-gates",
    section_number: "4.2",
    parent_id: "kb-4-sports-science",
    category: "sports_scientist",
    title: "Speed, Agility & Conditioning Batteries",
    description: "Infrared timing gate setups, 10m/20m/30m splits, 5-0-5 agility, and pro agility batteries.",
    module_href: "/sports-scientist",
    sort_order: 42,
    is_published: true,
    tags: ["sprint", "timing gates", "agility", "speed"],
    content: `
<h1>4.2 Speed, Agility & Conditioning Batteries</h1>
<p class="lead">SOP for setting up dual-beam infrared timing gates and logging split times.</p>

<hr/>

<h3>Sprint Battery Setup</h3>
<ul>
  <li>Position timing gates at 0m, 10m, 20m, and 30m at hip height (0.8m – 1.0m from track surface).</li>
  <li>Athlete starts 50cm behind the 0m beam from a static 2-point stance.</li>
  <li>Run 3 trials with 3 minutes rest between repetitions; system auto-records the best and average times.</li>
</ul>
    `
  },

  // ==========================================
  // TOPIC 5: Athlete Management System (AMS)
  // ==========================================
  {
    id: "kb-5-ams-athlete-management",
    section_number: "5",
    parent_id: null,
    category: "ams",
    title: "Athlete Management System (AMS) & Load Monitoring",
    description: "Daily wellness surveys, training load calculations (ACWR), and periodized workout builders.",
    module_href: "/ams",
    sort_order: 50,
    is_published: true,
    tags: ["ams", "readiness", "wellness", "acwr", "workout builder"],
    content: `
<h1>5. Athlete Management System (AMS) & Load Monitoring</h1>
<p class="lead">Centralized hub for monitoring daily squad wellness, tracking internal and external training loads, and building workout sessions.</p>

<hr/>

<h3>Sub-Topics in this Chapter</h3>
<ul>
  <li><strong>5.1 Daily Athlete Readiness:</strong> Sleep quality, muscle soreness, stress levels, and readiness traffic lights.</li>
  <li><strong>5.2 Training Load &amp; sRPE:</strong> Session RPE calculations, weekly load volume, and Acute:Chronic Workload Ratios (ACWR).</li>
  <li><strong>5.3 Workout Builder &amp; Periodization:</strong> Building strength sessions, set/rep schemes, and periodized training cycles.</li>
</ul>
    `
  },
  {
    id: "kb-5-1-daily-readiness-wellness",
    section_number: "5.1",
    parent_id: "kb-5-ams-athlete-management",
    category: "ams",
    title: "Daily Athlete Readiness & Wellness",
    description: "Questionnaires for sleep, fatigue, soreness, and traffic-light readiness categorization.",
    module_href: "/ams",
    sort_order: 51,
    is_published: true,
    tags: ["wellness", "readiness", "questionnaire", "fatigue"],
    content: `
<h1>5.1 Daily Athlete Readiness & Wellness</h1>
<p class="lead">Capturing morning subjective wellness to prevent non-functional overreaching and reduce soft-tissue injury risk.</p>

<hr/>

<h3>Readiness Scoring</h3>
<p>Athletes complete their check-in via mobile portal prior to morning training:</p>
<ul>
  <li><span class="inline-block w-3 h-3 rounded-full bg-emerald-500 mr-2"></span><strong>Green (Score 80–100%):</strong> Fully cleared for full volume and high-intensity match practice.</li>
  <li><span class="inline-block w-3 h-3 rounded-full bg-amber-500 mr-2"></span><strong>Amber (Score 60–79%):</strong> Elevated fatigue or localized soreness; modify high-speed running volume.</li>
  <li><span class="inline-block w-3 h-3 rounded-full bg-rose-500 mr-2"></span><strong>Red (Score &lt; 60%):</strong> Significant fatigue or acute pain; refer to medical room for clinical review.</li>
</ul>
    `
  },
  {
    id: "kb-5-2-training-load-acwr",
    section_number: "5.2",
    parent_id: "kb-5-ams-athlete-management",
    category: "ams",
    title: "Training Load & sRPE Monitoring",
    description: "Session RPE, Arbitrary Units (AU), and Acute:Chronic Workload Ratio sweet spots.",
    module_href: "/ams",
    sort_order: 52,
    is_published: true,
    tags: ["load", "srpe", "acwr", "monitoring"],
    content: `
<h1>5.2 Training Load & sRPE Monitoring</h1>
<p class="lead">Quantifying internal training strain using the session Rating of Perceived Exertion (sRPE) method.</p>

<hr/>

<h3>Calculating Workload & ACWR</h3>
<p>Workload is calculated as: <code>Load (AU) = Session Duration (minutes) × Athlete RPE (0–10)</code>.</p>
<p>The <strong>Acute:Chronic Workload Ratio (ACWR)</strong> compares the current 7-day acute load against the 28-day chronic load:</p>
<ul>
  <li><strong>0.80 – 1.30:</strong> Optimal training "sweet spot" with low relative injury hazard.</li>
  <li><strong>&gt; 1.50:</strong> "Danger zone" representing rapid load spikes; flag for recovery intervention.</li>
</ul>
    `
  },

  // ==========================================
  // TOPIC 6: Sports Nutrition & Dietary Management
  // ==========================================
  {
    id: "kb-6-sports-nutrition",
    section_number: "6",
    parent_id: null,
    category: "nutritionist",
    title: "Sports Nutrition & Dietary Management",
    description: "Body composition assessments (ISAK skinfolds), macro targets, and periodized fueling.",
    module_href: "/nutritionist",
    sort_order: 60,
    is_published: true,
    tags: ["nutrition", "diet", "macros", "fueling", "supplements"],
    content: `
<h1>6. Sports Nutrition & Dietary Management</h1>
<p class="lead">Clinical tools for sports dietitians to conduct anthropometric assessments, calculate energy budgets, and structure competition fueling plans.</p>

<hr/>

<h3>Sub-Topics in this Chapter</h3>
<ul>
  <li><strong>6.1 Body Composition:</strong> ISAK 8-site skinfold calliper measurements and bioelectrical impedance.</li>
  <li><strong>6.2 Meal Planning &amp; Supplement Safety:</strong> Macro splits, match-day fueling timelines, and WADA anti-doping compliance.</li>
</ul>
    `
  },
  {
    id: "kb-6-1-body-composition",
    section_number: "6.1",
    parent_id: "kb-6-sports-nutrition",
    category: "nutritionist",
    title: "Body Composition & Energy Requirements",
    description: "Skinfold sum measurements, body fat percentage calculations, and basal metabolic rate estimation.",
    module_href: "/nutritionist",
    sort_order: 61,
    is_published: true,
    tags: ["body composition", "skinfolds", "bmr", "energy"],
    content: `
<h1>6.1 Body Composition & Energy Requirements</h1>
<p class="lead">SOP for conducting standardized body composition assessments in elite athletes.</p>

<hr/>

<h3>Assessment Protocol</h3>
<ul>
  <li>Perform measurements on the right side of the athlete following ISAK protocols.</li>
  <li>Record skinfold sites: Triceps, Subscapular, Biceps, Iliac Crest, Supraspinale, Abdominal, Front Thigh, and Medial Calf.</li>
  <li>System automatically computes sum of 8 skinfolds, estimated fat mass, and lean muscle mass.</li>
</ul>
    `
  },

  // ==========================================
  // TOPIC 7: HRMS, Staff Attendance & Permissions
  // ==========================================
  {
    id: "kb-7-hrms-attendance",
    section_number: "7",
    parent_id: null,
    category: "hr",
    title: "HRMS, Staff Attendance & Permissions",
    description: "Time and duty tracking, shift scheduling, leave approval workflows, and role permissions.",
    module_href: "/admin/hr",
    sort_order: 70,
    is_published: true,
    tags: ["hr", "attendance", "shifts", "leaves", "permissions"],
    content: `
<h1>7. HRMS, Staff Attendance & Permissions</h1>
<p class="lead">Managing healthcare personnel duty rosters, active shift attendance, clinical presence hours, and feature permissions.</p>

<hr/>

<h3>Sub-Topics in this Chapter</h3>
<ul>
  <li><strong>7.1 Staff Attendance &amp; Duty Logs:</strong> Geofenced clock-in/out and duty session logging.</li>
  <li><strong>7.2 Leave Management &amp; Rostering:</strong> Applying for leaves, manager approvals, and practitioner duty coverage.</li>
  <li><strong>7.3 Role Permissions &amp; Access Control:</strong> Configuring granular access and granting Knowledge Base editor rights.</li>
</ul>
    `
  },
  {
    id: "kb-7-1-staff-attendance-logs",
    section_number: "7.1",
    parent_id: "kb-7-hrms-attendance",
    category: "hr",
    title: "Staff Attendance & Duty Logs",
    description: "Digital clock-in and clock-out mechanisms, active working hours, and clinical duty logging.",
    module_href: "/admin/hr",
    sort_order: 71,
    is_published: true,
    tags: ["attendance", "clockin", "work hours", "timesheets"],
    content: `
<h1>7.1 Staff Attendance & Duty Logs</h1>
<p class="lead">Digital attendance tracking ensuring accurate timesheets and clinical compliance.</p>

<hr/>

<h3>Clocking In and Out</h3>
<ol>
  <li>Upon arriving at the facility, click <strong>Clock In</strong> on your dashboard or attendance widget.</li>
  <li>At the end of your shift, click <strong>Clock Out</strong> to finalize total logged hours.</li>
  <li>Administrators review biometric and digital punch logs in the HR Console (<code>/admin/hr</code>).</li>
</ol>
    `
  },
  {
    id: "kb-7-3-role-permissions-kb-editor",
    section_number: "7.3",
    parent_id: "kb-7-hrms-attendance",
    category: "hr",
    title: "Role Permissions & Knowledge Base Access",
    description: "Configuring feature permissions and toggling the KB Editor permission for staff members.",
    module_href: "/admin/settings/console-access",
    sort_order: 73,
    is_published: true,
    tags: ["permissions", "kb editor", "console access", "security"],
    content: `
<h1>7.3 Role Permissions & Knowledge Base Access</h1>
<p class="lead">Managing granular feature switches, including the <strong>KB Editor</strong> privilege.</p>

<hr/>

<h3>Granting Knowledge Base Editor Access</h3>
<ol>
  <li>Navigate to <strong>Settings → Console Access</strong> (<code>/admin/settings/console-access</code>).</li>
  <li>Locate the target staff member in the user list.</li>
  <li>In the <strong>Feature Permissions</strong> card, toggle the <strong>KB Editor</strong> switch to <strong>ON</strong>.</li>
  <li>The change takes effect immediately and is logged in the immutable system audit trail with actor name and timestamp.</li>
</ol>
    `
  },

  // ==========================================
  // TOPIC 8: OrbitFlow & Team Collaboration
  // ==========================================
  {
    id: "kb-8-orbitflow-collaboration",
    section_number: "8",
    parent_id: null,
    category: "planner",
    title: "OrbitFlow & Team Collaboration",
    description: "Interdisciplinary task boards, milestone tracking, and secure direct and group messaging.",
    module_href: "/planner",
    sort_order: 80,
    is_published: true,
    tags: ["orbitflow", "planner", "tasks", "collaboration", "messenger"],
    content: `
<h1>8. OrbitFlow & Team Collaboration</h1>
<p class="lead">Synchronizing care across doctors, physiotherapists, sports scientists, and coaches with task boards and team messaging.</p>

<hr/>

<h3>Sub-Topics in this Chapter</h3>
<ul>
  <li><strong>8.1 OrbitFlow Task Board:</strong> Creating inter-disciplinary tasks, setting deadlines, and assigning return-to-play milestones.</li>
  <li><strong>8.2 TeamComms Messenger:</strong> Clinical handoffs, department channels, and athlete communication.</li>
</ul>
    `
  },
  {
    id: "kb-8-1-orbitflow-task-board",
    section_number: "8.1",
    parent_id: "kb-8-orbitflow-collaboration",
    category: "planner",
    title: "OrbitFlow Task Board",
    description: "Creating clinical tasks, return-to-play milestones, and assigning interdisciplinary duties.",
    module_href: "/planner",
    sort_order: 81,
    is_published: true,
    tags: ["tasks", "kanban", "milestones", "planner"],
    content: `
<h1>8.1 OrbitFlow Task Board</h1>
<p class="lead">Managing patient milestones and departmental action items on a unified Kanban board.</p>

<hr/>

<h3>Creating a Task</h3>
<ol>
  <li>Open <strong>OrbitFlow Planner</strong> (<code>/planner</code>).</li>
  <li>Click <strong>+ New Task</strong>.</li>
  <li>Assign the relevant patient/athlete, priority (Urgent, High, Normal), and deadline.</li>
  <li>Select assignees across departments (e.g. Lead Physio + Strength Coach).</li>
</ol>
    `
  },

  // ==========================================
  // TOPIC 9: Administration & Security
  // ==========================================
  {
    id: "kb-9-admin-security",
    section_number: "9",
    parent_id: null,
    category: "settings",
    title: "Administration, Security & Version Control",
    description: "Audit trail inspection, multi-tenant isolation, and Knowledge Base drafting and version rollbacks.",
    module_href: "/admin/settings",
    sort_order: 90,
    is_published: true,
    tags: ["admin", "security", "audit logs", "version control"],
    content: `
<h1>9. Administration, Security & Version Control</h1>
<p class="lead">Comprehensive governance manual covering immutable audit trails, multi-tenant security, and Knowledge Base revisions.</p>

<hr/>

<h3>Sub-Topics in this Chapter</h3>
<ul>
  <li><strong>9.1 Organization &amp; Multi-Tenant Setup:</strong> Clinic domain settings, branch isolation, and global security policies.</li>
  <li><strong>9.2 Knowledge Base Management &amp; Audit Logs:</strong> Drafting, publishing live, version diffs, and compliance rollbacks.</li>
</ul>
    `
  },
  {
    id: "kb-9-2-kb-management-audit-logs",
    section_number: "9.2",
    parent_id: "kb-9-admin-security",
    category: "settings",
    title: "Knowledge Base Management & Audit Logs",
    description: "Publishing live articles, saving partial drafts, comparing revision history, and audit ledger tracking.",
    module_href: "/admin/settings/audit-logs",
    sort_order: 92,
    is_published: true,
    tags: ["audit logs", "revisions", "drafts", "version control"],
    content: `
<h1>9.2 Knowledge Base Management & Audit Logs</h1>
<p class="lead">Managing article lifecycle states, inspecting change diffs, and viewing immutable security logs.</p>

<hr/>

<h3>1. Saving Drafts vs. Publishing Live</h3>
<ul>
  <li><strong>Save Draft:</strong> Saves partial work. Visible only to authorized KB Editors and Admins. Hidden from regular users.</li>
  <li><strong>Publish Live:</strong> Makes the article immediately visible across the entire clinic network and search index.</li>
  <li><strong>Unpublish:</strong> Seamlessly reverts a live guide back to a draft for revisions.</li>
</ul>

<hr/>

<h3>2. Revision History & Diffs</h3>
<p>Every edit automatically creates a snapshot in <code>knowledge_base_revisions</code>. Click <strong>History</strong> on any article to inspect who made the edit, the timestamp, and the exact diff summary.</p>

<hr/>

<h3>3. Security Audit Ledger</h3>
<p>In <strong>Settings → Audit Logs</strong> (<code>/admin/settings/audit-logs</code>), all administrative actions (including granting/revoking KB Editor status and publishing articles) are immutably logged with actor IP, email, timestamp, and metadata.</p>
    `
  }
];

export async function seedKnowledgeBase(pool) {
  try {
    for (const article of DEFAULT_KB_ARTICLES) {
      const existing = await pool.query(
        `SELECT id FROM knowledge_base_articles WHERE id = $1`,
        [article.id]
      );

      if (existing.rows.length === 0) {
        await pool.query(
          `INSERT INTO knowledge_base_articles (
            id, category, title, description, content, module_href, tags, sort_order, section_number, parent_id, is_published, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, $9, $10, $11, NOW(), NOW())`,
          [
            article.id,
            article.category,
            article.title,
            article.description,
            article.content.trim(),
            article.module_href,
            JSON.stringify(article.tags || []),
            article.sort_order,
            article.section_number,
            article.parent_id,
            article.is_published
          ]
        );
        console.log(`[KB Seed] Inserted guide: [${article.section_number}] ${article.title}`);
      } else {
        // Update section_number and parent_id for existing articles
        await pool.query(
          `UPDATE knowledge_base_articles
           SET section_number = $1,
               parent_id = $2,
               sort_order = $3,
               category = $4,
               title = $5,
               description = $6,
               module_href = $7
           WHERE id = $8`,
          [
            article.section_number,
            article.parent_id,
            article.sort_order,
            article.category,
            article.title,
            article.description,
            article.module_href,
            article.id
          ]
        );
      }
    }
    console.log('[KB Seed] Knowledge Base hierarchy seeded successfully.');
  } catch (err) {
    console.error('[KB Seed] Error seeding default knowledge base:', err);
  }
}
