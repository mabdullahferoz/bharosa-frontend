// Assisted mode: a field agent acts for a worker who can't use the app (often on the phone with them).
// Every action asks how the worker agreed, is attributed to the staff member, and the worker gets an SMS.
import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../../api";
import { hasPerm, useAuth } from "../../auth";
import type { Complaint, Job, Meta, Offer, PublicWorker } from "../../types";
import {
  Avatar,
  categoryLabel,
  Empty,
  Field,
  formatDate,
  humanize,
  Loaded,
  Modal,
  Money,
  PageHeader,
  Pill,
  rupees,
  Select,
  timeAgo,
  TrustBadges,
  useAction,
  useLoad,
  useToast,
} from "../../ui";
import { ConsentModal, TempPasswordBox, WageHint } from "./assist/shared";

type AssistOffer = Offer & { job: Job & { household: { name: string; area: string | null; city: string } } };

interface AssistEngagement {
  id: string;
  title: string;
  category: string;
  wage: number;
  wagePeriod: string;
  status: string;
  source: string;
  startDate: string;
  endDate: string | null;
  workingHours: string | null;
  weeklyRestDay: string | null;
  household: { name: string; area: string | null };
}

interface AssistFile {
  worker: PublicWorker & { phone: string; assisted?: boolean; mustChangePassword: boolean };
  offers: AssistOffer[];
  engagements: AssistEngagement[];
  complaints: Complaint[];
  matchingJobs: (Job & { household: { name: string; area: string | null } })[];
}

interface CaseNote {
  id: string;
  channel: string;
  summary: string;
  createdAt: string;
  staff: { name: string; staffProfile: { staffCode: string } | null };
}

type ModalState =
  | { kind: "respond"; job: AssistFile["matchingJobs"][number]; custom: boolean }
  | { kind: "accept" | "counter" | "decline"; offer: AssistOffer }
  | { kind: "complaint"; complaint: Complaint }
  | { kind: "grievance" }
  | { kind: "profile" }
  | { kind: "verify" }
  | { kind: "reset" }
  | null;

const jobTerms = (j: { workingHours: string | null; weeklyRestDay: string | null; schedule?: string }) =>
  [j.schedule && humanize(j.schedule), j.workingHours && `Hours: ${j.workingHours}`, j.weeklyRestDay && `Day off: ${humanize(j.weeklyRestDay)}`]
    .filter(Boolean)
    .join(" · ");

export default function AdminAssist() {
  const { id = "" } = useParams();
  const { user, meta } = useAuth();
  const state = useLoad(() => api.get<AssistFile>(`/assist/workers/${id}`), [id]);
  const notes = useLoad(() => api.get<CaseNote[]>(`/assist/users/${id}/notes`), [id]);
  const [modal, setModal] = useState<ModalState>(null);
  const [tempPw, setTempPw] = useState<string | null>(null);
  const close = () => setModal(null);
  const maxRounds = meta?.maxOfferRounds ?? 4;

  if (!hasPerm(user, "WORKERS_ASSIST")) {
    return (
      <div>
        <PageHeader title="Act for a worker" />
        <div className="callout callout-error">You need the WORKERS_ASSIST permission to act for workers. Ask a super admin.</div>
      </div>
    );
  }

  return (
    <Loaded state={state}>
      {(d) => {
        const w = d.worker;
        const first = w.name.split(" ")[0];
        const pending = d.offers.filter((o) => o.status === "PENDING");
        const past = d.offers.filter((o) => o.status !== "PENDING");
        const openComplaints = d.complaints.filter((c) => c.status === "OPEN" || c.status === "UNDER_REVIEW");
        return (
          <div className="stack">
            <div className="row" style={{ gap: 14 }}>
              <Avatar name={w.name} size={52} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <PageHeader
                  title={`Acting for ${w.name}`}
                  subtitle={
                    <>
                      <span className="masked">{w.phone}</span> · {w.area ? `${w.area}, ` : ""}
                      {w.city} · {w.profile?.skills.map(categoryLabel).join(", ") || "No skills listed"}
                    </>
                  }
                  action={
                    <Link className="btn btn-ghost btn-sm" to={`/admin/workers/${w.id}`}>
                      Open worker file
                    </Link>
                  }
                />
              </div>
            </div>
            <div className="row">
              {w.assisted && <Pill value="INFO" label="No smartphone (assisted)" />}
              {w.mustChangePassword && <Pill value="PENDING" label="Has not logged in yet" />}
              {w.status !== "ACTIVE" && <Pill value={w.status} />}
              <TrustBadges trust={w.trust} compact />
            </div>

            <div className="callout callout-warn" role="note">
              <div className="stack-sm">
                <strong>You are acting for {w.name}.</strong>
                <span>
                  Read the details out loud and get a clear yes. Write down how they agreed. They will get an SMS for every action, and can press
                  "I did not agree" on their activity page. Never ask for or accept money.
                </span>
              </div>
            </div>
            {w.status !== "ACTIVE" && <div className="callout callout-error">This worker is {humanize(w.status).toLowerCase()}; they cannot respond to jobs right now.</div>}

            {tempPw && (
              <div className="stack-sm">
                <TempPasswordBox password={tempPw} name={w.name} />
                <button className="btn btn-ghost btn-sm" style={{ alignSelf: "flex-start" }} onClick={() => setTempPw(null)}>
                  I have given it to them, hide it
                </button>
              </div>
            )}

            {/* ---- Open offers ---- */}
            <section className="section">
              <h2>Open offers ({pending.length})</h2>
              <p className="small muted" style={{ marginBottom: 10 }}>
                Each offer allows at most {maxRounds} price changes. Full-time and live-in wages below the legal minimum are rejected.
              </p>
              {pending.length === 0 ? (
                <Empty title="No open offers">Respond to a matching job below, or wait for a family to invite {first}.</Empty>
              ) : (
                <div className="stack">
                  {pending.map((o) => (
                    <OfferCard key={o.id} offer={o} workerName={w.name} maxRounds={maxRounds} onAct={(kind) => setModal({ kind, offer: o })} />
                  ))}
                </div>
              )}
              {past.length > 0 && (
                <details style={{ marginTop: 12 }}>
                  <summary className="small muted">Closed offers ({past.length})</summary>
                  <div className="stack-sm" style={{ marginTop: 8 }}>
                    {past.map((o) => (
                      <div key={o.id} className="row-between small">
                        <span>
                          {o.job.title} · {o.job.household.name} · <Money amount={o.amount} period={o.job.wagePeriod} />
                        </span>
                        <span className="row">
                          <Pill value={o.status} />
                          <span className="muted">{timeAgo(o.updatedAt)}</span>
                        </span>
                      </div>
                    ))}
                  </div>
                </details>
              )}
            </section>

            {/* ---- Matching jobs ---- */}
            <section className="section">
              <h2>Matching jobs in {w.city} ({d.matchingJobs.length})</h2>
              {d.matchingJobs.length === 0 ? (
                <Empty title="No matching open jobs">Jobs appear here when a family in {w.city} posts work matching {first}'s skills.</Empty>
              ) : (
                <div className="grid">
                  {d.matchingJobs.map((j) => (
                    <div key={j.id} className="card stack-sm">
                      <div className="row-between">
                        <span className="card-title">{j.title}</span>
                        <Pill value="INFO" label={categoryLabel(j.category)} />
                      </div>
                      <div className="card-meta">
                        <span>{j.household.name}</span>
                        <span>{j.area ?? j.city}</span>
                        <span>{timeAgo(j.createdAt)}</span>
                      </div>
                      <Money amount={j.offeredWage} period={j.wagePeriod} />
                      <span className="small muted">{jobTerms(j)}</span>
                      {j.requireVerified && <span className="small">Only police-verified workers can respond.</span>}
                      <div className="row">
                        <button className="btn btn-sm" disabled={w.status !== "ACTIVE"} onClick={() => setModal({ kind: "respond", job: j, custom: false })}>
                          Accept {rupees(j.offeredWage)}
                        </button>
                        <button className="btn btn-ghost btn-sm" disabled={w.status !== "ACTIVE"} onClick={() => setModal({ kind: "respond", job: j, custom: true })}>
                          Ask another price
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* ---- Hires ---- */}
            <section className="section">
              <h2>Work ({d.engagements.length})</h2>
              {d.engagements.length === 0 ? (
                <Empty title="Not hired yet" />
              ) : (
                <div className="stack-sm">
                  {d.engagements.map((e) => (
                    <div key={e.id} className="card row-between">
                      <div className="stack-sm">
                        <strong>
                          {e.title} · {e.household.name}
                        </strong>
                        <span className="card-meta">
                          <span>{e.household.area}</span>
                          <span>Since {formatDate(e.startDate)}</span>
                          {e.endDate && <span>Ended {formatDate(e.endDate)}</span>}
                          <span>{e.source === "PLATFORM_PLACEMENT" ? "Team placement" : "Marketplace"}</span>
                          {jobTerms(e) && <span>{jobTerms(e)}</span>}
                        </span>
                      </div>
                      <div className="row">
                        <Money amount={e.wage} period={e.wagePeriod} />
                        <Pill value={e.status} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* ---- Complaints / grievances ---- */}
            <div className="grid-2 section">
              <section className="card stack-sm">
                <h2>Complaints about {first}</h2>
                {d.complaints.length === 0 ? (
                  <p className="muted small">None.</p>
                ) : (
                  d.complaints.map((c) => (
                    <div key={c.id} className="stack-sm" style={{ borderTop: "1px solid var(--line)", paddingTop: 8 }}>
                      <div className="row-between">
                        <span className="row">
                          <Pill value={c.severity} />
                          <strong>{humanize(c.category)}</strong>
                        </span>
                        <Pill value={c.status} />
                      </div>
                      <p className="small">{c.description}</p>
                      <p className="small" style={{ whiteSpace: "pre-wrap" }}>
                        <strong>{first}'s side:</strong> {c.workerResponse ?? <span className="muted">Not written down yet</span>}
                      </p>
                      {c.resolution && <p className="small muted">Decision: {c.resolution}</p>}
                      {(c.status === "OPEN" || c.status === "UNDER_REVIEW") && (
                        <button className="btn btn-ghost btn-sm" style={{ alignSelf: "flex-start" }} onClick={() => setModal({ kind: "complaint", complaint: c })}>
                          {c.workerResponse ? "Update their side" : "Write down their side"}
                        </button>
                      )}
                    </div>
                  ))
                )}
                {openComplaints.length > 0 && <p className="small muted">Tell {first} what the complaint says, then write their answer in their words.</p>}
              </section>
              <section className="card stack-sm">
                <h2>Report a problem with a family</h2>
                <p className="small muted">
                  Harassment, unpaid wages, overwork or unsafe conditions. Serious reports go straight to the super admins. The family is not told who
                  wrote it down.
                </p>
                <button
                  className="btn btn-ghost btn-sm"
                  style={{ alignSelf: "flex-start" }}
                  disabled={d.engagements.length === 0}
                  onClick={() => setModal({ kind: "grievance" })}
                >
                  Report a problem
                </button>
                {d.engagements.length === 0 && <span className="small muted">Only possible for a family {first} has worked for through Kaam Connect.</span>}
              </section>
            </div>

            {/* ---- Profile & account ---- */}
            <div className="grid-2 section">
              <section className="card stack-sm">
                <h2>Profile</h2>
                <dl className="kv">
                  <dt>Skills</dt>
                  <dd>{w.profile?.skills.map(categoryLabel).join(", ") || "-"}</dd>
                  <dt>Experience</dt>
                  <dd>{w.profile?.experienceYears ?? 0} years</dd>
                  <dt>Expected wage</dt>
                  <dd>{w.profile?.expectedWage ? rupees(w.profile.expectedWage) : "-"}</dd>
                  <dt>Availability</dt>
                  <dd>{humanize(w.profile?.availability)}</dd>
                  <dt>Languages</dt>
                  <dd>{w.profile?.languages || "-"}</dd>
                  <dt>Hometown</dt>
                  <dd>{w.profile?.hometown || "-"}</dd>
                </dl>
                {w.profile?.bio && <p className="small">{w.profile.bio}</p>}
                <button className="btn btn-ghost btn-sm" style={{ alignSelf: "flex-start" }} onClick={() => setModal({ kind: "profile" })}>
                  Edit profile
                </button>
              </section>
              <section className="card stack-sm">
                <h2>Police verification</h2>
                <div className="row">
                  <span>Status:</span> <Pill value={w.trust.verificationStatus} />
                </div>
                <p className="small muted">
                  Verification is free. {first} will need to bring their original CNIC. The team never asks for money for this.
                </p>
                <button
                  className="btn btn-ghost btn-sm"
                  style={{ alignSelf: "flex-start" }}
                  disabled={["PENDING", "IN_PROGRESS"].includes(w.trust.verificationStatus)}
                  onClick={() => setModal({ kind: "verify" })}
                >
                  {["PENDING", "IN_PROGRESS"].includes(w.trust.verificationStatus) ? "Already requested" : "Request police verification"}
                </button>
                {hasPerm(user, "PASSWORD_RESET") && (
                  <>
                    <hr />
                    <h2>Password</h2>
                    <p className="small muted">Only if {first} has forgotten it. They will get an SMS saying you reset it.</p>
                    <button className="btn btn-danger-ghost btn-sm" style={{ alignSelf: "flex-start" }} onClick={() => setModal({ kind: "reset" })}>
                      Reset password
                    </button>
                  </>
                )}
              </section>
            </div>

            {/* ---- Case notes ---- */}
            <section className="section">
              <h2>Case notes</h2>
              <p className="small muted" style={{ marginBottom: 10 }}>
                Internal notes for the team (calls, visits, what {first} needs). Not shown to {first}.
              </p>
              <CaseNotes userId={w.id} meta={meta} state={notes} />
            </section>

            {modal?.kind === "respond" && <RespondModal worker={w} job={modal.job} custom={modal.custom} onClose={close} onDone={state.reload} />}
            {(modal?.kind === "accept" || modal?.kind === "counter" || modal?.kind === "decline") && (
              <OfferActionModal kind={modal.kind} offer={modal.offer} workerName={w.name} onClose={close} onDone={state.reload} />
            )}
            {modal?.kind === "complaint" && <ComplaintSideModal workerId={w.id} name={w.name} complaint={modal.complaint} onClose={close} onDone={state.reload} />}
            {modal?.kind === "grievance" && <GrievanceModal workerId={w.id} name={w.name} engagements={d.engagements} meta={meta} onClose={close} onDone={state.reload} />}
            {modal?.kind === "profile" && <ProfileModal worker={w} meta={meta} onClose={close} onDone={state.reload} />}
            {modal?.kind === "verify" && <VerifyModal workerId={w.id} name={w.name} onClose={close} onDone={state.reload} />}
            {modal?.kind === "reset" && (
              <ResetModal
                userId={w.id}
                name={w.name}
                onClose={close}
                onDone={(pw) => {
                  setTempPw(pw);
                  void state.reload();
                }}
              />
            )}
          </div>
        );
      }}
    </Loaded>
  );
}

// ---- Offers --------------------------------------------------------------------------

function OfferCard({ offer, workerName, maxRounds, onAct }: { offer: AssistOffer; workerName: string; maxRounds: number; onAct: (k: "accept" | "counter" | "decline") => void }) {
  const first = workerName.split(" ")[0];
  const theirTurn = offer.lastBy === "HOUSEHOLD";
  const roundsLeft = Math.max(0, maxRounds - offer.rounds);
  return (
    <div className={`card stack-sm ${theirTurn ? "card-highlight" : ""}`}>
      <div className="row-between">
        <div>
          <div className="card-title">{offer.job.title}</div>
          <div className="card-meta">
            <span>{offer.job.household.name}</span>
            <span>{offer.job.area ?? offer.job.city}</span>
            <span>Posted wage: {rupees(offer.job.offeredWage)}</span>
            <span>{offer.initiator === "HOUSEHOLD" ? "Family invited" : `${first} responded`}</span>
          </div>
          <div className="small muted">{jobTerms(offer.job)}</div>
        </div>
        <span className="small muted">
          {offer.rounds}/{maxRounds} price changes
        </span>
      </div>
      <div className="thread">
        {offer.history.map((h, i) => (
          <div key={i} className={`bubble ${h.by === "WORKER" ? "bubble-me" : "bubble-them"}`}>
            <span className="muted small">
              {h.by === "WORKER" ? first : offer.job.household.name} · {timeAgo(h.at)}
              {h.viaStaff && <> · entered by staff {h.viaStaff}</>}
            </span>
            <Money amount={h.amount} period={offer.job.wagePeriod} />
            {h.message && <span dir="auto">{h.message}</span>}
          </div>
        ))}
      </div>
      {theirTurn ? (
        <div className="row">
          <button className="btn btn-sm" onClick={() => onAct("accept")}>
            Accept {rupees(offer.amount)}
          </button>
          {roundsLeft > 0 ? (
            <button className="btn btn-ghost btn-sm" onClick={() => onAct("counter")}>
              Offer another price
            </button>
          ) : (
            <span className="small muted">No price changes left: accept or decline.</span>
          )}
          <button className="btn btn-danger-ghost btn-sm" onClick={() => onAct("decline")}>
            Decline
          </button>
        </div>
      ) : (
        <div className="row">
          <span className="small muted">Waiting for the family to answer {first}'s price.</span>
          <button className="btn btn-danger-ghost btn-sm" onClick={() => onAct("decline")}>
            Withdraw
          </button>
        </div>
      )}
    </div>
  );
}

function RespondModal({
  worker,
  job,
  custom,
  onClose,
  onDone,
}: {
  worker: AssistFile["worker"];
  job: AssistFile["matchingJobs"][number];
  custom: boolean;
  onClose: () => void;
  onDone: () => void;
}) {
  const { meta } = useAuth();
  const toast = useToast();
  const { busy, run } = useAction();
  const [amount, setAmount] = useState(String(worker.profile?.expectedWage || job.offeredWage));
  const [message, setMessage] = useState("");
  const price = custom ? Number(amount) : job.offeredWage;
  return (
    <ConsentModal
      title={custom ? `Ask another price: ${job.title}` : `Accept the offered wage: ${job.title}`}
      name={worker.name}
      busy={busy}
      confirmLabel={custom ? `Send ${rupees(price || 0)} for ${worker.name.split(" ")[0]}` : `Respond at ${rupees(job.offeredWage)}`}
      readOut={
        <>
          {job.household.name} in {job.area ?? job.city} needs a {categoryLabel(job.category).toLowerCase()} ("{job.title}"). {jobTerms(job)}. You
          will ask for <strong>{rupees(price || 0)}</strong>
          {job.wagePeriod === "MONTHLY" ? " a month" : job.wagePeriod === "DAILY" ? " a day" : ""}. Do you want me to send this?
        </>
      }
      onSubmit={async (consent) => {
        const r = await run(() =>
          api.post(`/assist/workers/${worker.id}/jobs/${job.id}/respond`, {
            amount: custom ? Number(amount) : undefined,
            message: message.trim() || undefined,
            consent,
          }),
        );
        if (!r) return false;
        toast("Response sent. The family will see it.");
        onDone();
        return true;
      }}
      onClose={onClose}
    >
      {custom && (
        <Field label="Their price (Rs)" hint={<WageHint meta={meta} city={job.city} schedule={job.schedule} wagePeriod={job.wagePeriod} amount={Number(amount)} />}>
          <input type="number" min={100} step={100} value={amount} onChange={(e) => setAmount(e.target.value)} required />
        </Field>
      )}
      <Field label="Message to the family (optional)">
        <input value={message} onChange={(e) => setMessage(e.target.value)} maxLength={500} placeholder="e.g. 12 years experience, lives nearby" />
      </Field>
    </ConsentModal>
  );
}

function OfferActionModal({
  kind,
  offer,
  workerName,
  onClose,
  onDone,
}: {
  kind: "accept" | "counter" | "decline";
  offer: AssistOffer;
  workerName: string;
  onClose: () => void;
  onDone: () => void;
}) {
  const { meta } = useAuth();
  const toast = useToast();
  const { busy, run } = useAction();
  const [amount, setAmount] = useState(String(offer.amount));
  const [message, setMessage] = useState("");
  const j = offer.job;
  const withdraw = kind === "decline" && offer.lastBy === "WORKER";
  const per = j.wagePeriod === "MONTHLY" ? " a month" : j.wagePeriod === "DAILY" ? " a day" : "";
  const title = kind === "accept" ? "Accept and get hired" : kind === "counter" ? "Offer another price" : withdraw ? "Withdraw the offer" : "Decline the offer";
  const readOut =
    kind === "accept" ? (
      <>
        You will work for <strong>{j.household.name}</strong> ({j.area ?? j.city}) as "{j.title}" for <strong>{rupees(offer.amount)}</strong>
        {per}. {jobTerms(j)}. Once you agree, you are hired and the family gets your phone number. Do you agree?
      </>
    ) : kind === "counter" ? (
      <>
        The family's price is {rupees(offer.amount)}
        {per}. You want to ask for {rupees(Number(amount) || 0)} instead. Shall I send it?
      </>
    ) : (
      <>
        You do not want this job with {j.household.name} at {rupees(offer.amount)}
        {per}. The offer will close. Is that right?
      </>
    );
  return (
    <ConsentModal
      title={`${title}: ${j.title}`}
      name={workerName}
      busy={busy}
      danger={kind === "decline"}
      confirmLabel={kind === "accept" ? `Accept ${rupees(offer.amount)}` : kind === "counter" ? "Send price" : title}
      readOut={readOut}
      onSubmit={async (consent) => {
        const r = await run(() =>
          api.post(`/assist/offers/${offer.id}/${kind}`, {
            side: "WORKER",
            amount: kind === "counter" ? Number(amount) : undefined,
            message: kind === "counter" ? message.trim() || undefined : undefined,
            consent,
          }),
        );
        if (!r) return false;
        toast(kind === "accept" ? `${workerName} is hired. Both sides have been notified.` : kind === "counter" ? "Price sent to the family." : "Offer closed.");
        onDone();
        return true;
      }}
      onClose={onClose}
    >
      {kind === "counter" && (
        <>
          <Field label="Their price (Rs)" hint={<WageHint meta={meta} city={j.city} schedule={j.schedule} wagePeriod={j.wagePeriod} amount={Number(amount)} />}>
            <input type="number" min={100} step={100} value={amount} onChange={(e) => setAmount(e.target.value)} required />
          </Field>
          <Field label="Message (optional)">
            <input value={message} onChange={(e) => setMessage(e.target.value)} maxLength={500} />
          </Field>
          <p className="small muted">
            Price changes used: {offer.rounds} of {meta?.maxOfferRounds ?? "?"}.
          </p>
        </>
      )}
    </ConsentModal>
  );
}

// ---- Complaints & grievances ------------------------------------------------------------

function ComplaintSideModal({ workerId, name, complaint, onClose, onDone }: { workerId: string; name: string; complaint: Complaint; onClose: () => void; onDone: () => void }) {
  const toast = useToast();
  const { busy, run } = useAction();
  const [response, setResponse] = useState("");
  return (
    <ConsentModal
      title={`${name.split(" ")[0]}'s side of the complaint`}
      name={name}
      busy={busy}
      confirmLabel="Save their side"
      readOut={
        <>
          A family complained: "{complaint.description}". Tell me what happened in your own words. I will write it down and read it back to you.
        </>
      }
      onSubmit={async (consent) => {
        const r = await run(() => api.post(`/assist/workers/${workerId}/complaints/${complaint.id}/respond`, { response: response.trim(), consent }));
        if (!r) return false;
        toast("Their side has been saved for the reviewer.");
        onDone();
        return true;
      }}
      onClose={onClose}
    >
      <Field label="What they said (in their words)" hint="Read it back to them before saving. Your name is added automatically.">
        <textarea value={response} onChange={(e) => setResponse(e.target.value)} minLength={5} maxLength={3000} rows={5} required />
      </Field>
    </ConsentModal>
  );
}

function GrievanceModal({
  workerId,
  name,
  engagements,
  meta,
  onClose,
  onDone,
}: {
  workerId: string;
  name: string;
  engagements: AssistEngagement[];
  meta: Meta | null;
  onClose: () => void;
  onDone: () => void;
}) {
  const toast = useToast();
  const { busy, run } = useAction();
  const [f, setF] = useState({ engagementId: engagements[0]?.id ?? "", category: meta?.grievanceCategories[0] ?? "OTHER", severity: "MEDIUM", description: "" });
  return (
    <ConsentModal
      title="Report a problem with a family"
      name={name}
      busy={busy}
      confirmLabel="Send report"
      readOut={<>I will report this problem to the Kaam Connect team. The team will look into it and contact you. Is that what you want?</>}
      onSubmit={async (consent) => {
        const r = await run(() => api.post(`/assist/workers/${workerId}/grievances`, { ...f, description: f.description.trim(), consent }));
        if (!r) return false;
        toast(f.severity === "HIGH" || f.severity === "CRITICAL" ? "Report sent. Super admins have been alerted." : "Report sent to the team.");
        onDone();
        return true;
      }}
      onClose={onClose}
    >
      <Field label="Which family">
        <select value={f.engagementId} onChange={(e) => setF({ ...f, engagementId: e.target.value })} required>
          {engagements.map((e) => (
            <option key={e.id} value={e.id}>
              {e.household.name} · {e.title} ({e.status === "ACTIVE" ? "current" : "ended"})
            </option>
          ))}
        </select>
      </Field>
      <div className="grid-2">
        <Field label="What kind of problem">
          <Select value={f.category} onChange={(category) => setF({ ...f, category })} options={meta?.grievanceCategories ?? ["OTHER"]} />
        </Field>
        <Field label="How serious" hint="High / Critical: their safety or pay is at risk now.">
          <Select value={f.severity} onChange={(severity) => setF({ ...f, severity })} options={meta?.severities ?? ["LOW", "MEDIUM", "HIGH", "CRITICAL"]} />
        </Field>
      </div>
      <Field label="What happened (their words)">
        <textarea value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} minLength={10} maxLength={3000} rows={5} required />
      </Field>
      {(f.severity === "HIGH" || f.severity === "CRITICAL") && (
        <div className="callout callout-error small">If {name.split(" ")[0]} is in danger right now, call 15 (police) first, then tell your supervisor.</div>
      )}
    </ConsentModal>
  );
}

// ---- Profile, verification, password ------------------------------------------------------

function ProfileModal({ worker, meta, onClose, onDone }: { worker: AssistFile["worker"]; meta: Meta | null; onClose: () => void; onDone: () => void }) {
  const toast = useToast();
  const { busy, run } = useAction();
  const p = worker.profile;
  const [f, setF] = useState({
    name: worker.name,
    city: worker.city,
    area: worker.area ?? "",
    skills: p?.skills ?? [],
    bio: p?.bio ?? "",
    experienceYears: String(p?.experienceYears ?? 0),
    expectedWage: p?.expectedWage ? String(p.expectedWage) : "",
    availability: p?.availability ?? "FULL_TIME",
    hometown: p?.hometown ?? "",
    languages: p?.languages ?? "",
    gender: p?.gender ?? "",
    emergencyContact: "",
    cnicNumber: "",
  });
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });
  return (
    <ConsentModal
      title={`Edit ${worker.name}'s profile`}
      name={worker.name}
      busy={busy}
      confirmLabel="Save profile"
      readOut={<>I will change your profile so families see: {f.skills.map(categoryLabel).join(", ") || "no skills"}, {f.experienceYears} years experience{f.expectedWage ? `, expecting ${rupees(Number(f.expectedWage))}` : ""}. Is this correct?</>}
      onSubmit={async (consent) => {
        if (f.skills.length === 0) {
          toast("Choose at least one skill", "error");
          return false;
        }
        const r = await run(() =>
          api.patch(`/assist/workers/${worker.id}/profile`, {
            name: f.name.trim(),
            city: f.city,
            area: f.area.trim() || null,
            worker: {
              skills: f.skills,
              bio: f.bio.trim() || null,
              experienceYears: Number(f.experienceYears) || 0,
              expectedWage: f.expectedWage ? Number(f.expectedWage) : null,
              availability: f.availability,
              hometown: f.hometown.trim() || null,
              languages: f.languages.trim(),
              gender: f.gender || null,
              ...(f.emergencyContact.trim() ? { emergencyContact: f.emergencyContact.trim() } : {}),
              ...(f.cnicNumber.trim() ? { cnicNumber: f.cnicNumber.trim() } : {}),
            },
            consent,
          }),
        );
        if (!r) return false;
        toast("Profile updated.");
        onDone();
        return true;
      }}
      onClose={onClose}
    >
      <div className="grid-2">
        <Field label="Name">
          <input value={f.name} onChange={set("name")} minLength={2} maxLength={80} required />
        </Field>
        <Field label="City">
          <Select value={f.city} onChange={(city) => setF({ ...f, city })} options={meta?.cities ?? [f.city]} labelFn={(c) => c} />
        </Field>
        <Field label="Area">
          <input value={f.area} onChange={set("area")} maxLength={80} />
        </Field>
        <Field label="Hometown">
          <input value={f.hometown} onChange={set("hometown")} maxLength={100} />
        </Field>
      </div>
      <div className="stack-sm">
        <span className="field-label">Skills</span>
        <div className="chips">
          {(meta?.categories ?? []).map((c) => (
            <button
              key={c}
              type="button"
              className="chip"
              aria-pressed={f.skills.includes(c)}
              onClick={() => setF({ ...f, skills: f.skills.includes(c) ? f.skills.filter((s) => s !== c) : [...f.skills, c] })}
            >
              {categoryLabel(c)}
            </button>
          ))}
        </div>
      </div>
      <div className="grid-2">
        <Field label="Years of experience">
          <input type="number" min={0} max={60} value={f.experienceYears} onChange={set("experienceYears")} />
        </Field>
        <Field label="Expected wage (Rs / month)">
          <input type="number" min={0} step={500} value={f.expectedWage} onChange={set("expectedWage")} />
        </Field>
        <Field label="Availability">
          <Select value={f.availability} onChange={(availability) => setF({ ...f, availability })} options={meta?.schedules ?? ["FULL_TIME"]} />
        </Field>
        <Field label="Gender">
          <Select value={f.gender} onChange={(gender) => setF({ ...f, gender })} options={["FEMALE", "MALE", "OTHER"]} placeholder="Not given" />
        </Field>
        <Field label="Languages">
          <input value={f.languages} onChange={set("languages")} maxLength={200} placeholder="Urdu, Punjabi" />
        </Field>
        <Field label="Emergency contact" hint="Leave empty to keep the current one">
          <input value={f.emergencyContact} onChange={set("emergencyContact")} maxLength={120} placeholder="Name and phone" />
        </Field>
      </div>
      <Field label="CNIC number" hint="Leave empty to keep the current one. A verified CNIC can't be changed here.">
        <input value={f.cnicNumber} onChange={set("cnicNumber")} pattern="\d{5}-\d{7}-\d" placeholder="12345-1234567-1" inputMode="numeric" />
      </Field>
      <Field label="About them (shown to families)">
        <textarea value={f.bio} onChange={set("bio")} maxLength={1000} rows={3} />
      </Field>
    </ConsentModal>
  );
}

function VerifyModal({ workerId, name, onClose, onDone }: { workerId: string; name: string; onClose: () => void; onDone: () => void }) {
  const toast = useToast();
  const { busy, run } = useAction();
  return (
    <ConsentModal
      title="Request police verification"
      name={name}
      busy={busy}
      confirmLabel="Request verification"
      readOut={
        <>
          The Kaam Connect team will check your record with the police. It is free. You will need to show your original CNIC. Never pay anyone for
          this. Do you want us to start?
        </>
      }
      onSubmit={async (consent) => {
        const r = await run(() => api.post(`/assist/workers/${workerId}/verification-request`, { consent }));
        if (!r) return false;
        toast("Verification requested. The verification team has been told.");
        onDone();
        return true;
      }}
      onClose={onClose}
    />
  );
}

function ResetModal({ userId, name, onClose, onDone }: { userId: string; name: string; onClose: () => void; onDone: (pw: string) => void }) {
  const { busy, run } = useAction();
  const [reason, setReason] = useState("");
  return (
    <Modal title={`Reset ${name}'s password`} onClose={onClose}>
      <form
        className="form"
        onSubmit={async (e) => {
          e.preventDefault();
          const r = await run(() => api.post<{ tempPassword: string }>(`/assist/users/${userId}/reset-password`, { reason: reason.trim() }));
          if (r) {
            onDone(r.tempPassword);
            onClose();
          }
        }}
      >
        <div className="callout callout-warn small">
          Only do this when {name.split(" ")[0]} asked for it, and you are sure you are talking to them. They will be logged out everywhere and get an
          SMS naming you.
        </div>
        <Field label="Why (who asked, how you checked it was them)">
          <textarea value={reason} onChange={(e) => setReason(e.target.value)} minLength={5} maxLength={300} rows={3} required placeholder="e.g. Called from her registered number 2:40pm, confirmed her hometown and date of birth" />
        </Field>
        <button className="btn btn-danger btn-block" disabled={busy || reason.trim().length < 5}>
          Reset and show temporary password
        </button>
      </form>
    </Modal>
  );
}

// ---- Case notes --------------------------------------------------------------------------

function CaseNotes({ userId, meta, state }: { userId: string; meta: Meta | null; state: ReturnType<typeof useLoad<CaseNote[]>> }) {
  const { busy, run } = useAction();
  const [channel, setChannel] = useState("CALL");
  const [summary, setSummary] = useState("");
  return (
    <div className="split">
      <Loaded state={state}>
        {(list) =>
          list.length === 0 ? (
            <Empty title="No notes yet" />
          ) : (
            <div className="stack-sm">
              {list.map((n) => (
                <div key={n.id} className="card stack-sm" style={{ padding: 12 }}>
                  <div className="card-meta">
                    <Pill value="INFO" label={humanize(n.channel)} />
                    <span>
                      <span className="staff-code">{n.staff.staffProfile?.staffCode ?? "Staff"}</span> {n.staff.name}
                    </span>
                    <span>{timeAgo(n.createdAt)}</span>
                  </div>
                  <p className="small" style={{ whiteSpace: "pre-wrap" }}>
                    {n.summary}
                  </p>
                </div>
              ))}
            </div>
          )
        }
      </Loaded>
      <form
        className="card form"
        onSubmit={async (e) => {
          e.preventDefault();
          const r = await run(() => api.post(`/assist/users/${userId}/notes`, { channel, summary: summary.trim() }), "Note added");
          if (r) {
            setSummary("");
            void state.reload();
          }
        }}
      >
        <h3>Add a note</h3>
        <Field label="How you were in touch">
          <Select value={channel} onChange={setChannel} options={meta?.caseNoteChannels ?? ["CALL", "VISIT", "WHATSAPP", "SMS", "OTHER"]} />
        </Field>
        <Field label="What happened">
          <textarea value={summary} onChange={(e) => setSummary(e.target.value)} minLength={3} maxLength={2000} rows={3} required />
        </Field>
        <button className="btn btn-sm" disabled={busy || summary.trim().length < 3}>
          Save note
        </button>
      </form>
    </div>
  );
}
