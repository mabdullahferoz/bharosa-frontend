import { useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../api";
import { useAuth } from "../../auth";
import type { Engagement } from "../../types";
import ComplaintModal from "../../components/ComplaintModal";
import TermsModal, { TermsStatus } from "../../components/TermsModal";
import { Avatar, categoryLabel, Empty, Field, formatDate, humanize, Loaded, Modal, Money, PageHeader, Pill, Stars, useAction, useLoad } from "../../ui";

function EndorseModal({ e, onClose, onDone }: { e: Engagement; onClose: () => void; onDone: () => void }) {
  const { busy, run } = useAction();
  const [trustworthy, setTrustworthy] = useState<boolean | null>(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  return (
    <Modal title={`Would you vouch for ${e.worker.name}?`} onClose={onClose}>
      <form
        className="form"
        onSubmit={async (ev) => {
          ev.preventDefault();
          const r = await run(
            () => api.post(`/engagements/${e.id}/endorse`, { trustworthy, rating: trustworthy ? rating : undefined, comment: comment || undefined }),
            trustworthy ? "Thank you! Your endorsement is now on their profile." : "Thank you. Our team will follow up privately.",
          );
          if (r) {
            onDone();
            onClose();
          }
        }}
      >
        <p className="small muted">
          They have worked with you for {e.daysTogether} days. Your answer helps other families, and helps honest workers find good homes.
        </p>
        <div className="role-pick">
          <button type="button" aria-pressed={trustworthy === true} onClick={() => setTrustworthy(true)}>
            <strong>Yes, trustworthy</strong>
            <span className="muted small">Shown on their profile</span>
          </button>
          <button type="button" aria-pressed={trustworthy === false} onClick={() => setTrustworthy(false)}>
            <strong>No, I have concerns</strong>
            <span className="muted small">Sent privately to our team</span>
          </button>
        </div>
        {trustworthy && (
          <Field label="Rating">
            <div className="chips">
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} type="button" className="chip" aria-pressed={rating === n} onClick={() => setRating(n)}>
                  {n} ★
                </button>
              ))}
            </div>
          </Field>
        )}
        <Field label={trustworthy === false ? "What concerns you?" : "A few words for other families (optional)"}>
          <textarea value={comment} onChange={(ev) => setComment(ev.target.value)} maxLength={1000} />
        </Field>
        <button className="btn btn-block" disabled={busy || trustworthy === null}>
          Submit
        </button>
      </form>
    </Modal>
  );
}

export default function Hires() {
  const { meta } = useAuth();
  const state = useLoad(() => api.get<Engagement[]>("/engagements"));
  const { busy, run } = useAction();
  const [endorsing, setEndorsing] = useState<Engagement | null>(null);
  const [complaining, setComplaining] = useState<Engagement | null>(null);
  const [termsFor, setTermsFor] = useState<string | null>(null);

  return (
    <div>
      <PageHeader title="My hires" subtitle="Workers you hired or the team placed with you. Contact numbers are shared once a hire is agreed." />
      <Loaded state={state}>
        {(list) =>
          list.length === 0 ? (
            <Empty title="No hires yet">
              <Link to="/household/workers">Find a worker</Link> or <Link to="/household/jobs/new">post a job</Link>.
            </Empty>
          ) : (
            <div className="stack">
              {list.map((e) => (
                <div key={e.id} className={`card stack-sm ${e.canEndorse ? "card-highlight" : ""}`}>
                  <div className="row-between">
                    <div className="row">
                      <Avatar name={e.worker.name} />
                      <div>
                        <Link to={`/household/workers/${e.workerId}`} className="card-title">
                          {e.worker.name}
                        </Link>
                        <div className="card-meta">
                          <span>{e.title}</span>
                          <span>{categoryLabel(e.category)}</span>
                          <span>Since {formatDate(e.startDate)}</span>
                          {e.source === "PLATFORM_PLACEMENT" && <span>Placed by our team</span>}
                        </div>
                      </div>
                    </div>
                    <div className="row">
                      <Money amount={e.wage} period={e.wagePeriod} />
                      <Pill value={e.status} />
                    </div>
                  </div>
                  {(e.workingHours || e.weeklyRestDay) && (
                    <div className="card-meta">
                      {e.workingHours && <span>Hours: {e.workingHours}</span>}
                      {e.weeklyRestDay && <span>Day off: {humanize(e.weeklyRestDay)}</span>}
                    </div>
                  )}
                  {e.status === "ACTIVE" && !e.myTermsAccepted ? (
                    <div className="callout callout-accent">
                      <span>Please confirm the written terms of this hire: wage, hours and weekly day off.</span>
                      <button className="btn btn-sm" onClick={() => setTermsFor(e.id)}>
                        See terms
                      </button>
                    </div>
                  ) : (
                    <div className="row-between">
                      <TermsStatus side="HOUSEHOLD" mine={e.myTermsAccepted} theirs={!!e.termsAcceptedByWorkerAt} />
                      <button className="btn btn-ghost btn-sm" onClick={() => setTermsFor(e.id)}>
                        See terms
                      </button>
                    </div>
                  )}
                  <div className="row">
                    <a className="btn btn-ghost btn-sm" href={`tel:${e.worker.phone}`}>
                      Call <span className="ltr">{e.worker.phone}</span>
                    </a>
                    <a className="btn btn-ghost btn-sm" href={`https://wa.me/92${e.worker.phone.slice(1)}`} target="_blank" rel="noreferrer">
                      WhatsApp
                    </a>
                  </div>
                  {e.endorsement ? (
                    <div className="callout callout-ok small">
                      <span>
                        {e.endorsement.trustworthy ? (
                          <>
                            You endorsed {e.worker.name.split(" ")[0]} <Stars value={e.endorsement.rating} />
                          </>
                        ) : (
                          "You shared concerns with our team"
                        )}
                      </span>
                    </div>
                  ) : e.canEndorse ? (
                    <div className="callout callout-accent">
                      <span>{e.daysTogether} days together. Would you vouch for {e.worker.name.split(" ")[0]}?</span>
                      <button className="btn btn-sm" onClick={() => setEndorsing(e)}>
                        Endorse
                      </button>
                    </div>
                  ) : (
                    <span className="muted small">
                      You can endorse after {meta?.endorsementAfterDays ?? 30} days ({e.daysUntilEndorsement} days to go).
                    </span>
                  )}
                  <div className="row">
                    <button className="btn btn-danger-ghost btn-sm" onClick={() => setComplaining(e)}>
                      Report a problem
                    </button>
                    {e.status === "ACTIVE" && (
                      <button
                        className="btn btn-ghost btn-sm"
                        disabled={busy}
                        onClick={async () => {
                          const reason = prompt("Ending this arrangement. Reason (optional):");
                          if (reason === null) return;
                          await run(() => api.post(`/engagements/${e.id}/end`, { reason: reason || undefined }), "Arrangement ended");
                          void state.reload();
                        }}
                      >
                        End arrangement
                      </button>
                    )}
                    {e.complaints.length > 0 && <span className="muted small">{e.complaints.length} complaint(s) filed</span>}
                  </div>
                </div>
              ))}
            </div>
          )
        }
      </Loaded>
      {termsFor && <TermsModal engagementId={termsFor} side="HOUSEHOLD" onClose={() => setTermsFor(null)} onAccepted={state.reload} />}
      {endorsing && <EndorseModal e={endorsing} onClose={() => setEndorsing(null)} onDone={state.reload} />}
      {complaining && (
        <ComplaintModal
          workerId={complaining.workerId}
          workerName={complaining.worker.name}
          engagementId={complaining.id}
          onClose={() => setComplaining(null)}
          onFiled={state.reload}
        />
      )}
    </div>
  );
}
