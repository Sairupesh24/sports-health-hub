import fs from 'fs';
import path from 'path';

const schemaPath = 'd:/Sports_Physio_Software/sports-health-hub-main/prisma/schema.prisma';
const backupPath = 'd:/Sports_Physio_Software/sports-health-hub-main/prisma/schema.prisma.bak';

// Restore from backup
if (fs.existsSync(backupPath)) {
  fs.copyFileSync(backupPath, schemaPath);
  console.log('Restored clean schema.prisma from backup.');
} else {
  console.error('Backup file schema.prisma.bak does not exist!');
  process.exit(1);
}

const customModelMap = {
  users: 'User',
  profiles: 'Profile',
  organizations: 'Organization',
  sessions: 'Session',
  services: 'Service',
  packages: 'Package',
  enquiries: 'Enquiry',
  enquiryinteractions: 'EnquiryInteraction',
  clientadminnotes: 'ClientAdminNote',
  clientdocuments: 'ClientDocument',
  cliententitlements: 'ClientEntitlement',
  clientorganizations: 'ClientOrganization',
  clients: 'Client',
  locations: 'Location',
  waitlist: 'Waitlist',
  subscriptions: 'Subscription',
  subscription_logs: 'SubscriptionLog',
  bills: 'Bill',
  billitems: 'BillItem',
  billpayments: 'BillPayment',
  refunds: 'Refund',
  hrattendancelogs: 'HrAttendanceLog',
  hrleaves: 'HrLeave',
  hr_employees: 'HrEmployee',
  hr_jobs: 'HrJob',
  injuries: 'Injury',
  exercises: 'Exercise',
  referralsources: 'ReferralSource',
  questionnaires: 'Questionnaire',
  workoutdays: 'WorkoutDay',
  workoutitems: 'WorkoutItem',
  wellness_logs: 'WellnessLog',
  trainingprograms: 'TrainingProgram',
  uhidsequences: 'UhidSequence',
  session_templates: 'SessionTemplate',
  report_templates: 'ReportTemplate',
  scientific_resources: 'ScientificResource',
  program_assignments: 'ProgramAssignment',
  performance_assessments: 'PerformanceAssessment',
  max_pr_records: 'MaxPrRecord',
  injury_master_data: 'InjuryMasterData',
  excel_diagnostic_reports: 'ExcelDiagnosticReport',
  external_training_summary: 'ExternalTrainingSummary',
  emergency_alerts: 'EmergencyAlert',
  client_soreness_reports: 'ClientSorenessReport',
  client_assessment_reports: 'ClientAssessmentReport',
  bulk_assignments: 'BulkAssignment',
  athlete_workout_completions: 'AthleteWorkoutCompletion',
  athlete_item_logs: 'AthleteItemLog',
  organization_notification_settings: 'OrganizationNotificationSetting',
  staff_schedules: 'StaffSchedule',
  rehab_progress: 'RehabProgress',
  physiosessiondetails: 'PhysioSessionDetail',
  packageservices: 'PackageService',
  notification_reads: 'NotificationRead',
  notifications: 'Notification',
  liftitems: 'LiftItem',
  group_attendance: 'GroupAttendance',
  form_responses: 'FormResponse',
  client_group_members: 'ClientGroupMember',
  client_groups: 'ClientGroup',
  availabilityexceptions: 'AvailabilityException',
  authsessions: 'AuthSession',
  consultant_services: 'ConsultantService',
  consultantavailability: 'ConsultantAvailability',
};

function singularize(word) {
  if (customModelMap[word]) return customModelMap[word];
  let res = word.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('');
  if (res.endsWith('s') && !res.endsWith('ss')) {
    if (res.endsWith('ies')) {
      res = res.slice(0, -3) + 'y';
    } else {
      res = res.slice(0, -1);
    }
  }
  return res;
}

function camelCaseField(field) {
  return field.replace(/_([a-z0-9])/gi, (_, g) => g.toUpperCase());
}

let content = fs.readFileSync(schemaPath, 'utf8');

// First pass: extract all model names to build model map
const modelNames = new Set();
const modelRegex = /model\s+(\w+)\s*\{/g;
let match;
while ((match = modelRegex.exec(content)) !== null) {
  modelNames.add(match[1]);
}

console.log(`Found ${modelNames.size} models in introspected schema.`);

// Define model mapping
const modelMap = new Map();
for (const m of modelNames) {
  modelMap.set(m, singularize(m));
}

// Second pass: Parse models and rewrite them
// Split content into blocks
const blocks = content.split(/(?=model\s+\w+\s*\{|generator\s+\w+\s*\{|datasource\s+\w+\s*\{)/);

const processedBlocks = blocks.map(block => {
  const modelMatch = block.match(/^model\s+(\w+)\s*\{([\s\S]*)\}/);
  if (!modelMatch) {
    let res = block;
    if (block.includes('provider        = "prisma-client"')) {
      res = block.replace('provider        = "prisma-client"', 'provider        = "prisma-client-js"');
    }
    return res;
  }

  const oldModelName = modelMatch[1];
  const newModelName = modelMap.get(oldModelName);
  const blockBody = modelMatch[2];

  const lines = blockBody.split('\n');
  const processedLines = [];

  for (let line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      processedLines.push(line);
      continue;
    }

    // Ignore existing mapping attributes
    if (trimmed.startsWith('@@map')) {
      continue;
    }

    // Map indexes/uniques/ids
    if (trimmed.startsWith('@@unique') || trimmed.startsWith('@@index') || trimmed.startsWith('@@id')) {
      line = line.replace(/@@(unique|index|id)\(\[(.*?)\]/g, (m, type, valStr) => {
        const fieldsMapped = valStr.split(',').map(f => {
          const cleanField = f.trim();
          const parts = cleanField.split(/\s+/);
          parts[0] = camelCaseField(parts[0]);
          return parts.join(' ');
        }).join(', ');
        return `@@${type}([${fieldsMapped}]`;
      });
      processedLines.push(line);
      continue;
    }

    // Regular field lines (supporting Unsupported type annotations - putting specific type first in alternation)
    const fieldMatch = line.match(/^(\s*)(\w+)(\s+)(Unsupported\(".*?"\)\??|[\w\[\]\?]+)([\s\S]*)$/);
    if (fieldMatch) {
      const indent = fieldMatch[1];
      const oldFieldName = fieldMatch[2];
      const spaces = fieldMatch[3];
      const oldFieldType = fieldMatch[4];
      const rest = fieldMatch[5];

      // Extract raw type (without [] or ?)
      const baseType = oldFieldType.replace(/\[\]|\?/, '');
      const isRel = modelMap.has(baseType);

      let newFieldName = oldFieldName;
      let newFieldType = oldFieldType;
      let attributes = rest;

      if (isRel) {
        newFieldType = oldFieldType.replace(baseType, modelMap.get(baseType));
        newFieldName = camelCaseField(oldFieldName);

        if (attributes.includes('@relation')) {
          attributes = attributes.replace(/(fields|references):\s*\[(.*?)\]/g, (m, key, valStr) => {
            const fieldsMapped = valStr.split(',').map(f => camelCaseField(f.trim())).join(', ');
            return `${key}: [${fieldsMapped}]`;
          });
        }
      } else {
        if (oldFieldName.includes('_')) {
          newFieldName = camelCaseField(oldFieldName);
          if (!attributes.includes('@map')) {
            const cleanAttrs = attributes.trim();
            attributes = cleanAttrs ? ` ${cleanAttrs} @map("${oldFieldName}")` : ` @map("${oldFieldName}")`;
          }
        }
      }

      processedLines.push(`${indent}${newFieldName}${spaces}${newFieldType}${attributes}`);
    } else {
      processedLines.push(line);
    }
  }

  // Add @@map at the bottom of the model
  processedLines.push(`  @@map("${oldModelName}")`);

  return `model ${newModelName} {\n${processedLines.join('\n')}\n}`;
});

fs.writeFileSync(schemaPath, processedBlocks.join('\n\n'), 'utf8');
console.log('Successfully refactored schema.prisma with CamelCase models and mapped columns!');
