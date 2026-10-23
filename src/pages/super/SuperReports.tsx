import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { api } from "../../api";
import { Empty, Field, Loaded, Modal, PageHeader, Pill, Tabs, humanize, timeAgo, useAction, useLoad } from "../../ui";
import { formatDateTime, prettyDetails, type StaffReport } from "./superTypes";

type Tab = "OPEN" | "INVESTIGATING" | "CLOSED";
type Decision = "INVESTIGATING" | "RESOLVED" | "DISMISSED";

const inTab = (r: StaffReport, tab: Tab) => (tab === "CLOSED" ? r.status === "RESOLVED" || r.status === "DISMISSED" : r.status === tab);

const DECISION_TEXT: Record<Decision, { title: string; label: string; hint: string; button: string }> = {
  INVESTIGATING: {
    title: "Start investigating",
    label: "Note (optional)",
    hint: "Marks the report as being looked into. The reporter is not notified yet.",
    button: "Mark investigating",
  },
  RESOLVED: {
    title: "Resolve report",
    label: "Outcome (required)",
    hint: "What you found and what was done (e.g. action reversed, staff warned, permission removed). The reporter is notified with this text.",
    button: "Resolve",
  },
  DISMISSED: {
    title: "Dismiss report",
    label: "Why it is dismissed (required)",
    hint: "Explain politely what you checked. The reporter is notified with this text.",
    button: "Dismiss",
  },
};

function DecideModal({ report, decision, onClose, onDone }: { report: StaffReport; decision: Decision; onClose: () => void; onDone: () => void }) {
  const { busy, run } = useAction();
  const [text, setText] = useState("");
  const t = DECISION_TEXT[decision];
  const required = decision !== "INVESTIGATING";
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const r = await run(() => api.post(`/super/reports/${report.id}`, { status: decision, resolution: text.trim() || undefined }), "Report updated");
    if (r) onDone();
  };
  return (
    <Modal title={t.title} onClose={onClose}>
      <form className="form" onSubmit={submit}>
        <p className="muted small">
          Report by {report.reporter.name}: “{report.description.slice(0, 160)}
          {report.description.length > 160 ? "…" : ""}”
        </p>
        <Field label={t.label} hint={t.hint}>
          <textarea value={text} onChange={(e) => setText(e.target.value)} required={required} minLength={required ? 3 : undefined} maxLength={2000} />
        </Field>
        <div className="row">
          <button className={`btn ${decision === "DISMISSED" ? "btn-ghost" : ""}`} disabled={busy || (required && text.trim().length < 3)}>
            {busy ? "Saving…" : t.button}
          </button>
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
        </div>
      </form>
    </Modal>
  );
}

function ReportCard({ r, onDecide }: { r: StaffReport; onDecide: (d: Decision) => void }) {
  const code = r.staff?.staffProfile?.staffCode ?? r.staffCode;
  const e = r.auditEntry;
  const closed = r.status === "RESOLVED" || r.status === "DISMISSED";
  return (
    <div className="card stack-sm">
      <div className="row-between">
        <div className="row">
          {e && <span className="pill pill-danger">"I did not agree"</span>}
          <Pill value={r.status} label={humanize(r.status)} />
          <span className="muted small">{timeAgo(r.createdAt)}</span>
        </div>
        <span className="small">
          About{" "}
          {r.staff ? (
            <Link to={`/super/audit?actorId=${encodeURIComponent(r.staff.id)}`}>
              <span className="staff-code mono">{code}</span> {r.staff.name}
            </Link>
          ) : code ? (
            <span className="staff-code mono">{code} (unknown code)</span>
          ) : (
            <span className="muted">no staff named</span>
          )}
        </span>
      </div>
      <p dir="auto" style={{ whiteSpace: "pre-wrap" }}>
        {r.description}
      </p>
      <p className="muted small">
        From <strong>{r.reporter.name}</strong> ({humanize(r.reporter.role)}) ·{" "}
        <Link to={`/super/audit?subjectUserId=${encodeURIComponent(r.reporter.id)}`}>their history</Link>
      </p>

      {e && (
        <div className="callout callout-warn" style={{ display: "block" }}>
          <strong>Disputed action #{e.id}:</strong> {humanize(e.action)}
          {e.onBehalfOf ? " (done on their behalf)" : ""} · {formatDateTime(e.createdAt)}
          {e.reason && (
            <div className="small" style={{ marginTop: 4 }}>
              Staff reason: “{e.reason}”
            </div>
          )}
          {e.details && (
            <details style={{ marginTop: 6 }}>
              <summary className="small" style={{ cursor: "pointer" }}>
                Details
              </summary>
              <pre className="mono" style={{ whiteSpace: "pre-wrap", wordBreak: "break-word", margin: "6px 0 0" }}>
                {prettyDetails(e.details)}
              </pre>
            </details>
          )}
        </div>
      )}

      {r.resolution && (
        <div className={`callout ${closed ? "callout-ok" : "callout-info"}`} style={{ display: "block" }}>
          <strong>{closed ? "Outcome" : "Note"}:</strong> {r.resolution}
          {r.handledBy && <span className="muted small"> · {r.handledBy.name}</span>}
        </div>
      )}

      {!closed && (
        <div className="row">
          {r.status === "OPEN" && (
            <button className="btn btn-ghost btn-sm" onClick={() => onDecide("INVESTIGATING")}>
              Investigate
            </button>
          )}
          <button className="btn btn-sm" onClick={() => onDecide("RESOLVED")}>
            Resolve
          </button>
          <button className="btn btn-ghost btn-sm" onClick={() => onDecide("DISMISSED")}>
            Dismiss
          </button>
        </div>
      )}
    </div>
  );
}

export default function SuperReports() {
  const reports = useLoad(() => api.get<StaffReport[]>("/super/reports"));
  const [tab, setTab] = useState<Tab>("OPEN");
  const [deciding, setDeciding] = useState<{ report: StaffReport; decision: Decision } | null>(null);

  const all = reports.data ?? [];
  const count = (t: Tab) => all.filter((r) => inTab(r, t)).length;

  return (
    <div className="stack">
      <PageHeader
        title="Staff reports"
        subtitle="Workers and families can report a staff member, or tap “I did not agree” on something staff did for them. Only super admins see these."
      />
      <Tabs<Tab>
        value={tab}
        onChange={setTab}
        tabs={[
          { value: "OPEN", label: "Open", count: count("OPEN") },
          { value: "INVESTIGATING", label: "Investigating", count: count("INVESTIGATING") },
          { value: "CLOSED", label: "Closed" },
        ]}
      />
      <Loaded state={reports}>
        {(list) => {
          const shown = list.filter((r) => inTab(r, tab));
          if (!shown.length)
            return (
              <Empty title={tab === "CLOSED" ? "No closed reports" : "Nothing waiting"}>
                {tab === "OPEN" ? "No new reports about staff. Good sign." : undefined}
              </Empty>
            );
          return (
            <div className="stack">
              {shown.map((r) => (
                <ReportCard key={r.id} r={r} onDecide={(decision) => setDeciding({ report: r, decision })} />
              ))}
            </div>
          );
        }}
      </Loaded>
      {deciding && (
        <DecideModal
          report={deciding.report}
          decision={deciding.decision}
          onClose={() => setDeciding(null)}
          onDone={() => {
            setDeciding(null);
            void reports.reload();
          }}
        />
      )}
    </div>
  );
}
