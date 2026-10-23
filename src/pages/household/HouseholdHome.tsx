import { Link } from "react-router-dom";
import { api } from "../../api";
import { useAuth } from "../../auth";
import type { Engagement, Job } from "../../types";
import { categoryLabel, Empty, humanize, Loaded, Money, PageHeader, Pill, timeAgo, useLoad } from "../../ui";

export default function HouseholdHome() {
  const { user } = useAuth();
  const jobs = useLoad(() => api.get<Job[]>("/jobs"));
  const hires = useLoad(() => api.get<Engagement[]>("/engagements"));
  const due = (hires.data ?? []).filter((e) => e.canEndorse);

  return (
    <div>
      <PageHeader
        title={`Salaam, ${user?.name.split(" ")[0]}`}
        subtitle="Post a job with your price, or find a verified worker directly."
        action={
          <div className="row">
            <Link to="/household/workers" className="btn btn-ghost">
              Find workers
            </Link>
            <Link to="/household/jobs/new" className="btn">
              Post a job
            </Link>
          </div>
        }
      />

      {due.length > 0 && (
        <div className="stack-sm" style={{ marginBottom: 20 }}>
          {due.map((e) => (
            <div key={e.id} className="callout callout-accent">
              <span>
                <strong>{e.worker.name}</strong> has worked with you for {e.daysTogether} days. Would you vouch for them?
                Your endorsement helps them find work.
              </span>
              <Link to="/household/hires" className="btn btn-sm">
                Endorse now
              </Link>
            </div>
          ))}
        </div>
      )}

      <h2 style={{ marginBottom: 12 }}>Your jobs</h2>
      <Loaded state={jobs}>
        {(list) =>
          list.length === 0 ? (
            <Empty title="No jobs yet">
              <Link to="/household/jobs/new">Post your first job</Link>. Workers nearby will respond with their price.
            </Empty>
          ) : (
            <div className="grid">
              {list.map((j) => (
                <Link key={j.id} to={`/household/jobs/${j.id}`} className={`card card-link stack-sm ${j.status === "OPEN" && j.pendingOffers ? "card-highlight" : ""}`}>
                  <div className="row-between">
                    <span className="card-title">{j.title}</span>
                    <Pill value={j.status} />
                  </div>
                  <div className="card-meta">
                    <span>{categoryLabel(j.category)}</span>
                    <span>{humanize(j.schedule)}</span>
                    <span>Posted {timeAgo(j.createdAt)}</span>
                  </div>
                  <div className="row-between">
                    <Money amount={j.offeredWage} period={j.wagePeriod} />
                    {j.status === "OPEN" && (
                      <span className={j.pendingOffers ? "pill pill-warn" : "muted small"}>
                        {j.pendingOffers ? `${j.pendingOffers} response${j.pendingOffers > 1 ? "s" : ""}` : "No responses yet"}
                      </span>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )
        }
      </Loaded>
    </div>
  );
}
