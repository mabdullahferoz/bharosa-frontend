// Shapes returned by the Bharosa API (see api/src/routes). Kept by hand for now;
// a shared package or OpenAPI codegen can replace this when the mobile app starts.

export type Role = "HOUSEHOLD" | "WORKER" | "ADMIN" | "SUPER_ADMIN";

/** Staff permissions (see api/src/lib/permissions.ts). Super admins have all of them. */
export type Permission =
  | "WORKERS_ASSIST"
  | "HOUSEHOLDS_ASSIST"
  | "VERIFY"
  | "CNIC_CUSTODY"
  | "CNIC_VIEW"
  | "COMPLAINTS"
  | "PENALTIES"
  | "ENDORSE"
  | "PLACEMENTS"
  | "PASSWORD_RESET"
  | "APPROVE"
  | "REPORTS";

export interface Trust {
  policeVerified: boolean;
  verificationStatus: string;
  badgeSuspended: boolean;
  cnicInCustody: boolean;
  platformEndorsed: boolean;
  householdEndorsements: number;
  averageRating: number | null;
  placements: number;
  upheldComplaints: number;
}

export interface WorkerProfileData {
  skills: string[];
  bio: string | null;
  experienceYears: number;
  expectedWage: number | null;
  availability: string;
  hometown: string | null;
  languages: string;
  gender: string | null;
  cnicNumber?: string | null;
  verificationStatus?: string;
  verifiedAt?: string | null;
  verificationExpiresAt?: string | null;
  identityCheckMethod?: string;
  badgeSuspended?: boolean;
  dateOfBirth?: string | null;
  emergencyContact?: string | null;
  assisted?: boolean;
}

export interface Me {
  /** true after staff created the account or reset the password: the app forces a change first */
  mustChangePassword: boolean;
  cnicInCustody: boolean;
  /** set when the worker asked for their original CNIC back */
  cnicReturnRequestedAt?: string | null;
  /** Present for ADMIN and SUPER_ADMIN. permissions is ["*"] for super admins. */
  staff?: { staffCode: string; title: string | null; permissions: (Permission | "*")[] };
  id: string;
  role: Role;
  name: string;
  phone: string;
  city: string;
  area: string | null;
  status: "ACTIVE" | "SUSPENDED" | "BANNED";
  createdAt: string;
  workerProfile: WorkerProfileData | null;
  householdProfile: { address: string | null; householdSize: number | null; notes: string | null; platformKnown: boolean } | null;
  trust?: Trust;
  /** the worker's own endorsements (workers only) */
  endorsements?: Endorsement[];
}

export interface Endorsement {
  id: string;
  type: "PLATFORM" | "HOUSEHOLD";
  trustworthy: boolean;
  rating: number | null;
  comment: string | null;
  createdAt: string;
  endorser: { name: string; area?: string | null; city?: string };
}

export interface PublicWorker {
  id: string;
  name: string;
  city: string;
  area: string | null;
  status: string;
  memberSince: string;
  profile: WorkerProfileData | null;
  trust: Trust;
  endorsements: Endorsement[];
}

export interface HistoryEntry {
  by: "WORKER" | "HOUSEHOLD";
  amount: number;
  message: string | null;
  at: string;
  /** "BH-007 Ayesha" when staff named this price for the person (assisted mode) */
  viaStaff?: string;
}

export interface Offer {
  id: string;
  jobId: string;
  workerId: string;
  amount: number;
  message: string | null;
  lastBy: "WORKER" | "HOUSEHOLD";
  initiator: "WORKER" | "HOUSEHOLD";
  status: "PENDING" | "ACCEPTED" | "DECLINED" | "WITHDRAWN" | "CLOSED";
  /** prices exchanged so far; capped at Meta.maxOfferRounds */
  rounds: number;
  history: HistoryEntry[];
  createdAt: string;
  updatedAt: string;
  worker?: PublicWorker;
  job?: Job;
}

export interface Job {
  id: string;
  householdId: string;
  household?: { id: string; name: string; city: string; area: string | null; householdProfile?: { platformKnown: boolean } | null };
  title: string;
  category: string;
  description: string | null;
  city: string;
  area: string | null;
  offeredWage: number;
  wagePeriod: string;
  schedule: string;
  requireVerified: boolean;
  workingHours: string | null;
  weeklyRestDay: string | null;
  status: "OPEN" | "FILLED" | "CANCELLED" | "EXPIRED";
  expiresAt: string | null;
  createdAt: string;
  pendingOffers?: number;
  myOffer?: Offer | null;
  offers?: Offer[];
}

export interface Contact {
  id: string;
  name: string;
  phone: string;
  city: string;
  area: string | null;
}

export interface Engagement {
  id: string;
  jobId: string | null;
  householdId: string;
  workerId: string;
  household: Contact;
  worker: Contact;
  title: string;
  category: string;
  wage: number;
  wagePeriod: string;
  source: "MARKETPLACE" | "PLATFORM_PLACEMENT";
  status: "ACTIVE" | "ENDED";
  startDate: string;
  endDate: string | null;
  endReason: string | null;
  endorsement: { id: string; trustworthy: boolean; rating: number | null; comment: string | null } | null;
  complaints: { id: string; status: string; category: string; createdAt: string }[];
  /** worker's grievances about this household (only visible to the worker) */
  grievances: { id: string; status: string; category: string; createdAt: string }[];
  workingHours: string | null;
  weeklyRestDay: string | null;
  termsAcceptedByWorkerAt: string | null;
  termsAcceptedByHouseholdAt: string | null;
  myTermsAccepted: boolean;
  daysTogether: number;
  canEndorse: boolean;
  daysUntilEndorsement: number;
}

/** GET /engagements/:id/terms — written terms both sides confirm */
export interface Terms {
  engagementId: string;
  household: { name: string; area: string | null; city: string };
  worker: { name: string };
  title: string;
  category: string;
  wage: number;
  wagePeriod: string;
  workingHours: string | null;
  weeklyRestDay: string | null;
  startDate: string;
  rules: string[];
  termsAcceptedByWorkerAt: string | null;
  termsAcceptedByHouseholdAt: string | null;
}

/** GET /me/activity — what happened on my account, including staff actions */
export interface ActivityEntry {
  id: number;
  action: string;
  at: string;
  onBehalfOf: boolean;
  reason: string | null;
  details: Record<string, unknown> | null;
  by: { kind: "STAFF"; name: string; staffCode: string } | { kind: "YOU" } | { kind: "USER"; name: string } | { kind: "SYSTEM" };
  disputed: boolean;
}

export interface Grievance {
  id: string;
  workerId: string;
  householdId: string;
  engagementId: string | null;
  category: string;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  description: string;
  status: "OPEN" | "UNDER_REVIEW" | "RESOLVED" | "DISMISSED";
  resolution: string | null;
  filedByStaffId: string | null;
  createdAt: string;
  household?: { id: string; name: string; phone?: string };
  worker?: { id: string; name: string };
  engagement?: { id: string; title: string } | null;
  handledBy?: { name: string } | null;
}

/** Result of a sensitive staff action: either done, or waiting for a second person's approval. */
export type PerformResult<T = unknown> =
  | { status: "EXECUTED"; result: T }
  | { status: "PENDING_APPROVAL"; approvalId: string; summary: string };

export interface StaffRef {
  id: string;
  name: string;
  staffProfile?: { staffCode: string } | null;
}

export interface Approval {
  id: string;
  type: string;
  payload: Record<string, unknown>;
  summary: string;
  reason: string;
  status: "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED" | "FAILED";
  decisionNote: string | null;
  result: string | null;
  createdAt: string;
  decidedAt: string | null;
  requestedBy: StaffRef;
  decidedBy: StaffRef | null;
  subjectUser: { id: string; name: string; role: string } | null;
  canDecide: boolean;
}

export interface Penalty {
  id: string;
  workerId: string;
  complaintId: string | null;
  type: "WARNING" | "BADGE_SUSPENSION" | "SUSPENSION" | "BAN";
  reason: string;
  startsAt: string;
  endsAt: string | null;
  revokedAt: string | null;
  revokeNote?: string | null;
  issuedBy?: { name: string };
  createdAt: string;
}

export interface Complaint {
  id: string;
  filedById: string;
  workerId: string;
  engagementId: string | null;
  category: string;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  description: string;
  status: "OPEN" | "UNDER_REVIEW" | "UPHELD" | "DISMISSED";
  workerResponse: string | null;
  resolution: string | null;
  reviewedAt: string | null;
  createdAt: string;
  filedBy?: { id: string; name: string; phone?: string; area?: string | null; city?: string };
  worker?: {
    id: string;
    name: string;
    phone?: string;
    status?: string;
    workerProfile?: { verificationStatus: string; badgeSuspended: boolean } | null;
  };
  engagement?: { id: string; title: string; startDate: string } | null;
  penalties?: Penalty[];
  reviewedBy?: { name: string } | null;
}

export interface Notification {
  id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  /** JSON {key, ...values} used to show the message in Urdu */
  params: string | null;
  readAt: string | null;
  createdAt: string;
}

export interface Meta {
  categories: string[];
  schedules: string[];
  wagePeriods: string[];
  cities: string[];
  complaintCategories: string[];
  grievanceCategories: string[];
  severities: string[];
  penaltyTypes: string[];
  weekdays: string[];
  caseNoteChannels: string[];
  endorsementAfterDays: number;
  jobExpiryDays: number;
  maxOfferRounds: number;
  minWorkerAge: number;
  /** legal monthly minimum wage by province (PUNJAB, SINDH, KP, BALOCHISTAN, ICT) */
  monthlyMinimumWage: Record<string, number>;
  /** city -> province key used for the minimum wage */
  provinceOfCity: Record<string, string>;
  supportPhone: string;
}
