import { api } from "../api";
import { useAuth } from "../auth";
import { msg, t } from "../i18n";
import type { Terms } from "../types";
import { categoryLabel, formatDate, humanize, Loaded, Modal, Money, useAction, useLoad } from "../ui";

// The rules come from the API (api/src/routes/engagements.ts TERMS_RULES) in English.
// Listed here with msg() so the i18n check makes sure each one has an Urdu translation.
export const TERMS_RULES = [
  msg("Wages are paid at least monthly, within 5 days after the month ends."),
  msg("One paid day of rest every week."),
  msg("No work by anyone under 15. Workers on Kaam Connect must be 18 or older."),
  msg("No forced work, no keeping the worker's documents without consent, no abuse or harassment."),
  msg("Either side may end the arrangement; final dues are paid within 2 working days."),
  msg("Problems can be reported in the app or by calling the Kaam Connect helpline."),
];

/** Written terms of a hire (wage, hours, rest day, rules). Each side confirms once. */
export default function TermsModal({
  engagementId,
  side,
  onClose,
  onAccepted,
}: {
  engagementId: string;
  side: "WORKER" | "HOUSEHOLD";
  onClose: () => void;
  onAccepted?: () => void;
}) {
  const { meta } = useAuth();
  const state = useLoad(() => api.get<Terms>(`/engagements/${engagementId}/terms`), [engagementId]);
  const { busy, run } = useAction();

  return (
    <Modal title={t("Terms of work")} onClose={onClose}>
      <Loaded state={state}>
        {(terms) => {
          const mine = side === "WORKER" ? terms.termsAcceptedByWorkerAt : terms.termsAcceptedByHouseholdAt;
          const theirs = side === "WORKER" ? terms.termsAcceptedByHouseholdAt : terms.termsAcceptedByWorkerAt;
          return (
            <div className="stack">
              <dl className="kv">
                <dt>{t("Family")}</dt>
                <dd dir="auto">
                  {terms.household.name}
                  {terms.household.area ? ` · ${terms.household.area}` : ""}
                </dd>
                <dt>{t("Worker")}</dt>
                <dd dir="auto">{terms.worker.name}</dd>
                <dt>{t("Work")}</dt>
                <dd>
                  <span dir="auto">{terms.title}</span> · {categoryLabel(terms.category)}
                </dd>
                <dt>{t("Wage")}</dt>
                <dd>
                  <Money amount={terms.wage} period={terms.wagePeriod} />
                </dd>
                <dt>{t("Working hours")}</dt>
                <dd dir="auto">{terms.workingHours || t("Not written")}</dd>
                <dt>{t("Weekly day off")}</dt>
                <dd>{terms.weeklyRestDay ? humanize(terms.weeklyRestDay) : t("Not written")}</dd>
                <dt>{t("Start date")}</dt>
                <dd>{formatDate(terms.startDate)}</dd>
              </dl>
              <div className="stack-sm">
                <strong>{t("Rules both sides follow")}</strong>
                <ul className="small" style={{ margin: 0, paddingInlineStart: 20 }}>
                  {terms.rules.map((r) => (
                    <li key={r}>{t(r)}</li>
                  ))}
                </ul>
              </div>
              <div className="row small">
                <span className={mine ? "pill pill-ok" : "pill pill-neutral"}>
                  {mine ? t("You confirmed") : t("You have not confirmed")}
                </span>
                <span className={theirs ? "pill pill-ok" : "pill pill-neutral"}>
                  {side === "WORKER"
                    ? theirs
                      ? t("Family confirmed")
                      : t("Family has not confirmed")
                    : theirs
                      ? t("Worker confirmed")
                      : t("Worker has not confirmed")}
                </span>
              </div>
              {meta?.supportPhone && (
                <p className="small muted">
                  {t("Questions or a problem? Call the Kaam Connect helpline:")} <span className="ltr">{meta.supportPhone}</span>
                </p>
              )}
              {!mine && (
                <button
                  className="btn btn-block"
                  disabled={busy}
                  onClick={async () => {
                    const r = await run(() => api.post(`/engagements/${engagementId}/accept-terms`), t("Thank you. You confirmed the terms."));
                    if (r) {
                      onAccepted?.();
                      onClose();
                    }
                  }}
                >
                  {t("I agree to these terms")}
                </button>
              )}
            </div>
          );
        }}
      </Loaded>
    </Modal>
  );
}

/** Small status line for a hire's terms. */
export function TermsStatus({ mine, theirs, side }: { mine: boolean; theirs: boolean; side: "WORKER" | "HOUSEHOLD" }) {
  const other = side === "WORKER" ? (theirs ? t("Family confirmed") : t("Family has not confirmed")) : theirs ? t("Worker confirmed") : t("Worker has not confirmed");
  return (
    <span className="small muted">
      {mine ? "✓ " + t("You confirmed") : t("You have not confirmed")} · {other}
    </span>
  );
}
