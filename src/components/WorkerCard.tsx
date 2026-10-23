import { Link } from "react-router-dom";
import { MapPin } from "lucide-react";
import type { PublicWorker } from "../types";
import { Avatar, categoryLabel, EndorsementStack, humanize, Money, TrustBadges } from "../ui";

/** A worker as families see them: name, work, trust badges, who vouches, and the wage they ask. */
export default function WorkerCard({ worker, to }: { worker: PublicWorker; to?: string }) {
  const p = worker.profile;
  const body = (
    <div className="worker-card">
      <div className="top">
        <Avatar name={worker.name} size={52} />
        <div style={{ minWidth: 0 }}>
          <div className="name">{worker.name}</div>
          <div className="card-meta">
            <span>{p?.skills.map(categoryLabel).join(" · ") || "No skills listed"}</span>
            {p && <span>{p.experienceYears} yrs exp.</span>}
          </div>
        </div>
      </div>
      <TrustBadges trust={worker.trust} />
      {p?.bio && <p className="bio">{p.bio}</p>}
      <EndorsementStack endorsements={worker.endorsements} />
      <div className="foot">
        <span className="place">
          <MapPin size={14} aria-hidden />
          <span>
            {worker.area ? `${worker.area}, ` : ""}
            {worker.city}
            {p?.availability && <> · {humanize(p.availability)}</>}
          </span>
        </span>
        {p?.expectedWage ? (
          <span className="nowrap">
            <Money amount={p.expectedWage} period="MONTHLY" />
          </span>
        ) : null}
      </div>
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
