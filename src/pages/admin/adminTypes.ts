import type { Complaint, Grievance, Penalty, Permission, PublicWorker } from "../../types";

/** Row of GET /admin/users. Phone and CNIC arrive masked ("0300*****67", "35202-*******-1"). */
export interface AdminUser {
  id: string;
  role: "HOUSEHOLD" | "WORKER" | "ADMIN";
  name: string;
  /** masked */
  phone: string;
  city: string;
  area: string | null;
  status: string;
  createdAt: string;
  lastLoginAt?: string | null;
  mustChangePassword?: boolean;
  createdByStaffId?: string | null;
  cnicInCustody: boolean;
  workerProfile: {
    skills: string[];
    verificationStatus: string;
    verificationExpiresAt?: string | null;
    identityCheckMethod?: string;
    identityCheckedAt?: string | null;
    badgeSuspended: boolean;
    /** masked */
    cnicNumber: string | null;
    assisted?: boolean;
    dateOfBirth?: string | null;
    updatedAt: string;
  } | null;
  householdProfile: { platformKnown: boolean; address: string | null } | null;
}

export interface Custody {
  id: string;
  workerId: string;
  /** masked */
  cnicNumber: string;
  status: "IN_CUSTODY" | "RETURNED";
  storageLocation: string | null;
  receivedAt: string;
  returnedAt: string | null;
  /** how the worker's voluntary consent was recorded */
  consentNote?: string | null;
  /** worker asked for the card back; must be returned within CUSTODY_RETURN_HOURS */
  returnRequestedAt?: string | null;
  /** only on GET /admin/custody */
  returnOverdue?: boolean;
  notes: string | null;
  handledBy?: { name: string };
  worker?: { id: string; name: string; phone?: string };
}

/** Workers can ask for their original CNIC back; staff must return it within this many hours. */
export const CUSTODY_RETURN_HOURS = 48;

export interface VerificationRecord {
  id: string;
  status: string;
  policeStation: string | null;
  referenceNo: string | null;
  notes: string | null;
  createdAt: string;
  approvalId?: string | null;
  handledBy: { name: string } | null;
}

export interface AdminPenalty extends Penalty {
  approvedBy?: { name: string } | null;
}

export interface CaseNote {
  id: string;
  channel: string;
  summary: string;
  createdAt: string;
  staff: { name: string; staffProfile?: { staffCode: string } | null };
}

/** Approval requests about one worker, as embedded in GET /admin/workers/:id. */
export interface WorkerApprovalRef {
  id: string;
  type: string;
  summary: string;
  reason: string;
  status: "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED" | "FAILED";
  decisionNote: string | null;
  createdAt: string;
  decidedAt: string | null;
  requestedBy: { name: string };
  decidedBy: { name: string } | null;
}

export interface AdminWorker extends PublicWorker {
  /** masked */
  phone: string;
  /** masked */
  cnicNumber: string | null;
  hasCnic?: boolean;
  verificationStatus: string;
  verificationExpiresAt?: string | null;
  identityCheckMethod?: string;
  identityCheckedAt?: string | null;
  dateOfBirth?: string | null;
  assisted?: boolean;
  mustChangePassword?: boolean;
  lastLoginAt?: string | null;
  createdBy?: { name: string; staffCode?: string } | null;
  verifications: VerificationRecord[];
  custody: Custody[];
  complaints: Complaint[];
  grievances?: Grievance[];
  penalties: AdminPenalty[];
  engagements: {
    id: string;
    title: string;
    status: string;
    startDate: string;
    endDate?: string | null;
    source: string;
    wage?: number;
    wagePeriod?: string;
    household: { id?: string; name: string; phone?: string };
  }[];
  caseNotes?: CaseNote[];
  approvals?: WorkerApprovalRef[];
}

export interface Stats {
  households: number;
  workers: number;
  verified: number;
  pendingVerification: number;
  cnicHeld: number;
  cnicReturnOverdue?: number;
  openJobs: number;
  activeEngagements: number;
  openComplaints: number;
  openGrievances?: number;
  activePenalties: number;
  pendingApprovals?: number;
}

/** GET /admin/my-activity row (the staff member's own audit trail). */
export interface StaffAuditEntry {
  id: number;
  action: string;
  entity: string;
  entityId: string | null;
  subjectUserId: string | null;
  onBehalfOf: boolean;
  reason: string | null;
  approvalId?: string | null;
  /** JSON string */
  details: string | null;
  createdAt: string;
}

export interface SweepResult {
  endorsementRequests: number;
  expiredJobs: number;
  expiredVerifications: number;
}

export const IDENTITY_METHODS = ["CNIC_SIGHTED", "CNIC_COPY", "VERISYS"] as const;

export const IDENTITY_METHOD_LABEL: Record<string, string> = {
  NONE: "Not checked",
  CNIC_SIGHTED: "Original CNIC seen and handed back",
  CNIC_COPY: "Signed copy of CNIC on file",
  VERISYS: "NADRA Verisys check",
};

/** Plain-English names for staff permissions (matches api/src/lib/permissions.ts). */
export const PERMISSION_LABEL: Record<Permission, string> = {
  WORKERS_ASSIST: "Act for workers",
  HOUSEHOLDS_ASSIST: "Act for households",
  VERIFY: "Police verification",
  CNIC_CUSTODY: "CNIC custody",
  CNIC_VIEW: "Reveal CNICs",
  COMPLAINTS: "Complaints",
  PENALTIES: "Penalties",
  ENDORSE: "Endorsements",
  PLACEMENTS: "Placements",
  PASSWORD_RESET: "Password resets",
  APPROVE: "Approve requests",
  REPORTS: "Reports",
};

/** Plain-English names for approval / action types. */
export const ACTION_TYPE_LABEL: Record<string, string> = {
  VERIFICATION_DECISION: "Police verification decision",
  PENALTY: "Penalty",
  PENALTY_LIFT: "Lift penalty",
  TEAM_ENDORSE: "Team endorsement",
  ENDORSEMENT_REVOKE: "Revoke endorsement",
  COMPLAINT_DECISION: "Complaint decision",
  PLACEMENT: "Direct placement",
};

/** "WORKER_FILE_VIEWED" -> "Worker file viewed" (English only: staff UI). */
export const staffLabel = (s: string | null | undefined) => {
  if (!s) return "";
  if (ACTION_TYPE_LABEL[s]) return ACTION_TYPE_LABEL[s];
  const t = s.replace(/_/g, " ").toLowerCase();
  return t.charAt(0).toUpperCase() + t.slice(1).replace(/\bcnic\b/g, "CNIC").replace(/\bpii\b/g, "PII");
};

/** Whole years since a date of birth. */
export const ageFrom = (dob: string | null | undefined) => {
  if (!dob) return null;
  const d = new Date(dob);
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  if (now.getMonth() < d.getMonth() || (now.getMonth() === d.getMonth() && now.getDate() < d.getDate())) age--;
  return age;
};
