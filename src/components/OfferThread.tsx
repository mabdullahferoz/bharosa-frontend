import { useState } from "react";
import { api } from "../api";
import { useAuth } from "../auth";
import { t } from "../i18n";
import type { Offer } from "../types";
import { Field, Modal, Money, Pill, rupees, timeAgo, useAction } from "../ui";

/**
 * inDrive-style negotiation: shows the price history and lets the side that did NOT
 * name the latest price accept it, counter it, or decline.
 */
export default function OfferThread({
  offer,
  side,
  period,
  onChanged,
}: {
  offer: Offer;
  side: "WORKER" | "HOUSEHOLD";
  period?: string;
  onChanged: () => void;
}) {
  const { meta } = useAuth();
  const { busy, run } = useAction();
  const [countering, setCountering] = useState(false);
  const [amount, setAmount] = useState(String(offer.amount));
  const [message, setMessage] = useState("");
  const myTurn = offer.status === "PENDING" && offer.lastBy !== side;
  const maxRounds = meta?.maxOfferRounds ?? Infinity;
  const noMoreCounters = (offer.rounds ?? 0) >= maxRounds;
  const otherName = side === "WORKER" ? t("Family") : offer.worker?.name.split(" ")[0] ?? t("Worker");

  const act = async (path: string, body?: unknown, ok?: string) => {
    const r = await run(() => api.post(`/offers/${offer.id}/${path}`, body), ok);
    if (r !== undefined) {
      setCountering(false);
      onChanged();
    }
  };

  return (
    <div className="stack-sm">
      <div className="thread">
        {offer.history.map((h, i) => (
          <div key={i} className={`bubble ${h.by === side ? "bubble-me" : "bubble-them"}`}>
            <span className="muted small">
              {h.by === side ? t("You") : otherName} · {timeAgo(h.at)}
            </span>
            <Money amount={h.amount} period={period} />
            {h.message && <span dir="auto">{h.message}</span>}
            {h.viaStaff && <span className="small muted">{t("Entered by staff {staff}", { staff: h.viaStaff })}</span>}
          </div>
        ))}
      </div>
      {offer.status !== "PENDING" ? (
        <div>
          <Pill value={offer.status} />
        </div>
      ) : myTurn ? (
        <div className="row">
          <button
            className="btn btn-sm"
            disabled={busy}
            onClick={() =>
              act("accept", undefined, side === "HOUSEHOLD" ? t("Hired! Contact details are in My hires.") : t("Accepted. You're hired!"))
            }
          >
            {t("Accept {amount}", { amount: rupees(offer.amount) })}
          </button>
          {!noMoreCounters && (
            <button className="btn btn-ghost btn-sm" disabled={busy} onClick={() => setCountering(true)}>
              {t("Offer another price")}
            </button>
          )}
          <button className="btn btn-danger-ghost btn-sm" disabled={busy} onClick={() => act("decline", undefined, t("Declined"))}>
            {t("Decline")}
          </button>
        </div>
      ) : (
        <div className="row">
          <span className="muted small">
            {side === "WORKER" ? t("Waiting for the family to respond…") : t("Waiting for {name} to respond…", { name: otherName })}
          </span>
          <button
            className="btn btn-danger-ghost btn-sm"
            disabled={busy}
            onClick={() => act("decline", undefined, side === "WORKER" ? t("Withdrawn") : t("Declined"))}
          >
            {side === "WORKER" ? t("Withdraw") : t("Decline")}
          </button>
        </div>
      )}
      {offer.status === "PENDING" && noMoreCounters && (
        <span className="small muted">{t("No more price changes: accept or decline.")}</span>
      )}
      {countering && !noMoreCounters && (
        <Modal title={t("Offer another price")} onClose={() => setCountering(false)}>
          <form
            className="form"
            onSubmit={(e) => {
              e.preventDefault();
              void act("counter", { amount: Number(amount), message: message || undefined }, t("Price sent"));
            }}
          >
            <Field label={t("Your price (Rs)")} hint={t("Their latest price: {amount}", { amount: rupees(offer.amount) })}>
              <input type="number" min={100} step={100} value={amount} onChange={(e) => setAmount(e.target.value)} required />
            </Field>
            <Field label={t("Message (optional)")}>
              <input value={message} onChange={(e) => setMessage(e.target.value)} placeholder={t("e.g. I can also help with cooking")} maxLength={500} />
            </Field>
            {Number.isFinite(maxRounds) && (
              <p className="small muted">{t("Price changes left: {n}", { n: Math.max(0, maxRounds - (offer.rounds ?? 0)) })}</p>
            )}
            <button className="btn btn-block" disabled={busy}>
              {t("Send price")}
            </button>
          </form>
        </Modal>
      )}
    </div>
  );
}
