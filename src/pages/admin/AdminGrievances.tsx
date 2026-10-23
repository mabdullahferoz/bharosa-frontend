// Worker grievances: workers' complaints about households (harassment, unpaid wages, overwork…).
import { useState } from "react";
import { Link } from "react-router-dom";
import { api, qs } from "../../api";
import { hasPerm, useAuth } from "../../auth";
import type { Grievance } from "../../types";
import { Empty, Field, formatDate, humanize, Loaded, Modal, PageHeader, Pill, Tabs, timeAgo, useAction, useLoad } from "../../ui";

type Tab = "active" | "RESOLVED" | "DISMISSED";
type Decision = "UNDER_REVIEW" | "RESOLVED" | "DISMISSED";

const RANK: Record<string, number> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
const serious = (g: Grievance) => g.severity === "HIGH" || g.severity === "CRITICAL";

function HandleModal({ g, isSuper, onClose, onDone }: { g: Grievance; isSuper: boolean; onClose: () => void; onDone: () => void }) {
  const { busy, run } = useAction();
  const [decision, setDecision] = useState<Decision>(g.status === "OPEN" ? "UNDER_REVIEW" : "RESOLVED");
  const [resolution, setResolution] = useState("");
  const cannotDismiss = serious(g) && !isSuper;
  return (
    <Modal title={`Grievance: ${g.worker?.name} about ${g.household?.name}`} onClose={onClose}>
      <form
        className="form"
        onSubmit={async (e) => {
          e.preventDefault();
          const r = await run(
            () => api.post(`/grievances/${g.id}/handle`, { status: decision, resolution: resolution.trim() || undefined }),
            decision === "UNDER_REVIEW" ? "Marked as under review" : "Saved. The worker has been notified.",
          );
          if (r) {
            onDone();
            onClose();
          }
        }}
      >
        <div className="card stack-sm" style={{ background: "var(--surface-2)", boxShadow: "none" }}>
          <div className="row">
            <Pill value={g.severity} />
            <strong>{humanize(g.category)}</strong>
          </div>
          <p className="small" style={{ whiteSpace: "pre-wrap" }}>
            {g.description}
          </p>
        </div>
        <div className="chips">
          {g.status === "OPEN" && (
            <button type="button" className="chip" aria-pressed={decision === "UNDER_REVIEW"} onClick={() => setDecision("UNDER_REVIEW")}>
              Mark under review
            </button>
          )}
          <button type="button" className="chip" aria-pressed={decision === "RESOLVED"} onClick={() => setDecision("RESOLVED")}>
            Resolve
          </button>
          <button type="button" className="chip" aria-pressed={decision === "DISMISSED"} disabled={cannotDismiss} onClick={() => setDecision("DISMISSED")}>
            Dismiss
          </button>
        </div>
        {cannotDismiss && <p className="small muted">Only a super admin can dismiss a High or Critical grievance, so serious reports can't be quietly buried.</p>}
        {decision !== "UNDER_REVIEW" && (
          <Field label="What was done (shown to the worker)">
            <textarea
              value={resolution}
              onChange={(e) => setResolution(e.target.value)}
              minLength={3}
              maxLength={2000}
              required
              rows={4}
              placeholder={decision === "RESOLVED" ? "e.g. Called the family; unpaid wages of Rs 20,000 paid on 12 Oct, confirmed with the worker" : "Why no action is needed"}
            />
          </Field>
        )}
        <button className={`btn btn-block ${decision === "DISMISSED" ? "btn-danger" : ""}`} disabled={busy}>
          {busy ? "Saving…" : decision === "UNDER_REVIEW" ? "Mark under review" : decision === "RESOLVED" ? "Mark resolved" : "Dismiss"}
        </button>
      </form>
    </Modal>
  );
}

export default function AdminGrievances() {
  const { user } = useAuth();
  const canHandle = hasPerm(user, "COMPLAINTS");
  const isSuper = user?.role === "SUPER_ADMIN";
  const [tab, setTab] = useState<Tab>("active");
  const state = useLoad(() => api.get<Grievance[]>(`/grievances${qs({ status: tab === "active" ? "" : tab })}`), [tab]);
  const [handling, setHandling] = useState<Grievance | null>(null);
  const list = (state.data ?? [])
    .filter((g) => (tab === "active" ? g.status === "OPEN" || g.status === "UNDER_REVIEW" : true))
    .sort((a, b) => (tab === "active" ? RANK[a.severity] - RANK[b.severity] : 0));

  return (
    <div>
      <PageHeader title="Worker grievances" subtitle="Problems workers report about families: harassment, unpaid wages, overwork, unsafe conditions. Most serious first." />
      <div className="callout callout-info small" style={{ marginBottom: 14 }}>
        <span>
          High and Critical reports also alert the super admins, and only a super admin can dismiss them. The family is not told which worker
          reported them; protect the worker when you call.
          {!canHandle && " You can view grievances, but handling them needs the COMPLAINTS permission."}
        </span>
      </div>
      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { value: "active", label: "To handle" },
          { value: "RESOLVED", label: "Resolved" },
          { value: "DISMISSED", label: "Dismissed" },
        ]}
      />
      <Loaded state={state}>
        {() =>
          list.length === 0 ? (
            <Empty title={tab === "active" ? "No open grievances" : "Nothing here"} />
          ) : (
            <div className="stack">
              {list.map((g) => {
                const open = g.status === "OPEN" || g.status === "UNDER_REVIEW";
                return (
                  <div key={g.id} className={`card stack-sm ${open && serious(g) ? "card-highlight" : ""}`}>
                    <div className="row-between">
                      <div className="row">
                        <Pill value={g.severity} />
                        <strong>{humanize(g.category)}</strong>
                        <span>
                          about <strong>{g.household?.name}</strong>
                        </span>
                      </div>
                      <Pill value={g.status} />
                    </div>
                    <p style={{ whiteSpace: "pre-wrap" }}>{g.description}</p>
                    <div className="card-meta">
                      <span>
                        Worker: <Link to={`/admin/workers/${g.workerId}`}>{g.worker?.name}</Link>
                      </span>
                      {g.household?.phone && (
                        <span>
                          Family phone: <a href={`tel:${g.household.phone}`}>{g.household.phone}</a>
                        </span>
                      )}
                      {g.engagement && <span>Job: {g.engagement.title}</span>}
                      <span>{timeAgo(g.createdAt)}</span>
                      {g.filedByStaffId && <span>Filed by staff for the worker</span>}
                    </div>
                    {g.resolution && (
                      <div className="callout callout-info small">
                        <span>
                          <strong>{g.status === "UNDER_REVIEW" ? "Note" : "Outcome"}</strong>
                          {g.handledBy && <> ({g.handledBy.name})</>}: {g.resolution}
                        </span>
                      </div>
                    )}
                    {!g.resolution && g.handledBy && <span className="small muted">Being handled by {g.handledBy.name}</span>}
                    {canHandle && open && (
                      <div className="row">
                        <button className="btn btn-sm" onClick={() => setHandling(g)}>
                          {g.status === "OPEN" ? "Take up / decide" : "Resolve or dismiss"}
                        </button>
                        {hasPerm(user, "WORKERS_ASSIST") && (
                          <Link className="btn btn-ghost btn-sm" to={`/admin/workers/${g.workerId}/assist`}>
                            Worker's case notes
                          </Link>
                        )}
                      </div>
                    )}
                    {!open && <span className="small muted">Filed {formatDate(g.createdAt)}</span>}
                  </div>
                );
              })}
            </div>
          )
        }
      </Loaded>
      {handling && <HandleModal g={handling} isSuper={isSuper} onClose={() => setHandling(null)} onDone={state.reload} />}
    </div>
  );
}
