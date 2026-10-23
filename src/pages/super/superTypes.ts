// Shared types and helpers for the super admin console (/super/*).
import { tokenStore } from "../../api";

export type StaffRole = "ADMIN" | "SUPER_ADMIN";

/** GET /super/staff */
export interface StaffMember {
  id: string;
  name: string;
  phone: string;
  role: StaffRole;
  status: string;
  lastLoginAt: string | null;
  createdAt: string;
  staffCode: string | null;
  title: string | null;
  active: boolean;
  permissions: string[];
  last30d: { actions: number; piiReveals: number; assistedActions: number; rejectedRequests: number };
  openReports: number;
}

/** GET /super/permissions */
export interface PermissionCatalog {
  permissions: Record<string, string>;
  defaults: string[];
}

/** One row of GET /super/audit */
export interface AuditEntry {
  id: number;
  createdAt: string;
  actorId: string | null;
  actorRole: string | null;
  action: string;
  entity: string | null;
  entityId: string | null;
  subjectUserId: string | null;
  onBehalfOf: boolean;
  reason: string | null;
  approvalId: string | null;
  details: string | null;
  ip: string | null;
  prevHash: string | null;
  hash: string;
  actor?: { name: string; role: string; staffProfile: { staffCode: string } | null } | null;
  subject?: { id: string; name: string; role: string } | null;
}

export type ChainResult =
  | { ok: true; checked: number; lastHash: string | null }
  | { ok: false; checked: number; brokenAtId: number; brokenAt?: string; action?: string };

export interface Alert {
  level: "HIGH" | "MEDIUM" | "LOW";
  rule: string;
  message: string;
  staffId?: string | null;
  link?: string;
}

/** GET /super/reports */
export interface StaffReport {
  id: string;
  description: string;
  status: "OPEN" | "INVESTIGATING" | "RESOLVED" | "DISMISSED";
  resolution: string | null;
  createdAt: string;
  updatedAt?: string;
  staffCode: string | null;
  reporter: { id: string; name: string; role: string };
  staff: { id: string; name: string; staffProfile: { staffCode: string } | null } | null;
  handledBy: { name: string } | null;
  auditEntry: AuditEntry | null;
}

/** GET /super/messages */
export interface OutboundSms {
  id: string;
  userId: string | null;
  to: string;
  body: string;
  channel: string;
  provider: string;
  status: "SENT" | "FAILED" | "LOGGED" | string;
  error: string | null;
  createdAt: string;
}

/** What each red-flag rule means and what the super admin should do about it. */
export const RULE_INFO: Record<string, { title: string; meaning: string; todo: string }> = {
  PII_SPIKE: {
    title: "Many private-data reveals",
    meaning: "A staff member unmasked phone or CNIC numbers more than 15 times in 24 hours. Normal work rarely needs this many.",
    todo: "Open their activity, read the reasons they gave, and remove the CNIC_VIEW permission if the reasons do not hold up.",
  },
  OFF_HOURS: {
    title: "Night-time activity",
    meaning: "Staff actions between 10pm and 7am (Pakistan time) this week, when nobody else is watching.",
    todo: "Check what was done and ask the staff member why. Force a logout if the account may be in someone else's hands.",
  },
  REJECTED_REQUESTS: {
    title: "Requests keep getting rejected",
    meaning: "Other staff rejected 3 or more of this person's requests in 30 days. They may be pushing actions they should not.",
    todo: "Read the rejected requests and the approvers' notes. Narrow their permissions if there is a pattern.",
  },
  QUICK_LIFT: {
    title: "Penalty lifted quickly",
    meaning: "A suspension or ban was lifted within a week of being issued. This can hide favours or pressure.",
    todo: "Open the worker, compare the complaint with the reason for lifting, and talk to both staff involved.",
  },
  ASSIST_CONCENTRATION: {
    title: "Same household, many assisted hires",
    meaning: "One staff member closed 3+ hires for the same household on workers' behalf in 30 days. A possible sign of kickbacks.",
    todo: "Call a few of the workers directly and confirm they agreed. Check whether money changed hands.",
  },
  CNIC_NOT_RETURNED: {
    title: "CNIC not returned on time",
    meaning: "A worker asked for their original CNIC back and it was not returned by the deadline.",
    todo: "Make sure the card is returned today. Holding someone's ID is serious; follow up with the staff member who holds it.",
  },
  RESET_SPIKE: {
    title: "Many password resets",
    meaning: "A staff member reset more than 5 user passwords in 24 hours. Resets can be used to take over accounts.",
    todo: "Check each reset against a real request from the user. Remove the PASSWORD_RESET permission if unsure.",
  },
  STALE_APPROVALS: {
    title: "Approvals waiting",
    meaning: "Requests that need a second person have been waiting more than 2 days.",
    todo: "Ask an approver to decide them, or decide them yourself.",
  },
  STAFF_REPORTS: {
    title: "Reports about staff",
    meaning: "Workers or families reported a staff member, or said \"I did not agree\" to something done on their behalf.",
    todo: "Open Staff reports, investigate, and write the outcome. The reporter is told the result.",
  },
  STAFF_LOCKOUT: {
    title: "Staff account lockouts",
    meaning: "Someone typed wrong passwords on a staff account until it locked. It may be under attack.",
    todo: "Contact the staff member, reset their password if needed, and check recent logins.",
  },
  AUDIT_TAMPERED: {
    title: "Audit log was changed",
    meaning: "An entry no longer matches its fingerprint (hash chain). Somebody edited or deleted history directly in the database.",
    todo: "Treat as a security incident: export the log now, restrict database access, and find who had access.",
  },
};

export const ruleInfo = (rule: string) => RULE_INFO[rule] ?? { title: rule.replace(/_/g, " ").toLowerCase(), meaning: "", todo: "" };

export const staffLabel = (s: { staffCode: string | null; name: string }) => `${s.staffCode ?? "—"} ${s.name}`;

export const shortHash = (h: string | null | undefined) => (h ? `${h.slice(0, 8)}…${h.slice(-4)}` : "—");

export function formatDateTime(d: string | Date) {
  return new Date(d).toLocaleString("en-PK", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", numberingSystem: "latn" });
}

/** Pretty-prints the details JSON string stored on an audit entry. */
export function prettyDetails(details: string | null) {
  if (!details) return "";
  try {
    return JSON.stringify(JSON.parse(details), null, 2);
  } catch {
    return details;
  }
}

/** Downloads the audit CSV. Needs the auth header, so it can't be a plain link. */
export async function downloadAuditCsv(query: string) {
  const base = (import.meta.env.VITE_API_URL as string | undefined) || "/api";
  const token = tokenStore.get();
  const res = await fetch(`${base}/super/audit/export.csv${query}`, { headers: token ? { authorization: `Bearer ${token}` } : {} });
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new Error(data?.error || `Export failed (${res.status})`);
  }
  const blob = await res.blob();
  const name = /filename="([^"]+)"/.exec(res.headers.get("content-disposition") ?? "")?.[1] ?? "bharosa-audit.csv";
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
