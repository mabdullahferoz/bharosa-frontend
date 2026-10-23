import { useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../api";
import { t } from "../../i18n";
import type { Offer } from "../../types";
import OfferThread from "../../components/OfferThread";
import StatusMark from "../../components/reactbits/StatusMark";
import { categoryLabel, Empty, humanize, Loaded, PageHeader, Tabs, useLoad } from "../../ui";

export default function MyOffers() {
  const state = useLoad(() => api.get<Offer[]>("/offers"));
  const [tab, setTab] = useState<"open" | "closed">("open");
  const all = state.data ?? [];
  const open = all.filter((o) => o.status === "PENDING");
  const myTurn = open.filter((o) => o.lastBy === "HOUSEHOLD").length;

  return (
    <div>
      <PageHeader title={t("Offers")} subtitle={t("Jobs you responded to and invitations from families.")} />
      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { value: "open", label: t("Open"), count: myTurn },
          { value: "closed", label: t("Past") },
        ]}
      />
      <Loaded state={state}>
        {() => {
          const list = tab === "open" ? open : all.filter((o) => o.status !== "PENDING");
          return list.length === 0 ? (
            <Empty title={tab === "open" ? t("No open offers") : t("Nothing here yet")}>
              <Link to="/worker">{t("Browse jobs")}</Link> {t("and respond with your price.")}
            </Empty>
          ) : (
            <div className="stack">
              {list.map((o) => (
                <div key={o.id} className={`card stack-sm ${o.status === "PENDING" && o.lastBy === "HOUSEHOLD" ? "card-highlight" : ""}`}>
                  <div className="row-between">
                    <span className="card-title" dir="auto">{o.job?.title}</span>
                    {o.initiator === "HOUSEHOLD" && <span className="badge badge-endorsed">{t("Invitation")}</span>}
                  </div>
                  <div className="card-meta">
                    <span>{o.job?.household?.name}</span>
                    <span>{o.job && categoryLabel(o.job.category)}</span>
                    <span>
                      {o.job?.household?.area ? `${o.job.household.area}${t(", ")}` : ""}
                      {humanize(o.job?.household?.city)}
                    </span>
                  </div>
                  {(o.job?.workingHours || o.job?.weeklyRestDay) && (
                    <div className="card-meta">
                      {o.job.workingHours && <span dir="auto">{t("Hours: {h}", { h: o.job.workingHours })}</span>}
                      {o.job.weeklyRestDay && <span>{t("Day off: {d}", { d: humanize(o.job.weeklyRestDay) })}</span>}
                    </div>
                  )}
                  {o.job && o.job.status !== "OPEN" && o.status === "PENDING" && (
                    <span className="small muted">{t("This job is no longer open.")}</span>
                  )}
                  {o.status === "ACCEPTED" ? (
                    <div className="callout callout-ok">
                      <span className="row" style={{ gap: 10, flexWrap: "nowrap" }}>
                        <StatusMark status="done" size={28} doneColor="#087f5b" />
                        {t("You're hired! See the family's contact details in My work.")}
                      </span>
                      <Link to="/worker/work" className="btn btn-sm">
                        {t("My work")}
                      </Link>
                    </div>
                  ) : (
                    <OfferThread offer={o} side="WORKER" period={o.job?.wagePeriod} onChanged={state.reload} />
                  )}
                </div>
              ))}
            </div>
          );
        }}
      </Loaded>
    </div>
  );
}
