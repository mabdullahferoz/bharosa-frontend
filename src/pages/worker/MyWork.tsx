import { useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../api";
import { useAuth } from "../../auth";
import { t } from "../../i18n";
import type { Engagement } from "../../types";
import GrievanceModal from "../../components/GrievanceModal";
import TermsModal, { TermsStatus } from "../../components/TermsModal";
import { categoryLabel, Empty, formatDate, humanize, Loaded, Money, PageHeader, Pill, Stars, useAction, useLoad } from "../../ui";

export default function MyWork() {
  const { meta } = useAuth();
  const state = useLoad(() => api.get<Engagement[]>("/engagements"));
  const { busy, run } = useAction();
  const [termsFor, setTermsFor] = useState<string | null>(null);
  const [reporting, setReporting] = useState<Engagement | null>(null);

  return (
    <div>
      <PageHeader title={t("My work")} subtitle={t("Families you work with. After one month, they are asked to endorse you.")} />
      <Loaded state={state}>
        {(list) =>
          list.length === 0 ? (
            <Empty title={t("No work yet")}>{t("When a family accepts your price, it will show here with their contact details.")}</Empty>
          ) : (
            <div className="stack">
              {list.map((e) => (
                <div key={e.id} className={`card stack-sm ${e.status === "ACTIVE" && !e.myTermsAccepted ? "card-highlight" : ""}`}>
                  <div className="row-between">
                    <div>
                      <div className="card-title" dir="auto">{e.household.name}</div>
                      <div className="card-meta">
                        <span dir="auto">{e.title}</span>
                        <span>{categoryLabel(e.category)}</span>
                        <span>
                          {e.household.area ? `${e.household.area}${t(", ")}` : ""}
                          {humanize(e.household.city)}
                        </span>
                        <span>{t("Since {date}", { date: formatDate(e.startDate) })}</span>
                      </div>
                    </div>
                    <div className="row">
                      <Money amount={e.wage} period={e.wagePeriod} />
                      <Pill value={e.status} />
                    </div>
                  </div>
                  {(e.workingHours || e.weeklyRestDay) && (
                    <div className="card-meta">
                      {e.workingHours && <span dir="auto">{t("Hours: {h}", { h: e.workingHours })}</span>}
                      {e.weeklyRestDay && <span>{t("Day off: {d}", { d: humanize(e.weeklyRestDay) })}</span>}
                    </div>
                  )}
                  <div className="row">
                    <a className="btn btn-ghost btn-sm" href={`tel:${e.household.phone}`}>
                      {t("Call")} <span className="ltr">{e.household.phone}</span>
                    </a>
                  </div>

                  {e.status === "ACTIVE" && !e.myTermsAccepted ? (
                    <div className="callout callout-accent">
                      <span>{t("Read the terms of this work: wage, hours and day off. Then confirm.")}</span>
                      <button className="btn btn-sm" onClick={() => setTermsFor(e.id)}>
                        {t("See terms")}
                      </button>
                    </div>
                  ) : (
                    <div className="row-between">
                      <TermsStatus side="WORKER" mine={e.myTermsAccepted} theirs={!!e.termsAcceptedByHouseholdAt} />
                      <button className="btn btn-ghost btn-sm" onClick={() => setTermsFor(e.id)}>
                        {t("See terms")}
                      </button>
                    </div>
                  )}

                  {e.endorsement?.trustworthy ? (
                    <div className="callout callout-ok small">
                      <span>
                        {t("This family endorsed you")} <Stars value={e.endorsement.rating} />
                        {e.endorsement.comment && (
                          <>
                            {" "}
                            · <span dir="auto">"{e.endorsement.comment}"</span>
                          </>
                        )}
                      </span>
                    </div>
                  ) : (
                    e.status === "ACTIVE" &&
                    !e.endorsement && (
                      <span className="muted small">
                        {e.daysUntilEndorsement > 0
                          ? t("In {n} days the family will be asked to endorse you.", { n: e.daysUntilEndorsement })
                          : t("The family has been asked to endorse you.")}
                      </span>
                    )
                  )}

                  {e.grievances.length > 0 && (
                    <div className="stack-sm">
                      {e.grievances.map((g) => (
                        <div key={g.id} className="row small">
                          <span>{t("Your report: {what}", { what: humanize(g.category) })}</span>
                          <Pill value={g.status} />
                          <span className="muted">{formatDate(g.createdAt)}</span>
                        </div>
                      ))}
                      <Link to="/worker/complaints" className="small">
                        {t("See all my reports")}
                      </Link>
                    </div>
                  )}

                  <div className="row">
                    <button className="btn btn-danger-ghost btn-sm" onClick={() => setReporting(e)}>
                      {t("Report a problem with this family")}
                    </button>
                    {e.status === "ACTIVE" && (
                      <button
                        className="btn btn-ghost btn-sm"
                        disabled={busy}
                        onClick={async () => {
                          const reason = prompt(t("Leaving this job. Reason (optional):"));
                          if (reason === null) return;
                          await run(() => api.post(`/engagements/${e.id}/end`, { reason: reason || undefined }), t("Marked as ended"));
                          void state.reload();
                        }}
                      >
                        {t("I have left this job")}
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {meta?.supportPhone && (
                <p className="small muted">
                  {t("Problem with pay, hours or how you are treated? Call the Bharosa helpline:")}{" "}
                  <a className="ltr" href={`tel:${meta.supportPhone}`}>
                    {meta.supportPhone}
                  </a>
                </p>
              )}
            </div>
          )
        }
      </Loaded>
      {termsFor && <TermsModal engagementId={termsFor} side="WORKER" onClose={() => setTermsFor(null)} onAccepted={state.reload} />}
      {reporting && (
        <GrievanceModal engagementId={reporting.id} familyName={reporting.household.name} onClose={() => setReporting(null)} onFiled={state.reload} />
      )}
    </div>
  );
}
