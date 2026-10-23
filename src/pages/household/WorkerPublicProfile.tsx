import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../../api";
import type { Engagement, Job, PublicWorker } from "../../types";
import ComplaintModal from "../../components/ComplaintModal";
import {
  Avatar, categoryLabel, Empty, EndorsementStack, Field, formatDate, humanize, Loaded, Modal, Money, Stars, TrustBadges, rupees, useAction, useLoad,
} from "../../ui";

function InviteModal({ worker, onClose }: { worker: PublicWorker; onClose: () => void }) {
  const jobs = useLoad(() => api.get<Job[]>("/jobs?status=OPEN"));
  const { busy, run } = useAction();
  const [jobId, setJobId] = useState("");
  const [amount, setAmount] = useState("");
  const [message, setMessage] = useState("");
  const job = jobs.data?.find((j) => j.id === jobId);

  return (
    <Modal title={`Invite ${worker.name}`} onClose={onClose}>
      <Loaded state={jobs}>
        {(list) =>
          list.length === 0 ? (
            <Empty title="You have no open jobs">
              <Link to="/household/jobs/new">Post a job</Link> first, then invite workers to it.
            </Empty>
          ) : (
            <form
              className="form"
              onSubmit={async (e) => {
                e.preventDefault();
                const r = await run(
                  () => api.post(`/jobs/${jobId}/invite`, { workerId: worker.id, amount: amount ? Number(amount) : undefined, message: message || undefined }),
                  `Invitation sent to ${worker.name}`,
                );
                if (r) onClose();
              }}
            >
              <Field label="Which job?">
                <select value={jobId} onChange={(e) => setJobId(e.target.value)} required>
                  <option value="">Choose a job</option>
                  {list.map((j) => (
                    <option key={j.id} value={j.id}>
                      {j.title} ({rupees(j.offeredWage)})
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Wage you offer (Rs)" hint={job ? `Job's posted wage: ${rupees(job.offeredWage)}` : undefined}>
                <input type="number" min={100} step={100} placeholder={job ? String(job.offeredWage) : ""} value={amount} onChange={(e) => setAmount(e.target.value)} />
              </Field>
              <Field label="Message (optional)">
                <input value={message} onChange={(e) => setMessage(e.target.value)} maxLength={500} />
              </Field>
              <button className="btn btn-block" disabled={busy || !jobId}>
                Send invitation
              </button>
            </form>
          )
        }
      </Loaded>
    </Modal>
  );
}

export default function WorkerPublicProfile() {
  const { id } = useParams();
  const state = useLoad(() => api.get<PublicWorker>(`/workers/${id}`), [id]);
  const hires = useLoad(() => api.get<Engagement[]>("/engagements"));
  const [inviting, setInviting] = useState(false);
  const [complaining, setComplaining] = useState(false);
  const hiredBefore = hires.data?.find((e) => e.workerId === id);

  return (
    <Loaded state={state}>
      {(w) => {
        const p = w.profile;
        return (
          <div className="split">
            <div className="stack">
              <div className="card stack">
                <div className="row" style={{ flexWrap: "nowrap", alignItems: "flex-start" }}>
                  <Avatar name={w.name} size={64} />
                  <div style={{ flex: 1 }}>
                    <h1>{w.name}</h1>
                    <div className="card-meta">
                      <span>{p?.skills.map(categoryLabel).join(" · ")}</span>
                      <span>
                        {w.area ? `${w.area}, ` : ""}
                        {w.city}
                      </span>
                      <span>Member since {formatDate(w.memberSince)}</span>
                    </div>
                  </div>
                </div>
                <TrustBadges trust={w.trust} />
                <EndorsementStack endorsements={w.endorsements} />
                {w.trust.badgeSuspended && w.trust.verificationStatus === "VERIFIED" && (
                  <div className="callout callout-warn">
                    This worker's Verified badge is suspended after a complaint review by our team.
                  </div>
                )}
                {p?.bio && <p style={{ whiteSpace: "pre-wrap" }}>{p.bio}</p>}
                {p && (
                  <dl className="kv">
                    <dt>Experience</dt>
                    <dd>{p.experienceYears} years</dd>
                    <dt>Availability</dt>
                    <dd>{humanize(p.availability)}</dd>
                    {p.expectedWage ? (
                      <>
                        <dt>Expects</dt>
                        <dd>
                          <Money amount={p.expectedWage} period="MONTHLY" />
                        </dd>
                      </>
                    ) : null}
                    {p.hometown && (
                      <>
                        <dt>From</dt>
                        <dd>{p.hometown}</dd>
                      </>
                    )}
                    <dt>Languages</dt>
                    <dd>{p.languages}</dd>
                    {p.verifiedAt && (
                      <>
                        <dt>Police verified on</dt>
                        <dd>{formatDate(p.verifiedAt)}</dd>
                      </>
                    )}
                    <dt>Placements</dt>
                    <dd>{w.trust.placements}</dd>
                  </dl>
                )}
              </div>

              <div className="card stack">
                <div className="stack-sm">
                  <h2>Endorsements</h2>
                  <EndorsementStack endorsements={w.endorsements} large max={6} />
                </div>
                {w.endorsements.filter((e) => e.trustworthy).length === 0 ? (
                  <p className="muted">Families are asked to vouch after one month of work.</p>
                ) : (
                  w.endorsements
                    .filter((e) => e.trustworthy)
                    .map((e) => (
                      <div key={e.id} className="row" style={{ alignItems: "flex-start", flexWrap: "nowrap", gap: 12, borderTop: "1px solid var(--line)", paddingTop: 14 }}>
                        {e.type === "PLATFORM" ? (
                          <span className="avatar" style={{ width: 40, height: 40, background: "var(--brand)", color: "#fff", fontSize: 15 }} aria-hidden>
                            B
                          </span>
                        ) : (
                          <Avatar name={e.endorser.name} size={40} />
                        )}
                        <div className="stack-sm" style={{ gap: 4, flex: 1, minWidth: 0 }}>
                          <div className="row-between">
                            <strong>
                              {e.endorser.name}
                              {e.endorser.area ? <span className="muted" style={{ fontWeight: 500 }}> · {e.endorser.area}</span> : null}
                            </strong>
                            <Stars value={e.rating} />
                          </div>
                          {e.comment && <p dir="auto">“{e.comment}”</p>}
                          <span className="muted small">
                            {e.type === "PLATFORM" ? "Endorsed by the Bharosa team" : "Employed this worker for over a month"} · {formatDate(e.createdAt)}
                          </span>
                        </div>
                      </div>
                    ))
                )}
              </div>
            </div>

            <aside className="stack">
              <div className="card stack-sm">
                <h3>Hire {w.name.split(" ")[0]}</h3>
                <p className="small muted">Invite them to one of your open jobs with your price. They can accept or offer another price.</p>
                <button className="btn btn-block" onClick={() => setInviting(true)}>
                  Invite to a job
                </button>
              </div>
              <div className="card stack-sm small">
                <h3>What the badges mean</h3>
                <p><strong>Police verified:</strong> our team got a police character certificate for this worker.</p>
                <p><strong>CNIC held by team:</strong> we keep their original CNIC safely while they work through us.</p>
                <p><strong>Team endorsed:</strong> our team knows this worker personally.</p>
                <p><strong>Families vouch:</strong> families who employed them for over a month say they are trustworthy.</p>
              </div>
              {hiredBefore && (
                <button className="btn btn-danger-ghost" onClick={() => setComplaining(true)}>
                  Report a problem
                </button>
              )}
            </aside>
            {inviting && <InviteModal worker={w} onClose={() => setInviting(false)} />}
            {complaining && hiredBefore && (
              <ComplaintModal workerId={w.id} workerName={w.name} engagementId={hiredBefore.id} onClose={() => setComplaining(false)} />
            )}
          </div>
        );
      }}
    </Loaded>
  );
}
