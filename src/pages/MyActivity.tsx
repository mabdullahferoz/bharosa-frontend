import { useState } from "react";
import { api, ApiError } from "../api";
import { useAuth } from "../auth";
import { msg, t } from "../i18n";
import type { ActivityEntry } from "../types";
import { Empty, Field, formatDate, humanize, Loaded, Modal, PageHeader, rupees, Tabs, timeAgo, useAction, useLoad } from "../ui";

// Plain-language sentence for each audit action. Written without a subject ("Price sent…"),
// because the "who" line above it says who did it (You / staff member / automatic).
const ACTIONS: Record<string, string> = {
  REGISTER: msg("Account created"),
  ASSISTED_SIGNUP: msg("Account created for you"),
  ASSISTED_PROFILE_EDIT: msg("Your profile was changed"),
  PASSWORD_CHANGED: msg("Password changed"),
  PASSWORD_RESET_BY_STAFF: msg("Password reset. A temporary password was given."),
  FORCE_LOGOUT: msg("Logged out on all phones"),
  OFFER_SENT: msg("Price sent for a job: {amount}"),
  OFFER_COUNTERED: msg("New price offered: {amount}"),
  OFFER_ACCEPTED: msg("Price accepted: {amount}. Work agreed."),
  OFFER_DECLINED: msg("Offer declined"),
  OFFER_WITHDRAWN: msg("Offer withdrawn"),
  INVITE_SENT: msg("Worker invited to a job: {amount}"),
  JOB_POSTED: msg("Job posted: {title}"),
  JOB_CANCELLED: msg("Job cancelled"),
  PLACEMENT_CREATED: msg("Placed in a job by our team"),
  TERMS_ACCEPTED: msg("Terms of work confirmed"),
  ENGAGEMENT_ENDED: msg("Work arrangement ended"),
  VERIFICATION_REQUESTED: msg("Police verification requested"),
  VERIFICATION_PENDING: msg("Police verification request received"),
  VERIFICATION_IN_PROGRESS: msg("Police verification started"),
  VERIFICATION_VERIFIED: msg("Police verification completed"),
  VERIFICATION_FAILED: msg("Police verification could not be completed"),
  VERIFICATION_EXPIRED: msg("Police verification expired. It needs to be renewed."),
  IDENTITY_CHECKED: msg("Identity checked: {method}"),
  CNIC_RECEIVED: msg("Original CNIC taken for safekeeping"),
  CNIC_RETURN_REQUESTED: msg("Asked for the original CNIC back"),
  CNIC_RETURNED: msg("Original CNIC given back"),
  PII_REVEALED: msg("Viewed your {field}"),
  WORKER_FILE_VIEWED: msg("Opened your worker file"),
  HOUSEHOLD_KNOWN_SET: msg("Marked as known to our team"),
  PENALTY_WARNING: msg("Warning given"),
  PENALTY_BADGE_SUSPENSION: msg("Verified badge suspended"),
  PENALTY_SUSPENSION: msg("Account suspended"),
  PENALTY_BAN: msg("Account banned"),
  PENALTY_LIFTED: msg("Penalty lifted"),
  COMPLAINT_FILED: msg("Complaint filed about your work"),
  COMPLAINT_RESPONDED: msg("Reply sent to a complaint"),
  COMPLAINT_UNDER_REVIEW: msg("Complaint being reviewed"),
  COMPLAINT_UPHELD: msg("Complaint found true"),
  COMPLAINT_DISMISSED: msg("Complaint dismissed"),
  GRIEVANCE_FILED: msg("Problem reported about a family"),
  GRIEVANCE_UNDER_REVIEW: msg("Your report about a family is being reviewed"),
  GRIEVANCE_RESOLVED: msg("Your report about a family was resolved"),
  GRIEVANCE_DISMISSED: msg("Your report about a family was closed"),
  ENDORSEMENT_GIVEN: msg("A family gave feedback about you"),
  PLATFORM_ENDORSED: msg("Endorsed by the Bharosa team"),
  STAFF_REPORTED: msg("Staff member reported"),
  STAFF_REPORT_INVESTIGATING: msg("Your report about a staff member is being investigated"),
  STAFF_REPORT_RESOLVED: msg("Your report about a staff member was resolved"),
  STAFF_REPORT_DISMISSED: msg("Your report about a staff member was closed"),
};

const PII_FIELDS: Record<string, string> = {
  cnic: msg("CNIC number"),
  phone: msg("mobile number"),
  emergencyContact: msg("emergency contact"),
};

function describe(e: ActivityEntry): string {
  const d = e.details ?? {};
  if (e.action === "ENDORSEMENT_GIVEN" && d.trustworthy === true) return t("A family endorsed you as trustworthy");
  const tpl = ACTIONS[e.action];
  if (!tpl) return humanize(e.action);
  const field = typeof d.field === "string" ? d.field : "";
  return t(tpl, {
    amount: typeof d.amount === "number" ? rupees(d.amount) : typeof d.offeredWage === "number" ? rupees(d.offeredWage) : "",
    title: typeof d.title === "string" ? d.title : "",
    method: typeof d.method === "string" ? humanize(d.method) : "",
    field: PII_FIELDS[field] ? t(PII_FIELDS[field]) : field,
  });
}

function who(e: ActivityEntry): string {
  switch (e.by.kind) {
    case "YOU":
      return t("You");
    case "STAFF":
      return t("Staff {code} {name}", { code: e.by.staffCode, name: e.by.name });
    case "USER":
      return e.by.name;
    default:
      return t("Bharosa (automatic)");
  }
}

function DisputeModal({ entry, onClose, onDone }: { entry: ActivityEntry; onClose: () => void; onDone: () => void }) {
  const { busy, run } = useAction();
  const [description, setDescription] = useState("");
  return (
    <Modal title={t("I did not agree")} onClose={onClose}>
      <form
        className="form"
        onSubmit={async (ev) => {
          ev.preventDefault();
          const r = await run(
            () => api.post("/me/report-staff", { auditLogId: entry.id, description }),
            t("Report sent to the senior Bharosa team."),
          );
          if (r) {
            onDone();
            onClose();
          }
        }}
      >
        <div className="callout callout-info small">
          <span>
            <strong>{describe(entry)}</strong> · {who(entry)} · {formatDate(entry.at)}
          </span>
        </div>
        <p className="small muted">{t("Your report goes to the senior team, not to the staff member. Tell us briefly what is wrong.")}</p>
        <Field label={t("What happened?")} hint={t("At least 5 letters")}>
          <textarea dir="auto" value={description} onChange={(e) => setDescription(e.target.value)} minLength={5} maxLength={3000} required autoFocus />
        </Field>
        <button className="btn btn-danger btn-block" disabled={busy}>
          {t("Send report")}
        </button>
      </form>
    </Modal>
  );
}

function StaffCheck() {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<
    { kind: "ok"; staffCode: string; name: string; title: string | null } | { kind: "none"; code: string } | { kind: "error"; message: string } | null
  >(null);

  const check = async (e: React.FormEvent) => {
    e.preventDefault();
    const c = code.trim().toUpperCase();
    if (!c) return;
    setBusy(true);
    try {
      const r = await api.get<{ staffCode: string; name: string; title: string | null }>(`/staff-directory/${encodeURIComponent(c)}`);
      setResult({ kind: "ok", ...r });
    } catch (err) {
      setResult(err instanceof ApiError && err.status === 404 ? { kind: "none", code: c } : { kind: "error", message: t((err as Error).message) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card stack-sm">
      <h3>{t("Check a staff member")}</h3>
      <p className="small muted">{t("Every Bharosa staff member has a code like BH-001. Ask for it, then check it here.")}</p>
      <form className="row" onSubmit={check}>
        <input
          className="ltr"
          style={{ flex: 1, minWidth: 0 }}
          value={code}
          onChange={(e) => {
            setCode(e.target.value);
            setResult(null);
          }}
          placeholder="BH-001"
          aria-label={t("Staff code")}
          maxLength={20}
          required
        />
        <button className="btn" disabled={busy}>
          {t("Check")}
        </button>
      </form>
      {result?.kind === "ok" && (
        <div className="callout callout-ok small">
          <span>
            {t("Yes, a real Bharosa staff member:")} <strong className="ltr">{result.staffCode}</strong> <strong dir="auto">{result.name}</strong>
            {result.title && (
              <>
                {" "}
                · <span dir="auto">{result.title}</span>
              </>
            )}
          </span>
        </div>
      )}
      {result?.kind === "none" && (
        <div className="callout callout-error small">
          <span>
            <span className="ltr">{result.code}</span>{" "}
            {t("is not a Bharosa staff member. Do not give them money or documents.")}
          </span>
        </div>
      )}
      {result?.kind === "error" && (
        <div className="callout callout-error small">
          <span>{result.message}</span>
        </div>
      )}
      <p className="small muted">{t("Our staff never ask for money. Joining and verification are free.")}</p>
    </div>
  );
}

function ReportStaffForm() {
  const { busy, run } = useAction();
  const [staffCode, setStaffCode] = useState("");
  const [description, setDescription] = useState("");
  return (
    <form
      className="card form"
      onSubmit={async (e) => {
        e.preventDefault();
        const r = await run(
          () => api.post("/me/report-staff", { staffCode: staffCode.trim().toUpperCase(), description }),
          t("Report sent to the senior Bharosa team."),
        );
        if (r) {
          setStaffCode("");
          setDescription("");
        }
      }}
    >
      <h3>{t("Report a staff member")}</h3>
      <p className="small muted">{t("Asked for money? Rude? Did something you did not agree to? Tell the senior team.")}</p>
      <Field label={t("Staff code")} hint={t("For example BH-007. Write what you know.")}>
        <input className="ltr" value={staffCode} onChange={(e) => setStaffCode(e.target.value)} placeholder="BH-007" maxLength={20} required />
      </Field>
      <Field label={t("What happened?")}>
        <textarea dir="auto" value={description} onChange={(e) => setDescription(e.target.value)} minLength={5} maxLength={3000} required />
      </Field>
      <button className="btn btn-danger btn-block" disabled={busy}>
        {t("Send report")}
      </button>
    </form>
  );
}

export default function MyActivity() {
  const { meta } = useAuth();
  const state = useLoad(() => api.get<ActivityEntry[]>("/me/activity"));
  const [tab, setTab] = useState<"all" | "staff">("all");
  const [disputing, setDisputing] = useState<ActivityEntry | null>(null);
  const all = state.data ?? [];
  const staffCount = all.filter((e) => e.by.kind === "STAFF").length;

  const markDisputed = (id: number) => {
    state.setData((list) => (list ? list.map((e) => (e.id === id ? { ...e, disputed: true } : e)) : list));
  };

  return (
    <div className="split">
      <div>
        <PageHeader
          title={t("Activity on my account")}
          subtitle={t("Everything done on your account, including anything our staff did for you. If something is wrong, tell us.")}
        />
        <Tabs
          value={tab}
          onChange={setTab}
          tabs={[
            { value: "all", label: t("All") },
            { value: "staff", label: t("By our staff"), count: staffCount },
          ]}
        />
        <Loaded state={state}>
          {(list) => {
            const shown = tab === "staff" ? list.filter((e) => e.by.kind === "STAFF") : list;
            return shown.length === 0 ? (
              <Empty title={t("Nothing yet")}>{t("Things done on your account will show here.")}</Empty>
            ) : (
              <div className="stack-sm">
                {shown.map((e) => {
                  const byStaff = e.by.kind === "STAFF";
                  return (
                    <div
                      key={e.id}
                      className={`card stack-sm ${e.onBehalfOf ? "card-highlight" : ""}`}
                      style={byStaff && !e.onBehalfOf ? { borderInlineStart: "4px solid var(--brand)" } : undefined}
                    >
                      <div className="row-between">
                        <strong dir="auto">{describe(e)}</strong>
                        <span className="muted small nowrap" title={new Date(e.at).toLocaleString()}>
                          {timeAgo(e.at)}
                        </span>
                      </div>
                      <span className="small">
                        {byStaff ? <span className="staff-code">{who(e)}</span> : <span className="muted">{who(e)}</span>}
                        {e.onBehalfOf && <span className="muted"> · {t("did this for you")}</span>}
                      </span>
                      {e.onBehalfOf && e.reason && (
                        <div className="callout callout-info small">
                          <span>
                            <strong>{t("How you agreed:")}</strong> <span dir="auto">{e.reason}</span>
                          </span>
                        </div>
                      )}
                      {!e.onBehalfOf && e.reason && (
                        <span className="small">
                          <strong>{t("Reason:")}</strong> <span dir="auto">{e.reason}</span>
                        </span>
                      )}
                      {byStaff &&
                        (e.disputed ? (
                          <span className="pill pill-warn" style={{ alignSelf: "flex-start" }}>
                            {t("Reported")}
                          </span>
                        ) : (
                          <div>
                            <button
                              className={e.onBehalfOf ? "btn btn-danger-ghost btn-sm" : "btn btn-ghost btn-sm"}
                              onClick={() => setDisputing(e)}
                            >
                              {e.onBehalfOf ? t("I did not agree") : t("Report this")}
                            </button>
                          </div>
                        ))}
                    </div>
                  );
                })}
              </div>
            );
          }}
        </Loaded>
      </div>
      <aside className="stack">
        <StaffCheck />
        <ReportStaffForm />
        {meta?.supportPhone && (
          <p className="small muted">
            {t("Bharosa helpline:")}{" "}
            <a className="ltr" href={`tel:${meta.supportPhone}`}>
              {meta.supportPhone}
            </a>
          </p>
        )}
      </aside>
      {disputing && <DisputeModal entry={disputing} onClose={() => setDisputing(null)} onDone={() => markDisputed(disputing.id)} />}
    </div>
  );
}
