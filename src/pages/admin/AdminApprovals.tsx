import { useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../api";
import { hasPerm, useAuth } from "../../auth";
import type { Approval } from "../../types";
import { staffLabel } from "./adminTypes";
import { Empty, Field, formatDate, Loaded, Modal, PageHeader, Pill, Tabs, timeAgo, useAction, useLoad, useToast } from "../../ui";

type Tab = "WAITING" | "DECIDED" | "MINE";

const STATUS_PILL: Record<Approval["status"], string> = {
  PENDING: "PENDING",
  APPROVED: "ACCEPTED",
  REJECTED: "DECLINED",
  CANCELLED: "CANCELLED",
  FAILED: "FAILED",
};

/** Hide full identifiers if a payload happens to carry them. */
function displayValue(key: string, v: unknown): string {
  if (v === null || v === undefined || v === "") return "-";
  if (/cnic/i.test(key) && typeof v === "string") return v.replace(/^(\d{5})-\d{7}/, "$1-*******");
  if (/phone/i.test(key) && typeof v === "string" && v.length > 6) return `${v.slice(0, 4)}*****${v.slice(-2)}`;
  if (typeof v === "object") return JSON.stringify(v);
  if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}T/.test(v)) return formatDate(v);
  return String(v);
}

function staffName(s: Approval["requestedBy"] | null) {
  if (!s) return "-";
  return (
    <>
      {s.name} {s.staffProfile?.staffCode && <span className="mono muted">{s.staffProfile.staffCode}</span>}
    </>
  );
}

function ApprovalCard({ a, myId, onDecide, onCancel, busy }: { a: Approval; myId?: string; onDecide: (a: Approval, d: "approve" | "reject") => void; onCancel: (a: Approval) => void; busy: boolean }) {
  const mine = a.requestedBy.id === myId;
  const failure = a.status === "FAILED" && a.result ? (() => { try { return (JSON.parse(a.result) as { error?: string }).error; } catch { return a.result; } })() : null;
  return (
    <div className="card stack-sm">
      <div className="row-between">
        <span className="row">
          <Pill value={STATUS_PILL[a.status]} label={staffLabel(a.status)} />
          <span className="small muted">{staffLabel(a.type)}</span>
        </span>
        <span className="small muted" title={new Date(a.createdAt).toLocaleString()}>
          {timeAgo(a.createdAt)}
        </span>
      </div>
      <strong>{a.summary}</strong>
      <dl className="kv">
        <dt>Reason</dt>
        <dd>{a.reason}</dd>
        <dt>Requested by</dt>
        <dd>
          {staffName(a.requestedBy)}
          {mine && <span className="muted small"> (you)</span>}
        </dd>
        {a.subjectUser && (
          <>
            <dt>About</dt>
            <dd>
              {a.subjectUser.role === "WORKER" ? <Link to={`/admin/workers/${a.subjectUser.id}`}>{a.subjectUser.name}</Link> : a.subjectUser.name}{" "}
              <span className="muted small">({staffLabel(a.subjectUser.role)})</span>
            </dd>
          </>
        )}
        {a.decidedAt && (
          <>
            <dt>Decided</dt>
            <dd>
              {staffName(a.decidedBy)} · {formatDate(a.decidedAt)}
              {a.decisionNote && <div className="small">"{a.decisionNote}"</div>}
            </dd>
          </>
        )}
      </dl>
      {failure && <div className="callout callout-error small">Approved, but the action failed: {failure}</div>}
      <details>
        <summary className="small muted">Request details</summary>
        <dl className="kv small">
          {Object.entries(a.payload ?? {}).map(([k, v]) => (
            <div key={k} style={{ display: "contents" }}>
              <dt>{staffLabel(k.replace(/([a-z])([A-Z])/g, "$1_$2"))}</dt>
              <dd className={/cnic|phone/i.test(k) ? "masked" : undefined}>{displayValue(k, v)}</dd>
            </div>
          ))}
        </dl>
      </details>
      {a.status === "PENDING" && (
        <div className="row">
          {a.canDecide ? (
            <>
              <button className="btn btn-sm" disabled={busy} onClick={() => onDecide(a, "approve")}>
                Approve
              </button>
              <button className="btn btn-danger-ghost btn-sm" disabled={busy} onClick={() => onDecide(a, "reject")}>
                Reject
              </button>
            </>
          ) : mine ? (
            <span className="small muted">Your request. Another staff member must decide it.</span>
          ) : (
            <span className="small muted">Needs APPROVE permission to decide.</span>
          )}
          {mine && (
            <button className="btn btn-ghost btn-sm" disabled={busy} onClick={() => onCancel(a)}>
              Cancel request
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default function AdminApprovals() {
  const { user } = useAuth();
  const toast = useToast();
  const canApprove = hasPerm(user, "APPROVE");
  const [tab, setTab] = useState<Tab>(canApprove ? "WAITING" : "MINE");
  const all = useLoad(() => api.get<Approval[]>("/approvals"));
  const mineList = useLoad(() => api.get<Approval[]>("/approvals?mine=1"));
  const { busy, run } = useAction();
  const [deciding, setDeciding] = useState<{ a: Approval; d: "approve" | "reject" } | null>(null);
  const [note, setNote] = useState("");

  const reload = () => {
    void all.reload();
    void mineList.reload();
  };

  const state = tab === "MINE" ? mineList : all;
  const filter = (list: Approval[]) =>
    tab === "WAITING" ? list.filter((a) => a.status === "PENDING") : tab === "DECIDED" ? list.filter((a) => a.status !== "PENDING") : list;
  const waitingCount = (all.data ?? []).filter((a) => a.canDecide).length;

  return (
    <div className="stack">
      <PageHeader title="Approvals" subtitle="Two-person rule for sensitive actions." />
      <div className="callout callout-info">
        <span>
          Sensitive actions (final police verification, suspensions and bans, lifting penalties, team endorsements, serious complaint dismissals,
          back-dated placements) are only <strong>requested</strong> by one staff member. Nothing changes until a <strong>different</strong> staff
          member with the APPROVE permission approves it. You can never approve your own request. Super admin requests run immediately but stay in
          the audit log.
        </span>
      </div>
      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { value: "WAITING", label: canApprove ? "Waiting" : "Pending", count: canApprove ? waitingCount : undefined },
          { value: "DECIDED", label: "Decided" },
          { value: "MINE", label: "My requests", count: (mineList.data ?? []).filter((a) => a.status === "PENDING").length },
        ]}
      />
      {!canApprove && tab !== "MINE" && <p className="small muted">You don't have the APPROVE permission, so you only see your own requests here.</p>}
      <Loaded state={state}>
        {(list) => {
          const shown = filter(list);
          return shown.length === 0 ? (
            <Empty title={tab === "WAITING" ? "Nothing waiting" : tab === "DECIDED" ? "No decided requests" : "You haven't requested anything"} />
          ) : (
            <div className="stack-sm">
              {shown.map((a) => (
                <ApprovalCard
                  key={a.id}
                  a={a}
                  myId={user?.id}
                  busy={busy}
                  onDecide={(a, d) => {
                    setNote("");
                    setDeciding({ a, d });
                  }}
                  onCancel={async (a) => {
                    if (!confirm(`Withdraw your request?\n\n${a.summary}`)) return;
                    if (await run(() => api.post(`/approvals/${a.id}/cancel`), "Request cancelled")) reload();
                  }}
                />
              ))}
            </div>
          );
        }}
      </Loaded>

      {deciding && (
        <Modal title={deciding.d === "approve" ? "Approve request" : "Reject request"} onClose={() => setDeciding(null)}>
          <form
            className="form"
            onSubmit={async (e) => {
              e.preventDefault();
              const { a, d } = deciding;
              const r = await run(() => api.post<{ status: string }>(`/approvals/${a.id}/${d}`, { note }));
              if (r) {
                toast(d === "approve" ? "Approved. The action has been carried out." : "Rejected. The requester has been told.");
                setDeciding(null);
                reload();
              } else reload();
            }}
          >
            <p>
              <strong>{deciding.a.summary}</strong>
            </p>
            <p className="small muted">
              Requested by {deciding.a.requestedBy.name} ({deciding.a.requestedBy.staffProfile?.staffCode}): "{deciding.a.reason}"
            </p>
            {deciding.d === "approve" && (
              <div className="pending-approval">Approving carries out the action immediately, under your name as approver.</div>
            )}
            <Field label="Decision note (required)" hint="At least 3 characters. The requester sees this note.">
              <textarea value={note} onChange={(e) => setNote(e.target.value)} minLength={3} required />
            </Field>
            <button className={`btn btn-block ${deciding.d === "reject" ? "btn-danger" : ""}`} disabled={busy || note.trim().length < 3}>
              {deciding.d === "approve" ? "Approve and carry out" : "Reject"}
            </button>
          </form>
        </Modal>
      )}
    </div>
  );
}
