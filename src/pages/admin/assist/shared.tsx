// Shared building blocks for staff assisted mode: consent capture, the one-time
// temporary password box, and the legal minimum wage hint.
import { useState, type FormEvent, type ReactNode } from "react";
import type { Meta } from "../../../types";
import { Modal, rupees } from "../../../ui";

// ---- Consent --------------------------------------------------------------------------

const CONSENT_CHANNELS = ["Phone call", "Office visit", "Home visit", "WhatsApp voice note"] as const;

const clock = () => new Date().toLocaleTimeString("en-PK", { hour: "numeric", minute: "2-digit" });

export const consentText = (channel: string, name: string) =>
  `${channel} at ${clock()}: I read the details out loud and ${name.split(" ")[0]} clearly said yes.`;

export const MIN_CONSENT = 5;

/** "How did they agree?" input with quick chips. Prefilled, editable, min 5 characters. */
export function ConsentInput({ name, value, onChange }: { name: string; value: string; onChange: (v: string) => void }) {
  const [channel, setChannel] = useState<string>(CONSENT_CHANNELS[0]);
  return (
    <div className="stack-sm">
      <span className="field-label">How did {name.split(" ")[0]} agree?</span>
      <div className="chips">
        {CONSENT_CHANNELS.map((c) => (
          <button
            key={c}
            type="button"
            className="chip"
            aria-pressed={channel === c}
            onClick={() => {
              setChannel(c);
              onChange(consentText(c, name));
            }}
          >
            {c}
          </button>
        ))}
      </div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        minLength={MIN_CONSENT}
        maxLength={500}
        required
        rows={2}
        aria-label="Consent note"
      />
      <span className="field-hint">
        This note is saved with the action and shown to {name.split(" ")[0]} on their activity page. Add a witness if one was present.
      </span>
    </div>
  );
}

/**
 * Modal for every action taken for someone. Shows what to read out, extra fields (children),
 * the consent note, and a confirm button. `onSubmit` returns true to close.
 */
export function ConsentModal({
  title,
  name,
  readOut,
  children,
  confirmLabel,
  danger,
  busy,
  onSubmit,
  onClose,
}: {
  title: string;
  name: string;
  readOut?: ReactNode;
  children?: ReactNode;
  confirmLabel: string;
  danger?: boolean;
  busy: boolean;
  onSubmit: (consent: string) => Promise<boolean>;
  onClose: () => void;
}) {
  const [consent, setConsent] = useState(() => consentText(CONSENT_CHANNELS[0], name));
  const ok = consent.trim().length >= MIN_CONSENT;
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!ok) return;
    if (await onSubmit(consent.trim())) onClose();
  };
  return (
    <Modal title={title} onClose={onClose}>
      <form className="form" onSubmit={submit}>
        {readOut && (
          <div className="callout callout-accent">
            <div className="stack-sm">
              <strong>Read this out loud to {name.split(" ")[0]}:</strong>
              <div>{readOut}</div>
            </div>
          </div>
        )}
        {children}
        <ConsentInput name={name} value={consent} onChange={setConsent} />
        <button className={`btn btn-block ${danger ? "btn-danger" : ""}`} disabled={busy || !ok}>
          {busy ? "Saving…" : confirmLabel}
        </button>
        <p className="small muted">{name} will get an SMS and a notice saying you did this for them.</p>
      </form>
    </Modal>
  );
}

// ---- Temporary password ---------------------------------------------------------------

export function TempPasswordBox({ password, name }: { password: string; name: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="card stack-sm" style={{ borderColor: "var(--accent)", background: "var(--accent-soft)" }} role="alert">
      <strong>Temporary password for {name}</strong>
      <div className="row">
        <code className="mono" style={{ fontSize: "1.4rem", fontWeight: 800, letterSpacing: "0.04em", userSelect: "all" }}>
          {password}
        </code>
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={() => {
            void navigator.clipboard?.writeText(password).then(() => setCopied(true), () => undefined);
          }}
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <p className="small">
        Give this to {name.split(" ")[0]} privately (in person or on a call only they can hear). <strong>It will not be shown again.</strong> They
        must choose a new password the first time they log in. Never send it to anyone else.
      </p>
    </div>
  );
}

// ---- Minimum wage -----------------------------------------------------------------------

/** Fallback only: the API sends the authoritative table as meta.provinceOfCity. Unknown cities use the federal (ICT) figure, as the API does. */
const PROVINCE_OF_CITY: Record<string, string> = {
  Lahore: "PUNJAB",
  Rawalpindi: "PUNJAB",
  Faisalabad: "PUNJAB",
  Multan: "PUNJAB",
  Sialkot: "PUNJAB",
  Gujranwala: "PUNJAB",
  Karachi: "SINDH",
  Peshawar: "KP",
  Quetta: "BALOCHISTAN",
  Islamabad: "ICT",
};

const PROVINCE_LABEL: Record<string, string> = { PUNJAB: "Punjab", SINDH: "Sindh", KP: "KP", BALOCHISTAN: "Balochistan", ICT: "Islamabad" };

export function provinceOf(city: string, meta?: Meta | null) {
  return meta?.provinceOfCity?.[city] ?? PROVINCE_OF_CITY[city] ?? "ICT";
}

/** Minimum wage that applies (full-time / live-in only), or null. */
export function wageFloor(meta: Meta | null, city: string, schedule: string, wagePeriod: string): number | null {
  if (!meta || (schedule !== "FULL_TIME" && schedule !== "LIVE_IN")) return null;
  const monthly = meta.monthlyMinimumWage[provinceOf(city, meta)] ?? meta.monthlyMinimumWage.ICT;
  if (!monthly) return null;
  if (wagePeriod === "MONTHLY") return monthly;
  if (wagePeriod === "DAILY") return Math.ceil(monthly / 26);
  return null;
}

export function WageHint({ meta, city, schedule, wagePeriod, amount }: { meta: Meta | null; city: string; schedule: string; wagePeriod: string; amount?: number }) {
  const floor = wageFloor(meta, city, schedule, wagePeriod);
  if (floor === null) {
    if (schedule === "FULL_TIME" || schedule === "LIVE_IN") return <>No fixed legal floor for this pay period. Be fair.</>;
    return <>Part-time and one-off pay depends on hours. Be fair.</>;
  }
  const below = amount !== undefined && amount > 0 && amount < floor;
  return (
    <span style={below ? { color: "var(--danger)", fontWeight: 600 } : undefined}>
      Legal minimum in {PROVINCE_LABEL[provinceOf(city, meta)]}: {rupees(floor)}
      {wagePeriod === "DAILY" ? " per day" : " per month"}.{below ? " This amount will be rejected." : ""}
    </span>
  );
}
