import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, tokenStore } from "../api";
import { homeFor, useAuth } from "../auth";
import { t } from "../i18n";
import type { Me } from "../types";
import { Field, useAction } from "../ui";

/**
 * Change password. With `forced`, shown instead of every page while the account still has a
 * temporary password set by staff (assisted sign-up or password reset).
 */
export default function ChangePassword({ forced = false }: { forced?: boolean }) {
  const { user, setUser, logout } = useAuth();
  const navigate = useNavigate();
  const { busy, run } = useAction();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [repeat, setRepeat] = useState("");
  const mismatch = repeat.length > 0 && next !== repeat;

  return (
    <div className="auth-wrap">
      <div className="card stack">
        <div>
          <h1>{forced ? t("Choose your own password") : t("Change password")}</h1>
          <p className="muted">
            {forced
              ? t("Your account was set up or reset by our team with a temporary password. Choose a new one that only you know.")
              : t("Use at least 8 characters.")}
          </p>
        </div>
        <form
          className="form"
          onSubmit={async (e) => {
            e.preventDefault();
            if (next !== repeat) return;
            const r = await run(
              () => api.post<{ token: string; user: Me }>("/me/password", { currentPassword: current, newPassword: next }),
              t("Password changed"),
            );
            if (r) {
              tokenStore.set(r.token);
              setUser(r.user);
              navigate(homeFor(r.user.role), { replace: true });
            }
          }}
        >
          <Field label={forced ? t("Temporary password") : t("Current password")}>
            <input type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} required />
          </Field>
          <Field label={t("New password")} hint={t("At least 8 characters")}>
            <input type="password" autoComplete="new-password" minLength={8} value={next} onChange={(e) => setNext(e.target.value)} required />
          </Field>
          <Field label={t("Repeat new password")} hint={mismatch ? t("The two passwords are different") : undefined}>
            <input type="password" autoComplete="new-password" minLength={8} value={repeat} onChange={(e) => setRepeat(e.target.value)} required />
          </Field>
          <button className="btn btn-block" disabled={busy || mismatch}>
            {t("Save new password")}
          </button>
        </form>
        {forced && user && (
          <button className="btn btn-ghost btn-sm" onClick={logout}>
            {t("Log out")}
          </button>
        )}
      </div>
    </div>
  );
}
