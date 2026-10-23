import { useState } from "react";
import { Link } from "react-router-dom";
import { api, qs } from "../../api";
import { hasPerm, useAuth } from "../../auth";
import type { Complaint, PerformResult } from "../../types";
import PenaltyFields, { emptyPenalty, penaltyPayload } from "./PenaltyFields";
import { Empty, Field, formatDate, humanize, Loaded, Modal, PageHeader, performMessage, Pill, Tabs, timeAgo, useAction, useLoad, useToast } from "../../ui";

type AdminComplaint = Complaint & { awaitingApproval?: boolean };

/** Mirrors the COMPLAINT_DECISION approval rule in api/src/services/actions.ts. */
function needsSecondPerson(c: Complaint, decision: string, penaltyType: string | null) {
  return (decision === "DISMISSED" && (c.severity === "HIGH" || c.severity === "CRITICAL")) || penaltyType === "SUSPENSION" || penaltyType === "BAN";
}

function ReviewModal({ c, onClose, onDone }: { c: AdminComplaint; onClose: () => void; onDone: () => void }) {
  const { user } = useAuth();
  const toast = useToast();
  const { busy, run } = useAction();
  const canPenalize = hasPerm(user, "PENALTIES");
  const [decision, setDecision] = useState<"UPHELD" | "DISMISSED" | "UNDER_REVIEW">("UPHELD");
  const [resolution, setResolution] = useState("");
  const [withPenalty, setWithPenalty] = useState(canPenalize && (c.severity === "HIGH" || c.severity === "CRITICAL"));
  const [penalty, setPenalty] = useState(emptyPenalty(c.severity === "CRITICAL" ? "BAN" : "BADGE_SUSPENSION"));
  const penalizing = decision === "UPHELD" && canPenalize && withPenalty;
  const second = needsSecondPerson(c, decision, penalizing ? penalty.type : null);

  return (
    <Modal title={`Review: ${c.worker?.name}`} onClose={onClose}>
      <form
        className="form"
        onSubmit={async (e) => {
          e.preventDefault();
          const r = await run(() =>
            api.post<PerformResult>(`/admin/complaints/${c.id}/review`, {
              status: decision,
              resolution: resolution.trim() || undefined,
              penalty: penalizing ? { ...penaltyPayload(penalty), reason: penalty.reason || resolution } : undefined,
            }),
          );
          if (r) {
            toast(performMessage(r, decision === "UNDER_REVIEW" ? "Marked as under review." : "Decision saved. Both sides have been notified."));
            onDone();
            onClose();
          }
        }}
      >
        <div className="card stack-sm" style={{ background: "var(--surface-2)", boxShadow: "none" }}>
          <div className="row">
            <Pill value={c.severity} />
            <strong>{humanize(c.category)}</strong>
          </div>
          <p className="small">{c.description}</p>
          <p className="small" style={{ whiteSpace: "pre-wrap" }}>
            <strong>Worker's side:</strong> {c.workerResponse ?? <span className="muted">No response yet</span>}
          </p>
        </div>
        {!c.workerResponse && decision !== "UNDER_REVIEW" && (
          <div className="callout callout-warn small">The worker has not given their side yet. Consider marking it under review and calling them first.</div>
        )}
        <div className="chips">
          {(["UPHELD", "DISMISSED", "UNDER_REVIEW"] as const).map((d) => (
            <button key={d} type="button" className="chip" aria-pressed={decision === d} onClick={() => setDecision(d)}>
              {d === "UPHELD" ? "Uphold" : d === "DISMISSED" ? "Dismiss" : "Mark under review"}
            </button>
          ))}
        </div>
        {decision !== "UNDER_REVIEW" && (
          <Field label="Resolution (shown to both sides)">
            <textarea value={resolution} onChange={(e) => setResolution(e.target.value)} required minLength={3} placeholder="What you checked and why you decided this" />
          </Field>
        )}
        {decision === "UPHELD" &&
          (canPenalize ? (
            <>
              <label className="check">
                <input type="checkbox" checked={withPenalty} onChange={(e) => setWithPenalty(e.target.checked)} />
                Penalize the worker
              </label>
              {withPenalty && <PenaltyFields value={penalty} onChange={setPenalty} />}
            </>
          ) : (
            <p className="small muted">You can uphold this complaint. A penalty needs a staff member with the PENALTIES permission.</p>
          ))}
        {second && <div className="pending-approval">This decision needs a second staff member to approve it. Nothing changes until they do.</div>}
        <button className={`btn btn-block ${penalizing ? "btn-danger" : ""}`} disabled={busy}>
          {busy ? "Saving…" : second ? "Send for approval" : "Save decision"}
        </button>
      </form>
    </Modal>
  );
}

export default function AdminComplaints() {
  const { user } = useAuth();
  const canDecide = hasPerm(user, "COMPLAINTS");
  const [tab, setTab] = useState<"active" | "UPHELD" | "DISMISSED">("active");
  const state = useLoad(() => api.get<AdminComplaint[]>(`/admin/complaints${qs({ status: tab === "active" ? "" : tab })}`), [tab]);
  const [reviewing, setReviewing] = useState<AdminComplaint | null>(null);
  const list = (state.data ?? []).filter((c) => (tab === "active" ? c.status === "OPEN" || c.status === "UNDER_REVIEW" : true));

  return (
    <div>
      <PageHeader title="Complaints" subtitle="Complaints from families about workers. Most severe first. Hear the worker's side before deciding." />
      <div className="callout callout-info small" style={{ marginBottom: 14 }}>
        <span>
          <strong>Two-person rule:</strong> dismissing a High or Critical complaint, or upholding one with a suspension or ban, goes to another staff
          member for approval. Other decisions, warnings and badge suspensions take effect straight away.
          {!canDecide && " You can view complaints, but deciding them needs the COMPLAINTS permission."}
        </span>
      </div>
      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { value: "active", label: "To review" },
          { value: "UPHELD", label: "Upheld" },
          { value: "DISMISSED", label: "Dismissed" },
        ]}
      />
      <Loaded state={state}>
        {() =>
          list.length === 0 ? (
            <Empty title="Nothing here" />
          ) : (
            <div className="stack">
              {list.map((c) => {
                const open = c.status === "OPEN" || c.status === "UNDER_REVIEW";
                return (
                  <div key={c.id} className="card stack-sm">
                    <div className="row-between">
                      <div className="row">
                        <Pill value={c.severity} />
                        <strong>{humanize(c.category)}</strong>
                        <span>
                          against <Link to={`/admin/workers/${c.workerId}`}>{c.worker?.name}</Link>
                        </span>
                        {c.worker?.workerProfile?.verificationStatus === "VERIFIED" && <span className="badge badge-verified">Verified</span>}
                        {c.worker?.status && c.worker.status !== "ACTIVE" && <Pill value={c.worker.status} />}
                      </div>
                      <span className="row">
                        {c.awaitingApproval && <Pill value="UNDER_REVIEW" label="Awaiting approval" />}
                        <Pill value={c.status} />
                      </span>
                    </div>
                    <p>{c.description}</p>
                    <div className="card-meta">
                      <span>Filed by {c.filedBy?.name}</span>
                      {c.engagement && <span>Job: {c.engagement.title}</span>}
                      <span>{timeAgo(c.createdAt)}</span>
                    </div>
                    <p className="small" style={{ whiteSpace: "pre-wrap" }}>
                      <strong>Worker's side:</strong> {c.workerResponse ?? <span className="muted">No response yet</span>}
                    </p>
                    {!c.workerResponse && open && (
                      <p className="small muted">
                        If the worker can't use the app, a field agent can write down their side from{" "}
                        <Link to={`/admin/workers/${c.workerId}/assist`}>Act for this worker</Link>.
                      </p>
                    )}
                    {c.awaitingApproval && (
                      <div className="pending-approval">
                        A decision is waiting for a second staff member. See <Link to="/admin/approvals">Approvals</Link>.
                      </div>
                    )}
                    {c.resolution && (
                      <div className="callout callout-info small">
                        <span>
                          <strong>Decision</strong> ({c.reviewedBy?.name}, {c.reviewedAt && formatDate(c.reviewedAt)}): {c.resolution}
                        </span>
                      </div>
                    )}
                    {c.penalties && c.penalties.length > 0 && (
                      <div className="row small">
                        Penalty: {c.penalties.map((p) => <Pill key={p.id} value={p.type} />)}
                      </div>
                    )}
                    {canDecide && open && !c.awaitingApproval && (
                      <div>
                        <button className="btn btn-sm" onClick={() => setReviewing(c)}>
                          Review & decide
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )
        }
      </Loaded>
      {reviewing && <ReviewModal c={reviewing} onClose={() => setReviewing(null)} onDone={state.reload} />}
    </div>
  );
}
