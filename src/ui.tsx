import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import type { Trust } from "./types";
import { dateLocale, enumLabel, isUrdu, msg, t } from "./i18n";

// ---- Formatting -------------------------------------------------------------

/** Readable, translated label for an API enum value (FULL_TIME -> "Full time" / "کل وقتی"). */
export const humanize = (s: string | null | undefined) => enumLabel(s);
export const categoryLabel = (c: string) => enumLabel(c);

const PERIOD: Record<string, string> = { MONTHLY: msg("/ month"), DAILY: msg("/ day"), ONE_TIME: msg("one-time") };
// Western digits in both languages, as on Pakistani price tags and apps.
export const rupees = (n: number) => (isUrdu() ? `${n.toLocaleString("en-PK")} روپے` : `Rs ${n.toLocaleString("en-PK")}`);
export function Money({ amount, period }: { amount: number; period?: string }) {
  return (
    <span className="money">
      {rupees(amount)}
      {period && <span className="money-period"> {PERIOD[period] ? t(PERIOD[period]) : humanize(period)}</span>}
    </span>
  );
}

export const formatDate = (d: string | Date) =>
  new Date(d).toLocaleDateString(dateLocale(), { day: "numeric", month: "short", year: "numeric", numberingSystem: "latn" });

export function timeAgo(d: string | Date) {
  const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
  if (s < 60) return t("just now");
  if (s < 3600) return t("{n} min ago", { n: Math.floor(s / 60) });
  if (s < 86400) return t("{n} h ago", { n: Math.floor(s / 3600) });
  if (s < 86400 * 30) return t("{n} d ago", { n: Math.floor(s / 86400) });
  return formatDate(d);
}

// ---- Data loading -----------------------------------------------------------

export function useLoad<T>(fn: () => Promise<T>, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const fnRef = useRef(fn);
  fnRef.current = fn;
  const reload = useCallback(async () => {
    setLoading(true);
    try {
      setData(await fnRef.current());
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return { data, error, loading, reload, setData };
}

// ---- Toasts -----------------------------------------------------------------

type ToastKind = "ok" | "error";
const ToastContext = createContext<(msg: string, kind?: ToastKind) => void>(() => undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<{ id: number; msg: string; kind: ToastKind }[]>([]);
  const push = useCallback((msg: string, kind: ToastKind = "ok") => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, msg, kind }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4000);
  }, []);
  return (
    <ToastContext.Provider value={push}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast-${t.kind}`}>
            {t.msg}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);

/** Wraps an async action with a busy flag and error/success toasts. */
export function useAction() {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const run = useCallback(
    async <T,>(fn: () => Promise<T>, success?: string): Promise<T | undefined> => {
      setBusy(true);
      try {
        const r = await fn();
        if (success) toast(success);
        return r;
      } catch (e) {
        // Server messages are English; known ones get translated.
        toast(t((e as Error).message), "error");
        return undefined;
      } finally {
        setBusy(false);
      }
    },
    [toast],
  );
  return { busy, run };
}

// ---- Small components -------------------------------------------------------

export function Spinner({ label }: { label?: string }) {
  return (
    <div className="spinner-wrap" aria-busy="true">
      <span className="spinner" />
      <span className="muted">{label ?? t("Loading")}…</span>
    </div>
  );
}

export function ErrorBox({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="callout callout-error">
      <span>{message}</span>
      {onRetry && (
        <button className="btn btn-ghost btn-sm" onClick={onRetry}>
          {t("Try again")}
        </button>
      )}
    </div>
  );
}

export function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="empty">
      <strong>{title}</strong>
      {children && <div className="muted">{children}</div>}
    </div>
  );
}

/** Renders loading / error / content for a useLoad result. */
export function Loaded<T>({ state, children }: { state: ReturnType<typeof useLoad<T>>; children: (d: T) => ReactNode }) {
  if (state.error) return <ErrorBox message={state.error} onRetry={state.reload} />;
  if (state.data === null) return <Spinner />;
  return <>{children(state.data)}</>;
}

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: ReactNode; action?: ReactNode }) {
  return (
    <div className="page-header">
      <div>
        <h1>{title}</h1>
        {subtitle && <p className="muted">{subtitle}</p>}
      </div>
      {action && <div className="page-header-action">{action}</div>}
    </div>
  );
}

export function Avatar({ name, size = 44 }: { name: string; size?: number }) {
  const initials = name
    .split(/\s+/)
    .filter((w) => /^[A-Za-z]/.test(w))
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
  let hash = 0;
  for (const c of name) hash = (hash * 31 + c.charCodeAt(0)) % 360;
  return (
    <span
      className="avatar"
      style={{ width: size, height: size, fontSize: size * 0.38, background: `hsl(${hash} 45% 88%)`, color: `hsl(${hash} 50% 28%)` }}
      aria-hidden
    >
      {initials || "?"}
    </span>
  );
}

const STATUS_TONE: Record<string, string> = {
  OPEN: "info",
  PENDING: "info",
  IN_PROGRESS: "info",
  UNDER_REVIEW: "warn",
  ACTIVE: "ok",
  ACCEPTED: "ok",
  FILLED: "ok",
  VERIFIED: "ok",
  UPHELD: "danger",
  DISMISSED: "neutral",
  DECLINED: "neutral",
  WITHDRAWN: "neutral",
  CLOSED: "neutral",
  CANCELLED: "neutral",
  ENDED: "neutral",
  RETURNED: "neutral",
  IN_CUSTODY: "ok",
  NONE: "neutral",
  FAILED: "danger",
  SUSPENDED: "warn",
  BANNED: "danger",
  LOW: "neutral",
  MEDIUM: "info",
  HIGH: "warn",
  CRITICAL: "danger",
  WARNING: "info",
  BADGE_SUSPENSION: "warn",
  SUSPENSION: "warn",
  BAN: "danger",
};

export function Pill({ value, label }: { value: string; label?: string }) {
  return <span className={`pill pill-${STATUS_TONE[value] ?? "neutral"}`}>{label ?? humanize(value)}</span>;
}

export function Stars({ value }: { value: number | null }) {
  if (!value) return null;
  return (
    <span className="stars" aria-label={t("{n} out of 5", { n: value })}>
      {"★★★★★".slice(0, Math.round(value))}
      <span className="stars-off">{"★★★★★".slice(Math.round(value))}</span>
    </span>
  );
}

const Icon = {
  shield: (
    <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden>
      <path fill="currentColor" d="M12 2 4 5v6c0 5 3.4 9.7 8 11 4.6-1.3 8-6 8-11V5l-8-3Zm-1.2 14.2-3.5-3.5 1.4-1.4 2.1 2.1 4.8-4.8 1.4 1.4-6.2 6.2Z" />
    </svg>
  ),
  card: (
    <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden>
      <path fill="currentColor" d="M3 5h18a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Zm2 4v2h6V9H5Zm0 4v2h4v-2H5Zm10-4a2 2 0 1 0 0 4 2 2 0 0 0 0-4Zm-3 7h6c0-1.7-1.3-2.5-3-2.5S12 14.3 12 16Z" />
    </svg>
  ),
  star: (
    <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden>
      <path fill="currentColor" d="m12 17.3-6.2 3.7 1.6-7L2 9.2l7.1-.6L12 2l2.9 6.6 7.1.6-5.4 4.8 1.6 7z" />
    </svg>
  ),
  home: (
    <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden>
      <path fill="currentColor" d="M12 3 2 11h3v9h5v-6h4v6h5v-9h3L12 3Z" />
    </svg>
  ),
  alert: (
    <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden>
      <path fill="currentColor" d="M1 21h22L12 2 1 21Zm12-3h-2v-2h2v2Zm0-4h-2v-4h2v4Z" />
    </svg>
  ),
};

/** The trust signals households see on a worker. Order = strongest first. */
export function TrustBadges({ trust, compact = false }: { trust: Trust; compact?: boolean }) {
  const items: ReactNode[] = [];
  if (trust.policeVerified)
    items.push(
      <span key="v" className="badge badge-verified" title={t("Police verification completed by the Kaam Connect team")}>
        {Icon.shield} {t("Police verified")}
      </span>,
    );
  if (trust.badgeSuspended && trust.verificationStatus === "VERIFIED")
    items.push(
      <span key="s" className="badge badge-suspended" title={t("Verified badge suspended after a complaint review")}>
        {Icon.alert} {t("Badge suspended")}
      </span>,
    );
  if (trust.cnicInCustody)
    items.push(
      <span key="c" className="badge badge-cnic" title={t("Original CNIC is held safely by the Kaam Connect team")}>
        {Icon.card} {t("CNIC held by team")}
      </span>,
    );
  if (trust.platformEndorsed)
    items.push(
      <span key="p" className="badge badge-endorsed" title={t("Personally known to and endorsed by the Kaam Connect team")}>
        {Icon.star} {t("Team endorsed")}
      </span>,
    );
  if (trust.householdEndorsements > 0)
    items.push(
      <span key="h" className="badge badge-family" title={t("Families who employed this worker for over a month vouched for them")}>
        {Icon.home}{" "}
        {trust.householdEndorsements === 1
          ? t("1 family vouches")
          : t("{n} families vouch", { n: trust.householdEndorsements })}
      </span>,
    );
  if (!items.length && !compact) items.push(<span key="n" className="badge badge-none">{t("New, not yet verified")}</span>);
  return <div className="badges">{items}</div>;
}

// ---- Overlays & forms -------------------------------------------------------

export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={title}>
        <div className="modal-head">
          <h2 dir="auto">{title}</h2>
          <button className="icon-btn" onClick={onClose} aria-label={t("Close")}>
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Field({ label, hint, children }: { label: string; hint?: ReactNode; children: ReactNode }) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      {children}
      {hint && <span className="field-hint">{hint}</span>}
    </label>
  );
}

export function Select({
  value,
  onChange,
  options,
  placeholder,
  labelFn = humanize,
}: {
  value: string;
  onChange: (v: string) => void;
  options: readonly string[];
  placeholder?: string;
  labelFn?: (v: string) => string;
}) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)}>
      {placeholder !== undefined && <option value="">{placeholder}</option>}
      {options.map((o) => (
        <option key={o} value={o}>
          {labelFn(o)}
        </option>
      ))}
    </select>
  );
}

export function Tabs<T extends string>({ value, onChange, tabs }: { value: T; onChange: (v: T) => void; tabs: { value: T; label: string; count?: number }[] }) {
  return (
    <div className="tabs" role="tablist">
      {tabs.map((t) => (
        <button key={t.value} role="tab" aria-selected={value === t.value} className={`tab ${value === t.value ? "tab-active" : ""}`} onClick={() => onChange(t.value)}>
          {t.label}
          {t.count !== undefined && t.count > 0 && <span className="tab-count">{t.count}</span>}
        </button>
      ))}
    </div>
  );
}

// ---- Staff actions ------------------------------------------------------------

/**
 * Message for the result of a sensitive staff action: done now, or waiting for a second person.
 * Usage: const r = await run(() => api.post<PerformResult>(...)); if (r) toast(performMessage(r));
 */
export function performMessage(r: { status: string; summary?: string }, doneText = "Done") {
  return r.status === "PENDING_APPROVAL"
    ? "Sent for approval. Another staff member must approve it before anything changes."
    : doneText;
}
