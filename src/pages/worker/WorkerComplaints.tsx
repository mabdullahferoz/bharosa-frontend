import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../auth";
import { api } from "../../api";
import { t } from "../../i18n";
import type { Complaint, Grievance } from "../../types";
import { Empty, formatDate, humanize, Loaded, PageHeader, Pill, useAction, useLoad } from "../../ui";

function Respond({ c, onDone }: { c: Complaint; onDone: () => void }) {
  const [text, setText] = useState(c.workerResponse ?? "");
  const { busy, run } = useAction();
  return (
    <form
      className="stack-sm"
      onSubmit={async (e) => {
        e.preventDefault();
        if (await run(() => api.post(`/complaints/${c.id}/respond`, { response: text }), t("Your side has been sent to our team"))) onDone();
      }}
    >
      <textarea dir="auto" value={text} onChange={(e) => setText(e.target.value)} placeholder={t("Explain what happened from your side")} minLength={5} required />
      <div>
        <button className="btn btn-sm" disabled={busy}>
          {c.workerResponse ? t("Update my response") : t("Send my side")}
        </button>
      </div>
    </form>
  );
}

function MyGrievances() {
  const { meta } = useAuth();
  const state = useLoad(() => api.get<Grievance[]>("/grievances"));
  return (
    <section className="stack-sm" style={{ marginTop: 32 }}>
      <h2>{t("My complaints about families")}</h2>
      <p className="muted small">
        {t("Problems you reported about a family: pay, hours, bad treatment. Our team reviews each one.")}
      </p>
      <Loaded state={state}>
        {(list) =>
          list.length === 0 ? (
            <Empty title={t("You have not reported any family")}>
              <p>{t("To report a problem, open My work and press \"Report a problem with this family\".")}</p>
              <Link to="/worker/work" className="btn btn-ghost btn-sm">
                {t("My work")}
              </Link>
            </Empty>
          ) : (
            <div className="stack">
              {list.map((g) => (
                <div key={g.id} className="card stack-sm">
                  <div className="row-between">
                    <strong>
                      <span dir="auto">{g.household?.name}</span> · {humanize(g.category)}
                    </strong>
                    <Pill value={g.status} />
                  </div>
                  <p dir="auto">{g.description}</p>
                  <span className="muted small">
                    {t("Sent on {date}", { date: formatDate(g.createdAt) })}
                    {g.filedByStaffId ? ` · ${t("Written down by our staff for you")}` : ""}
                  </span>
                  {g.status === "OPEN" && <span className="small muted">{t("Waiting for our team to look at it.")}</span>}
                  {g.status === "UNDER_REVIEW" && <span className="small muted">{t("Our team is looking into it.")}</span>}
                  {g.resolution && (
                    <div className={`callout ${g.status === "RESOLVED" ? "callout-ok" : "callout-info"} small`}>
                      <span>
                        <strong>{t("What our team did:")}</strong> <span dir="auto">{g.resolution}</span>
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )
        }
      </Loaded>
      {meta?.supportPhone && (
        <p className="small muted">
          {t("Kaam Connect helpline:")}{" "}
          <a className="ltr" href={`tel:${meta.supportPhone}`}>
            {meta.supportPhone}
          </a>
        </p>
      )}
    </section>
  );
}

export default function WorkerComplaints() {
  const state = useLoad(() => api.get<Complaint[]>("/complaints"));
  return (
    <div style={{ maxWidth: 760 }}>
      <PageHeader title={t("Complaints about my work")} subtitle={t("Our team hears both sides before deciding. You can always give your side.")} />
      <Loaded state={state}>
        {(list) =>
          list.length === 0 ? (
            <Empty title={t("No complaints")}>{t("Keep it up! A clean record helps you get better offers.")}</Empty>
          ) : (
            <div className="stack">
              {list.map((c) => (
                <div key={c.id} className="card stack-sm">
                  <div className="row-between">
                    <strong>
                      {humanize(c.category)} · {c.engagement?.title}
                    </strong>
                    <Pill value={c.status} />
                  </div>
                  <p dir="auto">{c.description}</p>
                  <span className="muted small">{t("From {name} · {date}", { name: c.filedBy?.name ?? "", date: formatDate(c.createdAt) })}</span>
                  {c.status === "OPEN" || c.status === "UNDER_REVIEW" ? (
                    <Respond c={c} onDone={state.reload} />
                  ) : (
                    c.workerResponse && (
                      <p className="small muted">
                        {t("Your response:")} <span dir="auto">{c.workerResponse}</span>
                      </p>
                    )
                  )}
                  {c.resolution && (
                    <div className="callout callout-info small">
                      <span>
                        <strong>{t("Decision:")}</strong> <span dir="auto">{c.resolution}</span>
                      </span>
                    </div>
                  )}
                  {c.penalties?.map((p) => (
                    <div key={p.id} className="row small">
                      <Pill value={p.type} />
                      {p.revokedAt ? (
                        <span className="muted">{t("Lifted")}</span>
                      ) : p.endsAt ? (
                        <span className="muted">{t("Until {date}", { date: formatDate(p.endsAt) })}</span>
                      ) : (
                        <span className="muted">{t("No end date")}</span>
                      )}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )
        }
      </Loaded>
      <MyGrievances />
    </div>
  );
}
