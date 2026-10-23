import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../api";
import { useAuth } from "../../auth";
import { isUrdu, msg, t } from "../../i18n";
import type { Me } from "../../types";
import { categoryLabel, Field, formatDate, humanize, PageHeader, Select, TrustBadges, useAction } from "../../ui";

const STEPS: Record<string, { tone: string; text: string }> = {
  NONE: { tone: "callout-accent", text: msg("Not verified yet. Add your CNIC number below, then request verification.") },
  PENDING: { tone: "callout-info", text: msg("Request received. Please visit our office with your original CNIC. Our team will start your police verification.") },
  IN_PROGRESS: { tone: "callout-info", text: msg("Your police verification is in progress. We will notify you when it's done.") },
  VERIFIED: { tone: "callout-ok", text: msg("You are police verified. Families see the Verified badge on your profile.") },
  FAILED: { tone: "callout-error", text: msg("Verification could not be completed. Please contact our team.") },
};

export default function WorkerProfile() {
  const { user, meta, setUser } = useAuth();
  const { busy, run } = useAction();
  const p = user?.workerProfile;
  const [form, setForm] = useState({
    name: user?.name ?? "",
    city: user?.city ?? "Lahore",
    area: user?.area ?? "",
    skills: p?.skills ?? [],
    bio: p?.bio ?? "",
    experienceYears: String(p?.experienceYears ?? 0),
    expectedWage: p?.expectedWage ? String(p.expectedWage) : "",
    availability: p?.availability ?? "FULL_TIME",
    hometown: p?.hometown ?? "",
    languages: p?.languages ?? "Urdu",
    gender: p?.gender ?? "",
    cnicNumber: "",
    dateOfBirth: "",
  });
  const [returnAsked, setReturnAsked] = useState(!!user?.cnicReturnRequestedAt);
  useEffect(() => {
    // refresh trust state (badges can change by admin action)
    api.get<Me>("/me").then(setUser).catch(() => undefined);
  }, [setUser]);
  if (!user || !p) return null;
  const set = <K extends keyof typeof form>(k: K) => (v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }));
  const status = p.verificationStatus ?? "NONE";
  const step = STEPS[status] ?? STEPS.NONE;

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const me = await run(
      () =>
        api.patch<Me>("/me", {
          name: form.name,
          city: form.city,
          area: form.area || null,
          worker: {
            skills: form.skills,
            bio: form.bio || null,
            experienceYears: Number(form.experienceYears) || 0,
            expectedWage: form.expectedWage ? Number(form.expectedWage) : null,
            availability: form.availability,
            hometown: form.hometown || null,
            languages: form.languages,
            gender: form.gender || null,
            ...(form.cnicNumber ? { cnicNumber: form.cnicNumber } : {}),
            ...(form.dateOfBirth && !p.dateOfBirth ? { dateOfBirth: form.dateOfBirth } : {}),
          },
        }),
      t("Profile saved"),
    );
    if (me) {
      setUser(me);
      set("cnicNumber")("");
      set("dateOfBirth")("");
    }
  };

  return (
    <div className="split">
      <div>
        <PageHeader title={t("My profile")} subtitle={t("This is what families see. A complete profile gets more offers.")} />
        <form className="card form" onSubmit={save}>
          <div className="grid-2">
            <Field label={t("Full name")}>
              <input value={form.name} onChange={(e) => set("name")(e.target.value)} required />
            </Field>
            <Field label={t("Mobile number")} hint={t("Shared with a family only after you agree on a job")}>
              <input className="ltr" value={user.phone} disabled />
            </Field>
          </div>
          <Field label={t("Work I do")}>
            <div className="chips">
              {(meta?.categories ?? []).map((c) => (
                <button
                  key={c}
                  type="button"
                  className="chip"
                  aria-pressed={form.skills.includes(c)}
                  onClick={() => set("skills")(form.skills.includes(c) ? form.skills.filter((x) => x !== c) : [...form.skills, c])}
                >
                  {categoryLabel(c)}
                </button>
              ))}
            </div>
          </Field>
          <Field label={t("About me")} hint={t("Where you worked before, what you are good at")}>
            <textarea dir="auto" value={form.bio} onChange={(e) => set("bio")(e.target.value)} maxLength={1000} />
          </Field>
          <div className="grid-2">
            <Field label={t("Years of experience")}>
              <input type="number" min={0} max={60} value={form.experienceYears} onChange={(e) => set("experienceYears")(e.target.value)} />
            </Field>
            <Field label={t("Expected wage per month (Rs)")}>
              <input type="number" min={0} step={100} value={form.expectedWage} onChange={(e) => set("expectedWage")(e.target.value)} />
            </Field>
            <Field label={t("Availability")}>
              <Select value={form.availability} onChange={set("availability")} options={meta?.schedules ?? []} />
            </Field>
            <Field label={t("Gender")}>
              <Select value={form.gender} onChange={set("gender")} options={["FEMALE", "MALE", "OTHER"]} placeholder={t("Prefer not to say")} />
            </Field>
            <Field label={t("City")}>
              <Select value={form.city} onChange={set("city")} options={meta?.cities ?? []} labelFn={humanize} />
            </Field>
            <Field label={t("Area")}>
              <input value={form.area} onChange={(e) => set("area")(e.target.value)} />
            </Field>
            <Field label={t("Home town / village")}>
              <input value={form.hometown} onChange={(e) => set("hometown")(e.target.value)} />
            </Field>
            <Field label={t("Languages")}>
              <input value={form.languages} onChange={(e) => set("languages")(e.target.value)} />
            </Field>
          </div>
          <Field
            label={t("Date of birth")}
            hint={p.dateOfBirth ? t("To correct it, contact our team.") : t("You must be {n} or older to join.", { n: meta?.minWorkerAge ?? 18 })}
          >
            {p.dateOfBirth ? (
              <input value={formatDate(p.dateOfBirth)} disabled />
            ) : (
              <input className="ltr" type="date" value={form.dateOfBirth} onChange={(e) => set("dateOfBirth")(e.target.value)} />
            )}
          </Field>
          <Field
            label={t("CNIC number")}
            hint={
              p.cnicNumber
                ? t("On file: {cnic}. Only our team can see it.", { cnic: p.cnicNumber })
                : t("Needed for police verification. Only our team can see it.")
            }
          >
            <input
              className="ltr"
              inputMode="numeric"
              value={form.cnicNumber}
              onChange={(e) => set("cnicNumber")(e.target.value)}
              placeholder="12345-1234567-1"
              pattern="[0-9]{5}-[0-9]{7}-[0-9]"
              disabled={status === "VERIFIED"}
            />
          </Field>
          <button className="btn" disabled={busy}>
            {t("Save profile")}
          </button>
        </form>
      </div>

      <aside className="stack">
        <div className="card stack-sm">
          <h3>{t("My trust badges")}</h3>
          {user.trust && <TrustBadges trust={user.trust} />}
          {user.trust && (
            <p className="small muted">
              {t("{e} family endorsement(s) · {p} placement(s)", { e: user.trust.householdEndorsements, p: user.trust.placements })}
            </p>
          )}
        </div>
        <div className="card stack-sm">
          <h3>{t("Police verification")}</h3>
          <div className={`callout ${step.tone} small`}>
            <span>{t(step.text)}</span>
          </div>
          {(status === "NONE" || status === "FAILED") && (
            <button
              className="btn btn-block"
              disabled={busy || !p.cnicNumber}
              onClick={async () => {
                const me = await run(() => api.post<Me>("/me/verification-request"), t("Request sent to our team"));
                if (me) setUser(me);
              }}
            >
              {t("Request verification")}
            </button>
          )}
          {!p.cnicNumber && status === "NONE" && <span className="small muted">{t("Add and save your CNIC number first.")}</span>}
          {status === "VERIFIED" && p.verificationExpiresAt && (
            <span className="small">{t("Valid until {date}. We will renew it with you before then.", { date: formatDate(p.verificationExpiresAt) })}</span>
          )}
          {p.identityCheckMethod && p.identityCheckMethod !== "NONE" && (
            <span className="small muted">{t("Identity checked by: {method}", { method: humanize(p.identityCheckMethod) })}</span>
          )}
          <p className="small muted">
            {t(
              "Verification is free. Our team takes your original CNIC for safekeeping while you work through Kaam Connect. You can ask for it back at any time.",
            )}
          </p>
        </div>
        <div className="card stack-sm">
          <h3>{t("My original CNIC")}</h3>
          {user.cnicInCustody ? (
            <>
              <div className="callout callout-info small">
                <span>
                  {t("Our team is keeping your original CNIC. It is yours. Ask for it back any time; we must return it within 48 hours.")}
                </span>
              </div>
              {returnAsked ? (
                <span className="small">{t("Request sent. Our team must return your CNIC within 48 hours.")}</span>
              ) : (
                <button
                  className="btn btn-block"
                  disabled={busy}
                  onClick={async () => {
                    const r = await run(() => api.post("/me/cnic-return-request"), t("Request sent. Our team must return your CNIC within 48 hours."));
                    if (r) setReturnAsked(true);
                  }}
                >
                  {t("I want my CNIC back")}
                </button>
              )}
            </>
          ) : (
            <span className="small muted">{t("Our team is not keeping your original CNIC.")}</span>
          )}
          {meta?.supportPhone && (
            <p className="small muted">
              {t("Kaam Connect helpline:")}{" "}
              <a className="ltr" href={`tel:${meta.supportPhone}`}>
                {meta.supportPhone}
              </a>
            </p>
          )}
        </div>
        <div className="card stack-sm">
          <h3>{t("My account")}</h3>
          <Link to="/me/activity" className="btn btn-ghost btn-block">
            {t("Activity on my account")}
          </Link>
          <span className="small muted">{t("See everything done on your account, including by our staff.")}</span>
          <Link to="/account/password" className="btn btn-ghost btn-block">
            {t("Change password")}
          </Link>
        </div>
        {user.trust?.badgeSuspended && (
          <div className="callout callout-warn small">
            <span>
              {t("Your badge is suspended after a complaint review.")} <Link to="/worker/complaints">{t("See complaints")}</Link>
            </span>
          </div>
        )}
        <Link to="/worker/complaints" className="small">
          {t("Complaints about my work")} {isUrdu() ? "←" : "→"}
        </Link>
        <p className="small muted">{t("Availability shown to families: {a}", { a: humanize(form.availability) })}</p>
      </aside>
    </div>
  );
}
