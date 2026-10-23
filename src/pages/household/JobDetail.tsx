import { Link, useParams } from "react-router-dom";
import { api } from "../../api";
import type { Job } from "../../types";
import OfferThread from "../../components/OfferThread";
import WorkerCard from "../../components/WorkerCard";
import { categoryLabel, Empty, formatDate, humanize, Loaded, Money, PageHeader, Pill, useAction, useLoad } from "../../ui";

export default function JobDetail() {
  const { id } = useParams();
  const state = useLoad(() => api.get<Job>(`/jobs/${id}`), [id]);
  const { busy, run } = useAction();

  return (
    <Loaded state={state}>
      {(job) => {
        const offers = job.offers ?? [];
        const pending = offers.filter((o) => o.status === "PENDING");
        const rest = offers.filter((o) => o.status !== "PENDING");
        return (
          <div>
            <PageHeader
              title={job.title}
              subtitle={
                <span className="row">
                  <Pill value={job.status} />
                  <span>
                    {categoryLabel(job.category)} · {humanize(job.schedule)} · {job.area ? `${job.area}, ` : ""}
                    {job.city}
                  </span>
                </span>
              }
              action={
                job.status === "OPEN" && (
                  <button
                    className="btn btn-danger-ghost btn-sm"
                    disabled={busy}
                    onClick={async () => {
                      if (!confirm("Cancel this job? Workers who responded will be told.")) return;
                      await run(() => api.post(`/jobs/${job.id}/cancel`), "Job cancelled");
                      void state.reload();
                    }}
                  >
                    Cancel job
                  </button>
                )
              }
            />
            <div className="split">
              <div className="stack">
                {job.status === "FILLED" && (
                  <div className="callout callout-ok">
                    <span>This job is filled. Contact details and endorsements are in My hires.</span>
                    <Link to="/household/hires" className="btn btn-sm">
                      My hires
                    </Link>
                  </div>
                )}
                <h2>Responses {pending.length > 0 && <span className="muted">({pending.length} open)</span>}</h2>
                {offers.length === 0 && (
                  <Empty title="No responses yet">
                    Workers will see your job and respond. You can also <Link to="/household/workers">invite a worker directly</Link>.
                  </Empty>
                )}
                {[...pending, ...rest].map((o) => (
                  <div key={o.id} className="card stack-sm">
                    {o.worker && <WorkerCard worker={o.worker} to={`/household/workers/${o.worker.id}`} />}
                    <div className="small muted">{o.initiator === "HOUSEHOLD" ? "You invited this worker" : "Responded to your job"}</div>
                    <OfferThread offer={o} side="HOUSEHOLD" period={job.wagePeriod} onChanged={state.reload} />
                  </div>
                ))}
              </div>
              <aside className="card stack-sm">
                <h3>Your offer</h3>
                <Money amount={job.offeredWage} period={job.wagePeriod} />
                {job.workingHours && <span className="small">Hours: {job.workingHours}</span>}
                {job.weeklyRestDay && <span className="small">Weekly day off: {humanize(job.weeklyRestDay)}</span>}
                {job.status === "OPEN" && job.expiresAt && <span className="small muted">Open until {formatDate(job.expiresAt)}</span>}
                {job.status === "EXPIRED" && <span className="small muted">This job closed without a hire. You can post it again.</span>}
                {job.requireVerified && <span className="badge badge-verified" style={{ alignSelf: "flex-start" }}>Police verified only</span>}
                {job.description && <p className="muted small" style={{ whiteSpace: "pre-wrap" }}>{job.description}</p>}
                <hr />
                <p className="small muted">
                  Accept a worker's price to hire them. Their phone number is shared once you agree. You can also offer a different price.
                </p>
              </aside>
            </div>
          </div>
        );
      }}
    </Loaded>
  );
}
