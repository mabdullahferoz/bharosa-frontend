import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { BadgeCheck, IdCard, ShieldAlert, ShieldCheck } from "lucide-react";
import type { Endorsement, Trust } from "./types";
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
  return (
    <span className="avatar" style={{ width: size, height: size, fontSize: size * 0.36, background: faceColor(name), color: "#fff" }} aria-hidden>
      {initialsOf(name)}
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

/**
 * The trust signals households see on a worker, strongest first. Family endorsements are not a
 * badge: they show as stacked faces (EndorsementStack), LinkedIn-style.
 */
export function TrustBadges({ trust, compact = false }: { trust: Trust; compact?: boolean }) {
  const items: ReactNode[] = [];
  if (trust.policeVerified)
    items.push(
      <span key="v" className="badge badge-verified" title={t("Police verification completed by the Bharosa team")}>
        <ShieldCheck aria-hidden /> {t("Police verified")}
      </span>,
    );
  if (trust.badgeSuspended && trust.verificationStatus === "VERIFIED")
    items.push(
      <span key="s" className="badge badge-suspended" title={t("Verified badge suspended after a complaint review")}>
        <ShieldAlert aria-hidden /> {t("Badge suspended")}
      </span>,
    );
  if (trust.cnicInCustody)
    items.push(
      <span key="c" className="badge badge-cnic" title={t("Original CNIC is held safely by the Bharosa team")}>
        <IdCard aria-hidden /> {t("CNIC held by team")}
      </span>,
    );
  if (trust.platformEndorsed)
    items.push(
      <span key="p" className="badge badge-endorsed" title={t("Personally known to and endorsed by the Bharosa team")}>
        <BadgeCheck aria-hidden /> {t("Team endorsed")}
      </span>,
    );
  if (!items.length && !compact) items.push(<span key="n" className="badge badge-none">{t("New, not yet verified")}</span>);
  return items.length ? <div className="badges">{items}</div> : null;
}

// Deep, white-text-safe colours for initials faces (all pass 4.5:1 with white).
const FACE_COLORS = ["#9a3412", "#1d4ed8", "#7e22ce", "#0f766e", "#be123c", "#4d7c0f", "#a16207", "#0e7490"];
export function faceColor(name: string) {
  let hash = 0;
  for (const c of name) hash = (hash * 31 + c.charCodeAt(0)) >>> 0;
  return FACE_COLORS[hash % FACE_COLORS.length];
}
export const initialsOf = (name: string) =>
  name
    .replace(/&/g, " ")
    .split(/\s+/)
    .filter((w) => /^[A-Za-z]/.test(w))
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase() || "?";

/**
 * LinkedIn-style endorsements: the endorsers' faces stacked in small circles, then
 * "Endorsed by Sana Malik and 3 other families". The team's endorsement shows as a green "B".
 */
export function EndorsementStack({
  endorsements,
  max = 4,
  large = false,
}: {
  endorsements: Pick<Endorsement, "id" | "type" | "trustworthy" | "endorser">[];
  max?: number;
  large?: boolean;
}) {
  const valid = endorsements.filter((e) => e.trustworthy);
  const team = valid.some((e) => e.type === "PLATFORM");
  const families = valid.filter((e) => e.type === "HOUSEHOLD");
  if (!valid.length) return <div className="endorse">{t("No endorsements yet")}</div>;

  const faces = [...(team ? [{ key: "team", team: true, name: "Bharosa" }] : []), ...families.map((e) => ({ key: e.id, team: false, name: e.endorser.name }))];
  const shown = faces.length > max ? faces.slice(0, max - 1) : faces;
  const more = faces.length - shown.length;
  const lead = families[0]?.endorser.name;
  const others = families.length - 1;

  // Whole-sentence templates so each language can order the names naturally.
  let template: string;
  if (!families.length) template = t("Endorsed by {team}");
  else if (!team && others === 0) template = t("Endorsed by {name}");
  else if (!team) template = others === 1 ? t("Endorsed by {name} and 1 other family") : t("Endorsed by {name} and {n} other families", { n: others });
  else if (others === 0) template = t("Endorsed by {team} and {name}");
  else template = others === 1 ? t("Endorsed by {name}, {team} and 1 other family") : t("Endorsed by {name}, {team} and {n} other families", { n: others });
  const slots: Record<string, ReactNode> = { name: <strong>{lead}</strong>, team: <strong>{t("the Bharosa team")}</strong> };
  const text = template.split(/\{(name|team)\}/).map((part, i) => (i % 2 ? <span key={i}>{slots[part]}</span> : part));

  return (
    <div className="endorse">
      <span className={`face-stack${large ? " lg" : ""}`} aria-hidden>
        {shown.map((f) =>
          f.team ? (
            <span key={f.key} className="face face-team" title={t("the Bharosa team")}>B</span>
          ) : (
            <span key={f.key} className="face" style={{ background: faceColor(f.name) }} title={f.name}>
              {initialsOf(f.name)}
            </span>
          ),
        )}
        {more > 0 && <span className="face face-more">+{more}</span>}
      </span>
      <span>{text}</span>
    </div>
  );
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
