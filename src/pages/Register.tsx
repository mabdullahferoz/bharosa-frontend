import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { homeFor, useAuth } from "../auth";
import { t } from "../i18n";
import { categoryLabel, Field, humanize, Select, useAction } from "../ui";

export default function Register() {
  const { register, meta } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [role, setRole] = useState<"HOUSEHOLD" | "WORKER">(params.get("role") === "WORKER" ? "WORKER" : "HOUSEHOLD");
  const [form, setForm] = useState({ name: "", phone: "", password: "", city: "Lahore", area: "" });
  const [dateOfBirth, setDateOfBirth] = useState("");
  const minAge = meta?.minWorkerAge ?? 18;
  // Latest birth date allowed (today minus minAge years), for the date picker.
  const latestDob = (() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - minAge);
    return d.toISOString().slice(0, 10);
  })();
  const tooYoung = role === "WORKER" && dateOfBirth !== "" && dateOfBirth > latestDob;
  const [skills, setSkills] = useState<string[]>([]);
  const { busy, run } = useAction();
  const set = (k: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (tooYoung) return;
    const user = await run(() =>
      register({ role, ...form, area: form.area || undefined, ...(role === "WORKER" ? { skills, dateOfBirth } : {}) }),
    );
    if (user) navigate(role === "WORKER" ? "/worker/profile" : homeFor(user.role), { replace: true });
  };

  return (
    <div className="auth-wrap">
      <div className="card stack">
        <div>
          <h1>{t("Create your account")}</h1>
          <p className="muted">{t("Free to join. Takes one minute.")}</p>
        </div>
        <div className="role-pick">
          <button type="button" aria-pressed={role === "HOUSEHOLD"} onClick={() => setRole("HOUSEHOLD")}>
            <strong>{t("I need help")}</strong>
            <span className="muted small">{t("I am a family looking for a worker")}</span>
          </button>
          <button type="button" aria-pressed={role === "WORKER"} onClick={() => setRole("WORKER")}>
            <strong>{t("I want work")}</strong>
            <span className="muted small">{t("I am a maid, cook, driver…")}</span>
          </button>
        </div>
        <form className="form" onSubmit={submit}>
          <Field label={t("Full name")}>
            <input value={form.name} onChange={(e) => set("name")(e.target.value)} autoComplete="name" required minLength={2} />
          </Field>
          <Field label={t("Mobile number")} hint={t("You will log in with this number")}>
            <input className="ltr" type="tel" inputMode="tel" autoComplete="tel" placeholder="03XXXXXXXXX" pattern="03[0-9]{9}" value={form.phone} onChange={(e) => set("phone")(e.target.value)} required />
          </Field>
          <Field label={t("Password")} hint={t("At least 8 characters")}>
            <input type="password" autoComplete="new-password" minLength={8} value={form.password} onChange={(e) => set("password")(e.target.value)} required />
          </Field>
          <div className="grid-2">
            <Field label={t("City")}>
              <Select value={form.city} onChange={set("city")} options={meta?.cities ?? ["Lahore"]} labelFn={humanize} />
            </Field>
            <Field label={t("Area (optional)")}>
              <input value={form.area} onChange={(e) => set("area")(e.target.value)} placeholder={t("e.g. DHA Phase 5")} />
            </Field>
          </div>
          {role === "WORKER" && (
            <Field
              label={t("Date of birth")}
              hint={tooYoung ? t("Sorry, you must be at least {n} years old to work through Bharosa.", { n: minAge }) : t("You must be {n} or older to join.", { n: minAge })}
            >
              <input className="ltr" type="date" max={latestDob} min="1940-01-01" value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} required />
            </Field>
          )}
          {role === "WORKER" && (
            <Field label={t("What work do you do?")}>
              <div className="chips">
                {(meta?.categories ?? []).map((c) => (
                  <button
                    key={c}
                    type="button"
                    className="chip"
                    aria-pressed={skills.includes(c)}
                    onClick={() => setSkills((s) => (s.includes(c) ? s.filter((x) => x !== c) : [...s, c]))}
                  >
                    {categoryLabel(c)}
                  </button>
                ))}
              </div>
            </Field>
          )}
          <div className="callout callout-info small">
            <span>
              {t("Joining is free. Never pay anyone to register.")}
              {meta?.supportPhone && (
                <>
                  {" "}
                  {t("If someone asks you for money, call our helpline:")} <span className="ltr">{meta.supportPhone}</span>
                </>
              )}
            </span>
          </div>
          <button className="btn btn-block" disabled={busy || tooYoung}>
            {busy ? t("Creating…") : t("Create account")}
          </button>
        </form>
        <p className="muted small">
          {t("Already have an account?")} <Link to="/login">{t("Log in")}</Link>
        </p>
      </div>
    </div>
  );
}
