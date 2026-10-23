// Assisted sign-up: staff create an account for a worker or household who can't use the app.
import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api } from "../../api";
import { hasPerm, useAuth } from "../../auth";
import { categoryLabel, Field, PageHeader, Select, useAction } from "../../ui";
import { ConsentInput, consentText, MIN_CONSENT, TempPasswordBox } from "./assist/shared";

type Role = "WORKER" | "HOUSEHOLD";

const blank = (role: Role) => ({
  role,
  name: "",
  phone: "",
  city: "",
  area: "",
  skills: [] as string[],
  dateOfBirth: "",
  cnicNumber: "",
  emergencyContact: "",
  hasSmartphone: false,
});

export default function AdminSignup() {
  const { user, meta } = useAuth();
  const [params] = useSearchParams();
  const canWorker = hasPerm(user, "WORKERS_ASSIST");
  const canHousehold = hasPerm(user, "HOUSEHOLDS_ASSIST");
  const initialRole: Role = params.get("role") === "HOUSEHOLD" ? "HOUSEHOLD" : canWorker || !canHousehold ? "WORKER" : "HOUSEHOLD";
  const [f, setF] = useState(() => blank(initialRole));
  const [consent, setConsent] = useState("");
  const [done, setDone] = useState<{ id: string; tempPassword: string; name: string; role: Role } | null>(null);
  const { busy, run } = useAction();
  const isWorker = f.role === "WORKER";
  const allowed = isWorker ? canWorker : canHousehold;
  const consentValue = consent || consentText("Office visit", f.name || "they");

  // Latest date of birth for an adult worker.
  const minAge = meta?.minWorkerAge ?? 18;
  const maxDob = new Date(new Date().setFullYear(new Date().getFullYear() - minAge)).toISOString().slice(0, 10);

  if (!canWorker && !canHousehold) {
    return (
      <div>
        <PageHeader title="Sign someone up" />
        <div className="callout callout-error">You need the WORKERS_ASSIST or HOUSEHOLDS_ASSIST permission to create accounts for people.</div>
      </div>
    );
  }

  if (done) {
    const w = done.role === "WORKER";
    return (
      <div className="stack" style={{ maxWidth: 640 }}>
        <PageHeader title="Account created" subtitle={`${done.name} has been sent an SMS saying you created their account.`} />
        <TempPasswordBox password={done.tempPassword} name={done.name} />
        <div className="callout callout-info small">
          Tell {done.name.split(" ")[0]}: joining Bharosa is free. Nobody from Bharosa will ever ask them for money. If someone does, they should
          call {meta?.supportPhone ?? "the helpline"}.
        </div>
        <div className="row">
          {w ? (
            <>
              <Link className="btn" to={`/admin/workers/${done.id}/assist`}>
                Act for this worker
              </Link>
              <Link className="btn btn-ghost" to={`/admin/workers/${done.id}`}>
                Open worker file
              </Link>
            </>
          ) : (
            <Link className="btn" to="/admin/households">
              Go to households (post a job for them)
            </Link>
          )}
          <button
            className="btn btn-ghost"
            onClick={() => {
              setDone(null);
              setF(blank(done.role));
              setConsent("");
            }}
          >
            Sign up someone else
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="stack" style={{ maxWidth: 720 }}>
      <PageHeader
        title="Sign someone up"
        subtitle="For a worker or family who can't use the app themselves. They get a temporary password and an SMS saying you created the account."
      />
      <div className="callout callout-warn">
        <span>
          <strong>Joining is free.</strong> Never take money, documents or favours for a sign-up. Fill this in with the person present or on the phone,
          and read every detail back to them.
        </span>
      </div>

      <form
        className="card form"
        onSubmit={async (e) => {
          e.preventDefault();
          if (isWorker && f.skills.length === 0) return;
          const r = await run(() =>
            api.post<{ id: string; tempPassword: string }>("/assist/signup", {
              role: f.role,
              name: f.name.trim(),
              phone: f.phone.trim(),
              city: f.city,
              area: f.area.trim() || undefined,
              hasSmartphone: f.hasSmartphone,
              consent: consentValue.trim(),
              ...(isWorker
                ? {
                    skills: f.skills,
                    dateOfBirth: f.dateOfBirth || undefined,
                    cnicNumber: f.cnicNumber.trim() || undefined,
                    emergencyContact: f.emergencyContact.trim() || undefined,
                  }
                : {}),
            }),
          );
          if (r) setDone({ id: r.id, tempPassword: r.tempPassword, name: f.name.trim(), role: f.role });
        }}
      >
        <div className="stack-sm">
          <span className="field-label">Who are you signing up?</span>
          <div className="chips">
            <button type="button" className="chip" aria-pressed={isWorker} disabled={!canWorker} onClick={() => setF({ ...f, role: "WORKER" })}>
              A worker
            </button>
            <button type="button" className="chip" aria-pressed={!isWorker} disabled={!canHousehold} onClick={() => setF({ ...f, role: "HOUSEHOLD" })}>
              A household (family)
            </button>
          </div>
          {!allowed && <span className="field-hint" style={{ color: "var(--danger)" }}>You don't have permission to sign up this kind of account.</span>}
        </div>

        <div className="grid-2">
          <Field label="Full name">
            <input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} minLength={2} maxLength={80} required autoComplete="off" />
          </Field>
          <Field label="Mobile number" hint="Their own number, format 03XXXXXXXXX. The SMS goes here.">
            <input
              value={f.phone}
              onChange={(e) => setF({ ...f, phone: e.target.value.replace(/[^\d]/g, "") })}
              pattern="03\d{9}"
              inputMode="tel"
              maxLength={11}
              required
              autoComplete="off"
            />
          </Field>
          <Field label="City">
            <Select value={f.city} onChange={(city) => setF({ ...f, city })} options={meta?.cities ?? []} labelFn={(c) => c} placeholder="Choose" />
          </Field>
          <Field label="Area / neighbourhood">
            <input value={f.area} onChange={(e) => setF({ ...f, area: e.target.value })} maxLength={80} />
          </Field>
        </div>

        {isWorker && (
          <>
            <div className="stack-sm">
              <span className="field-label">Work they can do</span>
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
              {f.skills.length === 0 && <span className="field-hint">Choose at least one.</span>}
            </div>
            <div className="grid-2">
              <Field label="Date of birth" hint={`Workers must be at least ${minAge}. Check the CNIC if they have it.`}>
                <input type="date" value={f.dateOfBirth} max={maxDob} onChange={(e) => setF({ ...f, dateOfBirth: e.target.value })} required />
              </Field>
              <Field label="CNIC number (optional)" hint="Format 12345-1234567-1">
                <input
                  value={f.cnicNumber}
                  onChange={(e) => setF({ ...f, cnicNumber: e.target.value })}
                  pattern="\d{5}-\d{7}-\d"
                  placeholder="12345-1234567-1"
                  autoComplete="off"
                />
              </Field>
              <Field label="Emergency contact (optional)" hint="Name, relation and phone">
                <input value={f.emergencyContact} onChange={(e) => setF({ ...f, emergencyContact: e.target.value })} maxLength={120} />
              </Field>
            </div>
          </>
        )}

        <label className="check">
          <input type="checkbox" checked={f.hasSmartphone} onChange={(e) => setF({ ...f, hasSmartphone: e.target.checked })} />
          Has a smartphone and can use the app
        </label>
        <span className="field-hint" style={{ marginTop: -6 }}>
          {f.hasSmartphone
            ? "They will log in themselves with the temporary password."
            : "Marked as assisted: staff will respond to jobs and offers for them, with their consent each time."}
        </span>

        <hr />
        <ConsentInput name={f.name || "the person"} value={consentValue} onChange={setConsent} />

        <button className="btn btn-block" disabled={busy || !allowed || (isWorker && f.skills.length === 0) || consentValue.trim().length < MIN_CONSENT}>
          {busy ? "Creating…" : `Create ${isWorker ? "worker" : "household"} account`}
        </button>
      </form>
    </div>
  );
}
