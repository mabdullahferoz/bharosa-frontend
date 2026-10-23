import { Link } from "react-router-dom";
import type { PublicWorker } from "../types";
import { Avatar, categoryLabel, humanize, Money, Stars, TrustBadges } from "../ui";

export default function WorkerCard({ worker, to }: { worker: PublicWorker; to?: string }) {
  const p = worker.profile;
  const body = (
    <div className="stack-sm">
      <div className="row" style={{ alignItems: "flex-start", flexWrap: "nowrap" }}>
        <Avatar name={worker.name} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="row-between">
            <span className="card-title">{worker.name}</span>
            {p?.expectedWage ? <Money amount={p.expectedWage} period="MONTHLY" /> : null}
          </div>
          <div className="card-meta">
            <span>{p?.skills.map(categoryLabel).join(" · ") || "No skills listed"}</span>
            {p && <span>{p.experienceYears} yrs exp.</span>}
            <span>
              {worker.area ? `${worker.area}, ` : ""}
              {worker.city}
            </span>
            {p?.availability && <span>{humanize(p.availability)}</span>}
          </div>
        </div>
      </div>
      <TrustBadges trust={worker.trust} />
      {worker.trust.averageRating && (
        <div className="small muted">
          <Stars value={worker.trust.averageRating} /> {worker.trust.averageRating} from families
        </div>
      )}
      {p?.bio && <p className="small muted" style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{p.bio}</p>}
    </div>
  );
  return to ? (
    <Link to={to} className="card card-link">
      {body}
    </Link>
  ) : (
    <div className="card">{body}</div>
  );
}
