import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { homeFor, useAuth } from "../auth";
import { t } from "../i18n";
import { Field, useAction } from "../ui";

const DEMO = [
  { label: "Household", phone: "03001111111" },
  { label: "Worker", phone: "03101111111" },
  { label: "Admin", phone: "03000000000" },
];

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const { busy, run } = useAction();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const user = await run(() => login(phone.trim(), password));
    if (user) navigate((location.state as { from?: string } | null)?.from ?? homeFor(user.role), { replace: true });
  };

  return (
    <div className="auth-wrap">
      <div className="card stack">
        <div>
          <h1>{t("Welcome back")}</h1>
          <p className="muted">{t("Log in with your mobile number.")}</p>
        </div>
        <form className="form" onSubmit={submit}>
          <Field label={t("Mobile number")}>
            <input className="ltr" type="tel" inputMode="tel" autoComplete="tel" placeholder="03XXXXXXXXX" value={phone} onChange={(e) => setPhone(e.target.value)} required />
          </Field>
          <Field label={t("Password")}>
            <input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </Field>
          <button className="btn btn-block" disabled={busy}>
            {busy ? t("Logging in…") : t("Log in")}
          </button>
        </form>
        <p className="muted small">
          {t("New here?")} <Link to="/register">{t("Create an account")}</Link>
        </p>
        {import.meta.env.DEV && (
          <div className="callout callout-info demo-accounts">
            <span>
              Demo accounts (password <code>password123</code>):{" "}
              {DEMO.map((d, i) => (
                <span key={d.phone}>
                  {i > 0 && " · "}
                  <button
                    type="button"
                    onClick={() => {
                      setPhone(d.phone);
                      setPassword("password123");
                    }}
                  >
                    {d.label}
                  </button>
                </span>
              ))}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
