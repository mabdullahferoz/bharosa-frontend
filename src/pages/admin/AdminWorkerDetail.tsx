import { useState, type ReactNode } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../../api";
import { hasPerm, useAuth } from "../../auth";
import type { PerformResult } from "../../types";
import {
  ageFrom, CUSTODY_RETURN_HOURS, IDENTITY_METHOD_LABEL, IDENTITY_METHODS, staffLabel, type AdminWorker, type WorkerApprovalRef,
} from "./adminTypes";
import PenaltyFields, { emptyPenalty, penaltyNeedsApproval, penaltyPayload } from "./PenaltyFields";
import {
  Avatar, Empty, Field, formatDate, Loaded, Modal, PageHeader, performMessage, Pill, Select, Stars, timeAgo, TrustBadges, useAction, useLoad, useToast,
} from "../../ui";

const APPROVAL_PILL: Record<string, string> = { PENDING: "PENDING", APPROVED: "ACCEPTED", REJECTED: "DECLINED", CANCELLED: "CANCELLED", FAILED: "FAILED" };

const NeedsPerm = ({ perm }: { perm: string }) => <span className="muted small">Needs {perm} permission</span>;

/** Pending approval requests of the given types, shown inside the section they affect. */
function PendingNotes({ approvals, types }: { approvals?: WorkerApprovalRef[]; types: string[] }) {
  const pending = (approvals ?? []).filter((a) => a.status === "PENDING" && types.includes(a.type));
  if (!pending.length) return null;
  return (
    <>
      {pending.map((a) => (
        <div key={a.id} className="pending-approval">
          <strong>Waiting for approval:</strong> {a.summary} <span className="muted">· asked by {a.requestedBy.name}, {timeAgo(a.createdAt)}</span>{" "}
          <Link to="/admin/approvals">Open</Link>
        </div>
      ))}
    </>
  );
}

/** Asks for a reason before a sensitive request. */
function ReasonModal({
  title,
  intro,
  label = "Reason",
  minLength = 3,
  submitLabel,
  danger,
  children,
  onClose,
  onSubmit,
}: {
  title: string;
  intro?: ReactNode;
  label?: string;
  minLength?: number;
  submitLabel: string;
  danger?: boolean;
  children?: ReactNode;
  onClose: () => void;
  onSubmit: (reason: string) => Promise<boolean>;
}) {
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <Modal title={title} onClose={onClose}>
      <form
        className="form"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          const ok = await onSubmit(reason.trim());
          setBusy(false);
          if (ok) onClose();
        }}
      >
        {intro}
        {children}
        <Field label={label} hint={`At least ${minLength} characters. Recorded in the audit log.`}>
          <textarea value={reason} onChange={(e) => setReason(e.target.value)} minLength={minLength} required autoFocus />
        </Field>
        <button className={`btn btn-block ${danger ? "btn-danger" : ""}`} disabled={busy || reason.trim().length < minLength}>
          {submitLabel}
        </button>
      </form>
    </Modal>
  );
}

/** Masked value with a "Reveal" button. Every reveal is logged with a reason and shown to the person. */
export function RevealValue({
  userId,
  field,
  masked,
  label,
  allowed = true,
  deniedHint,
}: {
  userId: string;
  field: "phone" | "cnic" | "emergencyContact";
  masked: string | null | undefined;
  label: string;
  allowed?: boolean;
  deniedHint?: string;
}) {
  const [value, setValue] = useState<string | null | undefined>(undefined);
  const [asking, setAsking] = useState(false);
  const { run } = useAction();
  if (value !== undefined)
    return (
      <span className="mono" title="Revealed. This view was logged.">
        {value ?? <span className="muted">Not recorded</span>}{" "}
        <button className="btn btn-ghost btn-sm" onClick={() => setValue(undefined)}>
          Hide
        </button>
      </span>
    );
  return (
    <span className="nowrap">
      <span className="mono masked">{masked ?? <span className="muted">Not given</span>}</span>{" "}
      {(masked || field === "emergencyContact") &&
        (allowed ? (
          <button className="btn btn-ghost btn-sm" onClick={() => setAsking(true)} title={`Show the full ${label}`}>
            Reveal
          </button>
        ) : (
          deniedHint && <span className="muted small">({deniedHint})</span>
        ))}
      {asking && (
        <ReasonModal
          title={`Reveal ${label}`}
          intro={
            <div className="callout callout-warn small">
              <span>
                Only reveal when you need it right now (for example, to call the worker). The reveal is recorded in the audit log with your reason and
                shown to the person on their account activity page. Unusual numbers of reveals are reviewed.
              </span>
            </div>
          }
          label="Why do you need it?"
          minLength={5}
          submitLabel="Reveal"
          onClose={() => setAsking(false)}
          onSubmit={async (reason) => {
            const r = await run(() => api.post<{ value: string | null }>(`/admin/users/${userId}/reveal`, { field, reason }));
            if (r) setValue(r.value);
            return !!r;
          }}
        />
      )}
    </span>
  );
}

function IdentityCard({ w, onDone, allowed }: { w: AdminWorker; onDone: () => void; allowed: boolean }) {
  const { busy, run } = useAction();
  const [f, setF] = useState({ method: "CNIC_SIGHTED", cnicNumber: "", notes: "" });
  const method = w.identityCheckMethod ?? "NONE";
  return (
    <div className="card card-highlight stack-sm">
      <div className="row-between">
        <h2>Identity check</h2>
        <Pill value={method === "NONE" ? "NONE" : "VERIFIED"} label={method === "NONE" ? "Not checked" : "Checked"} />
      </div>
      <p className="small muted">
        Recommended. Confirm who the worker is <strong>without keeping their original card</strong>: look at the original and hand it straight back,
        keep a signed photocopy, or run a NADRA Verisys check.
      </p>
      {method !== "NONE" && (
        <dl className="kv">
          <dt>Method</dt>
          <dd>{IDENTITY_METHOD_LABEL[method] ?? staffLabel(method)}</dd>
          <dt>Checked</dt>
          <dd>{w.identityCheckedAt ? formatDate(w.identityCheckedAt) : "-"}</dd>
        </dl>
      )}
      {!allowed ? (
        <NeedsPerm perm="VERIFY" />
      ) : (
        <form
          className="form"
          onSubmit={async (e) => {
            e.preventDefault();
            const r = await run(
              () =>
                api.post(`/admin/workers/${w.id}/identity-check`, {
                  method: f.method,
                  cnicNumber: f.cnicNumber || undefined,
                  notes: f.notes || undefined,
                }),
              "Identity check recorded",
            );
            if (r) {
              setF({ method: f.method, cnicNumber: "", notes: "" });
              onDone();
            }
          }}
        >
          <div className="grid-2">
            <Field label="How was identity confirmed?">
              <Select value={f.method} onChange={(method) => setF({ ...f, method })} options={IDENTITY_METHODS} labelFn={(m) => IDENTITY_METHOD_LABEL[m] ?? m} />
            </Field>
            <Field label="CNIC number" hint={w.hasCnic ? "Leave empty to keep the number on file" : "As printed on the card"}>
              <input value={f.cnicNumber} onChange={(e) => setF({ ...f, cnicNumber: e.target.value })} placeholder="12345-1234567-1" pattern="[0-9]{5}-[0-9]{7}-[0-9]" />
            </Field>
          </div>
          <Field label="Notes">
            <input value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} placeholder="e.g. card seen at office and handed back; copy filed in folder 3" />
          </Field>
          <div>
            <button className="btn btn-sm" disabled={busy}>
              Record identity check
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

function VerificationCard({ w, onDone, allowed }: { w: AdminWorker; onDone: () => void; allowed: boolean }) {
  const { busy, run } = useAction();
  const toast = useToast();
  const [f, setF] = useState({
    status: w.verificationStatus === "IN_PROGRESS" || w.verificationStatus === "VERIFIED" ? "VERIFIED" : "IN_PROGRESS",
    policeStation: "",
    referenceNo: "",
    notes: "",
    cnicNumber: "",
    reason: "",
  });
  const final = f.status !== "IN_PROGRESS";
  const expires = w.verificationExpiresAt;
  return (
    <div className="card stack-sm">
      <div className="row-between">
        <h2>Police verification</h2>
        <Pill value={w.verificationStatus} label={staffLabel(w.verificationStatus)} />
      </div>
      {w.verificationStatus === "VERIFIED" && expires && (
        <p className="small">
          Valid until <strong>{formatDate(expires)}</strong>
          {new Date(expires).getTime() - Date.now() < 30 * 86400_000 && <span style={{ color: "var(--danger)" }}> · renew soon</span>}
        </p>
      )}
      <PendingNotes approvals={w.approvals} types={["VERIFICATION_DECISION"]} />
      {!allowed ? (
        <NeedsPerm perm="VERIFY" />
      ) : (
        <form
          className="form"
          onSubmit={async (e) => {
            e.preventDefault();
            const r = await run(() =>
              api.post<PerformResult>(`/admin/workers/${w.id}/verification`, {
                status: f.status,
                policeStation: f.policeStation || undefined,
                referenceNo: f.referenceNo || undefined,
                notes: f.notes || undefined,
                cnicNumber: f.cnicNumber || undefined,
                reason: f.reason || undefined,
              }),
            );
            if (r) {
              toast(performMessage(r, final ? `Marked ${staffLabel(f.status).toLowerCase()}` : "Marked in progress"));
              setF({ ...f, referenceNo: "", notes: "", cnicNumber: "", reason: "" });
              onDone();
            }
          }}
        >
          <div className="grid-2">
            <Field label="New status">
              <Select value={f.status} onChange={(status) => setF({ ...f, status })} options={["IN_PROGRESS", "VERIFIED", "FAILED"]} labelFn={staffLabel} />
            </Field>
            <Field label="CNIC number" hint={w.hasCnic ? "Leave empty to keep the number on file" : "Required before verifying"}>
              <input value={f.cnicNumber} onChange={(e) => setF({ ...f, cnicNumber: e.target.value })} placeholder="12345-1234567-1" pattern="[0-9]{5}-[0-9]{7}-[0-9]" />
            </Field>
            <Field label="Police station">
              <input value={f.policeStation} onChange={(e) => setF({ ...f, policeStation: e.target.value })} placeholder="e.g. PS Defence A, Lahore" />
            </Field>
            <Field label="Certificate / reference no." hint={f.status === "VERIFIED" ? "Required to verify" : undefined}>
              <input value={f.referenceNo} onChange={(e) => setF({ ...f, referenceNo: e.target.value })} required={f.status === "VERIFIED"} />
            </Field>
          </div>
          <Field label="Notes">
            <input value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} />
          </Field>
          {final && (
            <>
              <Field label="Reason for the approver" hint="At least 3 characters, e.g. what you checked and where">
                <input value={f.reason} onChange={(e) => setF({ ...f, reason: e.target.value })} minLength={3} required />
              </Field>
              <div className="pending-approval">
                A final {staffLabel(f.status).toLowerCase()} decision will be sent for approval. A second staff member must approve it before the
                worker's badge changes.
              </div>
            </>
          )}
          <div>
            <button className="btn btn-sm" disabled={busy}>
              {final ? "Request decision" : "Mark in progress"}
            </button>
          </div>
        </form>
      )}
      {w.verifications.length > 0 && (
        <div className="table-wrap">
          <table>
            <tbody>
              {w.verifications.map((v) => (
                <tr key={v.id}>
                  <td className="nowrap">{formatDate(v.createdAt)}</td>
                  <td>
                    <Pill value={v.status} label={staffLabel(v.status)} />
                  </td>
                  <td>
                    {[v.policeStation, v.referenceNo].filter(Boolean).join(" · ")}
                    {v.notes && <div className="muted small">{v.notes}</div>}
                  </td>
                  <td className="muted">
                    {v.handledBy?.name ?? "Worker request"}
                    {v.approvalId && <div className="small">approved</div>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function CustodyCard({ w, onDone, allowed }: { w: AdminWorker; onDone: () => void; allowed: boolean }) {
  const { busy, run } = useAction();
  const held = w.custody.find((c) => c.status === "IN_CUSTODY");
  const [open, setOpen] = useState(false);
  const [returning, setReturning] = useState(false);
  const [returnNotes, setReturnNotes] = useState("");
  const [f, setF] = useState({ cnicNumber: "", storageLocation: "Lahore office, safe A", consentNote: "", notes: "" });
  const overdue =
    !!held?.returnRequestedAt && Date.now() - new Date(held.returnRequestedAt).getTime() > CUSTODY_RETURN_HOURS * 3600_000;
  return (
    <div className="card stack-sm">
      <div className="row-between">
        <h2>Original CNIC custody</h2>
        {held ? <Pill value="IN_CUSTODY" label="In our custody" /> : <Pill value="NONE" label="Not held" />}
      </div>
      <p className="small muted">
        Optional legacy process. Only keep an original card if the worker freely asks us to; prefer an identity check. The worker can ask for it
        back at any time and it must be returned within {CUSTODY_RETURN_HOURS} hours.
      </p>
      {held ? (
        <div className="stack-sm">
          {held.returnRequestedAt && (
            <div className={`callout ${overdue ? "callout-error" : "callout-warn"}`}>
              <span>
                The worker asked for the card back {timeAgo(held.returnRequestedAt)} ({formatDate(held.returnRequestedAt)}).{" "}
                {overdue ? `Overdue: more than ${CUSTODY_RETURN_HOURS} hours have passed. Return it today.` : `Return it within ${CUSTODY_RETURN_HOURS} hours.`}
              </span>
            </div>
          )}
          <dl className="kv">
            <dt>CNIC</dt>
            <dd className="mono masked">{held.cnicNumber}</dd>
            <dt>Stored at</dt>
            <dd>{held.storageLocation ?? "-"}</dd>
            <dt>Consent</dt>
            <dd>{held.consentNote ?? <span className="muted">Not recorded</span>}</dd>
            <dt>Received</dt>
            <dd>
              {formatDate(held.receivedAt)} by {held.handledBy?.name}
            </dd>
            {held.notes && (
              <>
                <dt>Notes</dt>
                <dd>{held.notes}</dd>
              </>
            )}
          </dl>
          {allowed ? (
            <div>
              <button className={`btn btn-sm ${overdue ? "btn-danger" : "btn-ghost"}`} disabled={busy} onClick={() => setReturning(true)}>
                Mark returned to worker
              </button>
            </div>
          ) : (
            <NeedsPerm perm="CNIC_CUSTODY" />
          )}
        </div>
      ) : !allowed ? (
        <NeedsPerm perm="CNIC_CUSTODY" />
      ) : !open ? (
        <div>
          <button className="btn btn-ghost btn-sm" onClick={() => setOpen(true)}>
            Log an original CNIC received…
          </button>
        </div>
      ) : (
        <form
          className="form"
          onSubmit={async (e) => {
            e.preventDefault();
            const r = await run(
              () => api.post(`/admin/workers/${w.id}/custody`, { ...f, notes: f.notes || undefined }),
              "CNIC custody logged. The worker gets an SMS confirming where it is kept.",
            );
            if (r) {
              setOpen(false);
              onDone();
            }
          }}
        >
          <div className="grid-2">
            <Field label="CNIC number on the card">
              <input value={f.cnicNumber} onChange={(e) => setF({ ...f, cnicNumber: e.target.value })} placeholder="12345-1234567-1" pattern="[0-9]{5}-[0-9]{7}-[0-9]" required />
            </Field>
            <Field label="Storage location">
              <input value={f.storageLocation} onChange={(e) => setF({ ...f, storageLocation: e.target.value })} minLength={3} required />
            </Field>
          </div>
          <Field label="How was voluntary consent recorded?" hint='Required. e.g. "Signed form #12, witness Bilal"'>
            <input value={f.consentNote} onChange={(e) => setF({ ...f, consentNote: e.target.value })} minLength={5} required />
          </Field>
          <Field label="Notes">
            <input value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} placeholder="e.g. received in person, card condition" />
          </Field>
          <div className="row">
            <button className="btn btn-sm" disabled={busy}>
              Log CNIC received
            </button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setOpen(false)}>
              Cancel
            </button>
          </div>
        </form>
      )}
      {w.custody
        .filter((c) => c.status === "RETURNED")
        .map((c) => (
          <p key={c.id} className="small muted">
            Held {formatDate(c.receivedAt)} to {c.returnedAt && formatDate(c.returnedAt)} (<span className="mono">{c.cnicNumber}</span>)
          </p>
        ))}
      {returning && held && (
        <Modal title="Return original CNIC" onClose={() => setReturning(false)}>
          <form
            className="form"
            onSubmit={async (e) => {
              e.preventDefault();
              if (await run(() => api.post(`/admin/custody/${held.id}/return`, { notes: returnNotes || undefined }), "CNIC marked as returned. The worker gets a confirmation SMS.")) {
                setReturning(false);
                setReturnNotes("");
                onDone();
              }
            }}
          >
            <p className="small">Only mark this once the card is physically back in the worker's hands. The worker gets an SMS asking them to call if they didn't receive it.</p>
            <Field label="Notes (optional)">
              <input value={returnNotes} onChange={(e) => setReturnNotes(e.target.value)} placeholder="e.g. handed over at office, witness Ayesha" />
            </Field>
            <button className="btn btn-block" disabled={busy}>
              Mark returned
            </button>
          </form>
        </Modal>
      )}
    </div>
  );
}

export default function AdminWorkerDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const toast = useToast();
  const state = useLoad(() => api.get<AdminWorker>(`/admin/workers/${id}`), [id]);
  const { busy, run } = useAction();
  const [penalizing, setPenalizing] = useState(false);
  const [penalty, setPenalty] = useState(emptyPenalty("WARNING"));
  const [endorsing, setEndorsing] = useState(false);
  const [endorse, setEndorse] = useState({ comment: "Known to our team personally. We vouch for this worker.", rating: "5", reason: "" });
  const [lifting, setLifting] = useState<string | null>(null);
  const [revoking, setRevoking] = useState<string | null>(null);

  const can = {
    assist: hasPerm(user, "WORKERS_ASSIST"),
    verify: hasPerm(user, "VERIFY"),
    custody: hasPerm(user, "CNIC_CUSTODY"),
    cnicView: hasPerm(user, "CNIC_VIEW"),
    penalties: hasPerm(user, "PENALTIES"),
    endorse: hasPerm(user, "ENDORSE"),
  };

  const perform = async (fn: () => Promise<PerformResult>, doneText: string) => {
    const r = await run(fn);
    if (r) {
      toast(performMessage(r, doneText));
      void state.reload();
    }
    return !!r;
  };

  return (
    <Loaded state={state}>
      {(w) => {
        const hasPlatform = w.endorsements.some((e) => e.type === "PLATFORM");
        const age = ageFrom(w.dateOfBirth);
        const approvals = w.approvals ?? [];
        return (
          <div className="stack">
            <div className="small">
              <Link to="/admin/workers">← Workers</Link>
            </div>
            <PageHeader
              title={w.name}
              subtitle={
                <span className="row">
                  <Pill value={w.status} label={staffLabel(w.status)} />
                  {w.assisted && <Pill value="IN_PROGRESS" label="Assisted (no smartphone)" />}
                  {w.mustChangePassword && <Pill value="HIGH" label="Must change password" />}
                  <span>
                    {w.area ? `${w.area}, ` : ""}
                    {w.city} · {w.profile?.skills.map(staffLabel).join(", ")}
                  </span>
                </span>
              }
              action={
                can.assist ? (
                  <Link to={`/admin/workers/${w.id}/assist`} className="btn btn-sm">
                    Act for this worker
                  </Link>
                ) : (
                  <NeedsPerm perm="WORKERS_ASSIST" />
                )
              }
            />

            <div className="card stack-sm">
              <div className="row" style={{ alignItems: "center" }}>
                <Avatar name={w.name} />
                <TrustBadges trust={w.trust} />
              </div>
              <dl className="kv">
                <dt>Phone</dt>
                <dd>
                  <RevealValue userId={w.id} field="phone" masked={w.phone} label="phone number" />
                </dd>
                <dt>CNIC</dt>
                <dd>
                  <RevealValue userId={w.id} field="cnic" masked={w.cnicNumber} label="CNIC number" allowed={can.cnicView} deniedHint="needs CNIC_VIEW to reveal" />
                </dd>
                <dt>Emergency contact</dt>
                <dd>
                  <RevealValue userId={w.id} field="emergencyContact" masked={"Hidden"} label="emergency contact" />
                </dd>
                <dt>Age</dt>
                <dd>{age !== null ? `${age} years` : <span className="muted">Date of birth not recorded</span>}</dd>
                <dt>Member since</dt>
                <dd>{formatDate(w.memberSince)}</dd>
                <dt>Signed up by</dt>
                <dd>
                  {w.createdBy ? (
                    <>
                      {w.createdBy.name} <span className="mono muted">{w.createdBy.staffCode}</span>
                    </>
                  ) : (
                    "Self sign-up"
                  )}
                </dd>
                <dt>Last login</dt>
                <dd>{w.lastLoginAt ? `${timeAgo(w.lastLoginAt)} (${formatDate(w.lastLoginAt)})` : "Never"}</dd>
              </dl>
              <p className="small muted">Opening this file was recorded in the audit log.</p>
            </div>

            <div className="grid-2">
              <IdentityCard w={w} onDone={state.reload} allowed={can.verify} />
              <VerificationCard w={w} onDone={state.reload} allowed={can.verify} />
            </div>

            <div className="grid-2">
              <CustodyCard w={w} onDone={state.reload} allowed={can.custody} />

              <div className="card stack-sm">
                <div className="row-between">
                  <h2>Endorsements</h2>
                  {!hasPlatform &&
                    (can.endorse ? (
                      <button className="btn btn-accent btn-sm" onClick={() => setEndorsing(true)}>
                        Request team endorsement
                      </button>
                    ) : (
                      <NeedsPerm perm="ENDORSE" />
                    ))}
                </div>
                <PendingNotes approvals={approvals} types={["TEAM_ENDORSE", "ENDORSEMENT_REVOKE"]} />
                {w.endorsements.length === 0 && <p className="muted">None yet.</p>}
                {w.endorsements.map((e) => (
                  <div key={e.id} className="row-between" style={{ borderBottom: "1px solid var(--line)", paddingBottom: 8 }}>
                    <div>
                      <strong>{e.endorser.name}</strong> <Stars value={e.rating} /> {!e.trustworthy && <Pill value="FAILED" label="Not trustworthy" />}
                      {e.comment && <div className="small">"{e.comment}"</div>}
                      <div className="muted small">
                        {e.type === "PLATFORM" ? "Team" : "Family"} · {formatDate(e.createdAt)}
                      </div>
                    </div>
                    {can.endorse && (
                      <button className="btn btn-danger-ghost btn-sm" disabled={busy} onClick={() => setRevoking(e.id)}>
                        Revoke…
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="card stack-sm">
              <div className="row-between">
                <h2>Penalties</h2>
                {can.penalties ? (
                  <button className="btn btn-danger-ghost btn-sm" onClick={() => setPenalizing(true)}>
                    Issue penalty
                  </button>
                ) : (
                  <NeedsPerm perm="PENALTIES" />
                )}
              </div>
              <PendingNotes approvals={approvals} types={["PENALTY", "PENALTY_LIFT", "COMPLAINT_DECISION"]} />
              {w.penalties.length === 0 && <p className="muted">None.</p>}
              {w.penalties.map((p) => {
                const active = !p.revokedAt && (!p.endsAt || new Date(p.endsAt) > new Date());
                return (
                  <div key={p.id} className="row-between" style={{ borderBottom: "1px solid var(--line)", paddingBottom: 8 }}>
                    <div>
                      <Pill value={p.type} label={staffLabel(p.type)} /> <span className="small">{p.reason}</span>
                      <div className="muted small">
                        {formatDate(p.startsAt)} → {p.endsAt ? formatDate(p.endsAt) : "indefinite"} · by {p.issuedBy?.name}
                        {p.approvedBy && ` · approved by ${p.approvedBy.name}`}
                        {p.revokedAt && ` · lifted ${formatDate(p.revokedAt)}: ${p.revokeNote ?? ""}`}
                      </div>
                    </div>
                    {active ? (
                      can.penalties ? (
                        <button className="btn btn-ghost btn-sm" disabled={busy} onClick={() => setLifting(p.id)}>
                          Request lift…
                        </button>
                      ) : null
                    ) : (
                      <span className="muted small">{p.revokedAt ? "Lifted" : "Expired"}</span>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="grid-2">
              <div className="card stack-sm">
                <div className="row-between">
                  <h2>Complaints from families</h2>
                  <Link to="/admin/complaints" className="small">
                    Complaints →
                  </Link>
                </div>
                {w.complaints.length === 0 && <p className="muted">None.</p>}
                {w.complaints.map((c) => (
                  <div key={c.id} className="stack-sm" style={{ borderBottom: "1px solid var(--line)", paddingBottom: 8 }}>
                    <div className="row">
                      <Pill value={c.severity} label={staffLabel(c.severity)} />
                      <Pill value={c.status} label={staffLabel(c.status)} />
                      <strong className="small">{staffLabel(c.category)}</strong>
                      <span className="muted small">
                        by {c.filedBy?.name} · {formatDate(c.createdAt)}
                      </span>
                    </div>
                    <span className="small">{c.description}</span>
                    {c.workerResponse && <span className="small muted">Worker's response: {c.workerResponse}</span>}
                  </div>
                ))}
              </div>
              <div className="card stack-sm">
                <div className="row-between">
                  <h2>Worker grievances</h2>
                  <Link to="/admin/grievances" className="small">
                    Grievances →
                  </Link>
                </div>
                <p className="small muted">Problems this worker raised about a household (unpaid wages, mistreatment, unsafe work).</p>
                {(w.grievances ?? []).length === 0 && <p className="muted">None.</p>}
                {(w.grievances ?? []).map((g) => (
                  <div key={g.id} className="stack-sm" style={{ borderBottom: "1px solid var(--line)", paddingBottom: 8 }}>
                    <div className="row">
                      <Pill value={g.severity} label={staffLabel(g.severity)} />
                      <Pill value={g.status} label={staffLabel(g.status)} />
                      <strong className="small">{staffLabel(g.category)}</strong>
                      <span className="muted small">
                        about {g.household?.name ?? "household"} · {formatDate(g.createdAt)}
                      </span>
                    </div>
                    <span className="small">{g.description}</span>
                    {g.resolution && <span className="small muted">Resolution: {g.resolution}</span>}
                  </div>
                ))}
              </div>
            </div>

            <div className="grid-2">
              <div className="card stack-sm">
                <h2>Placements</h2>
                {w.engagements.length === 0 && <p className="muted">None.</p>}
                {w.engagements.map((e) => (
                  <div key={e.id} className="row-between small">
                    <span>
                      <strong>{e.household.name}</strong> · {e.title}
                      <span className="muted">
                        {" "}
                        · {formatDate(e.startDate)}
                        {e.endDate ? ` to ${formatDate(e.endDate)}` : " onwards"}
                        {e.source === "PLATFORM_PLACEMENT" && " · placed by team"}
                      </span>
                    </span>
                    <Pill value={e.status} label={staffLabel(e.status)} />
                  </div>
                ))}
              </div>
              <div className="card stack-sm">
                <h2>Case notes</h2>
                <p className="small muted">Calls, visits and messages logged by staff.</p>
                {(w.caseNotes ?? []).length === 0 && <p className="muted">No notes yet.</p>}
                {(w.caseNotes ?? []).map((n) => (
                  <div key={n.id} className="stack-sm" style={{ borderBottom: "1px solid var(--line)", paddingBottom: 8 }}>
                    <span className="small">{n.summary}</span>
                    <span className="muted small">
                      {staffLabel(n.channel)} · {n.staff.name} <span className="mono">{n.staff.staffProfile?.staffCode}</span> · {timeAgo(n.createdAt)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="card stack-sm">
              <div className="row-between">
                <h2>Approval requests about this worker</h2>
                <Link to="/admin/approvals" className="small">
                  Approvals →
                </Link>
              </div>
              {approvals.length === 0 ? (
                <Empty title="No requests" />
              ) : (
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>When</th>
                        <th>Request</th>
                        <th>Asked by</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {approvals.map((a) => (
                        <tr key={a.id}>
                          <td className="nowrap small">{formatDate(a.createdAt)}</td>
                          <td>
                            <div className="small">{a.summary}</div>
                            <div className="muted small">Reason: {a.reason}</div>
                            {a.decisionNote && (
                              <div className="muted small">
                                {a.decidedBy?.name}: "{a.decisionNote}"
                              </div>
                            )}
                          </td>
                          <td className="small">{a.requestedBy.name}</td>
                          <td>
                            <Pill value={APPROVAL_PILL[a.status] ?? a.status} label={staffLabel(a.status)} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {penalizing && (
              <Modal title={`Penalty for ${w.name}`} onClose={() => setPenalizing(false)}>
                <form
                  className="form"
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const ok = await perform(
                      () => api.post<PerformResult>("/admin/penalties", { workerId: w.id, ...penaltyPayload(penalty) }),
                      `${staffLabel(penalty.type)} issued`,
                    );
                    if (ok) {
                      setPenalizing(false);
                      setPenalty(emptyPenalty("WARNING"));
                    }
                  }}
                >
                  <p className="small muted">For complaint-related penalties, prefer reviewing the complaint on the Complaints page so the decision is linked.</p>
                  <PenaltyFields value={penalty} onChange={setPenalty} />
                  <button className="btn btn-danger btn-block" disabled={busy}>
                    {penaltyNeedsApproval(penalty.type) ? "Request penalty" : "Issue penalty"}
                  </button>
                </form>
              </Modal>
            )}

            {endorsing && (
              <Modal title={`Team endorsement for ${w.name}`} onClose={() => setEndorsing(false)}>
                <form
                  className="form"
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const ok = await perform(
                      () =>
                        api.post<PerformResult>(`/admin/workers/${w.id}/endorse`, {
                          comment: endorse.comment,
                          rating: Number(endorse.rating),
                          reason: endorse.reason,
                        }),
                      "Team endorsement added",
                    );
                    if (ok) setEndorsing(false);
                  }}
                >
                  <p className="small muted">Only endorse workers the team knows personally. This shows a "Team endorsed" badge to every family.</p>
                  <Field label="Endorsement note (public)">
                    <textarea value={endorse.comment} onChange={(e) => setEndorse({ ...endorse, comment: e.target.value })} />
                  </Field>
                  <Field label="Rating">
                    <Select value={endorse.rating} onChange={(rating) => setEndorse({ ...endorse, rating })} options={["5", "4", "3", "2", "1"]} labelFn={(r) => `${r} / 5`} />
                  </Field>
                  <Field label="How does the team know this worker? (for the approver)" hint="At least 3 characters">
                    <input value={endorse.reason} onChange={(e) => setEndorse({ ...endorse, reason: e.target.value })} minLength={3} required />
                  </Field>
                  <div className="pending-approval">Team endorsements need a second staff member's approval before the badge appears.</div>
                  <button className="btn btn-accent btn-block" disabled={busy}>
                    Request endorsement
                  </button>
                </form>
              </Modal>
            )}

            {lifting && (
              <ReasonModal
                title="Lift penalty"
                intro={<div className="pending-approval">Lifting a penalty needs a second staff member's approval.</div>}
                label="Why should it be lifted? (shown to the worker)"
                submitLabel="Request lift"
                onClose={() => setLifting(null)}
                onSubmit={(note) => perform(() => api.post<PerformResult>(`/admin/penalties/${lifting}/revoke`, { note, reason: note }), "Penalty lifted")}
              />
            )}

            {revoking && (
              <ReasonModal
                title="Revoke endorsement"
                intro={<div className="pending-approval">Revoking an endorsement needs a second staff member's approval.</div>}
                label="Reason for revoking"
                submitLabel="Request revoke"
                danger
                onClose={() => setRevoking(null)}
                onSubmit={(reason) => perform(() => api.post<PerformResult>(`/admin/endorsements/${revoking}/revoke`, { reason }), "Endorsement revoked")}
              />
            )}
          </div>
        );
      }}
    </Loaded>
  );
}
