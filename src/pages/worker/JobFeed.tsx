import { useState } from "react";
import { Link } from "react-router-dom";
import { api, qs } from "../../api";
import { useAuth } from "../../auth";
import { t } from "../../i18n";
import type { Job } from "../../types";
import { categoryLabel, Empty, Field, humanize, Loaded, Modal, Money, PageHeader, Pill, rupees, Select, timeAgo, useAction, useLoad } from "../../ui";

function RespondModal({ job, onClose, onDone }: { job: Job; onClose: () => void; onDone: () => void }) {
  const { busy, run } = useAction();
  const [mode, setMode] = useState<"accept" | "counter">("accept");
  const [amount, setAmount] = useState(String(job.offeredWage));
  const [message, setMessage] = useState("");
  return (
    <Modal title={job.title} onClose={onClose}>
      <form
        className="form"
        onSubmit={async (e) => {
          e.preventDefault();
          const r = await run(
            () => api.post(`/jobs/${job.id}/offers`, { amount: mode === "accept" ? job.offeredWage : Number(amount), message: message || undefined }),
            t("Sent! The family will reply soon."),
          );
          if (r) {
            onDone();
            onClose();
          }
        }}
      >
        <div className="role-pick">
          <button type="button" aria-pressed={mode === "accept"} onClick={() => setMode("accept")}>
            <strong>{t("Accept {amount}", { amount: rupees(job.offeredWage) })}</strong>
            <span className="muted small">{t("The family's offered wage")}</span>
          </button>
          <button type="button" aria-pressed={mode === "counter"} onClick={() => setMode("counter")}>
            <strong>{t("Ask for my price")}</strong>
            <span className="muted small">{t("Suggest a different wage")}</span>
          </button>
        </div>
        {mode === "counter" && (
          <Field label={t("Your price (Rs)")}>
            <input type="number" min={100} step={100} value={amount} onChange={(e) => setAmount(e.target.value)} required autoFocus />
          </Field>
        )}
        <Field label={t("Message to the family (optional)")}>
          <input value={message} onChange={(e) => setMessage(e.target.value)} placeholder={t("e.g. I can start on Monday")} maxLength={500} />
        </Field>
        <button className="btn btn-block" disabled={busy}>
          {t("Send")}
        </button>
      </form>
    </Modal>
  );
}

export default function JobFeed() {
  const { user, meta } = useAuth();
  const [category, setCategory] = useState("");
  const [city, setCity] = useState(user?.city ?? "");
  const state = useLoad(() => api.get<Job[]>(`/jobs${qs({ category, city })}`), [category, city]);
  const [responding, setResponding] = useState<Job | null>(null);
  const verified = user?.trust?.policeVerified;
  const mySkills = user?.workerProfile?.skills ?? [];

  return (
    <div>
      <PageHeader title={t("Jobs near you")} subtitle={t("Accept the family's wage, or ask for your own price.")} />
      {!verified && (
        <div className="callout callout-accent" style={{ marginBottom: 16 }}>
          <span>{t("Families trust verified workers more. Get police verified for free and earn the Verified badge.")}</span>
          <Link to="/worker/profile" className="btn btn-sm">
            {t("Get verified")}
          </Link>
        </div>
      )}
      <div className="filters">
        <Select value={category} onChange={setCategory} options={meta?.categories ?? []} placeholder={t("All work")} labelFn={categoryLabel} />
        <Select value={city} onChange={setCity} options={meta?.cities ?? []} placeholder={t("All cities")} labelFn={humanize} />
      </div>
      <Loaded state={state}>
        {(list) =>
          list.length === 0 ? (
            <Empty title={t("No open jobs here right now")}>{t("Try another city or type of work. New jobs are posted every day.")}</Empty>
          ) : (
            <div className="grid">
              {[...list]
                .sort((a, b) => Number(mySkills.includes(b.category)) - Number(mySkills.includes(a.category)))
                .map((j) => (
                  <div key={j.id} className="card stack-sm">
                    <div className="row-between">
                      <span className="card-title" dir="auto">{j.title}</span>
                      <Money amount={j.offeredWage} period={j.wagePeriod} />
                    </div>
                    <div className="card-meta">
                      <span>{categoryLabel(j.category)}</span>
                      <span>{humanize(j.schedule)}</span>
                      <span>
                        {j.area ? `${j.area}${t(", ")}` : ""}
                        {humanize(j.city)}
                      </span>
                      <span>{timeAgo(j.createdAt)}</span>
                    </div>
                    {(j.workingHours || j.weeklyRestDay) && (
                      <div className="card-meta">
                        {j.workingHours && <span dir="auto">{t("Hours: {h}", { h: j.workingHours })}</span>}
                        {j.weeklyRestDay && <span>{t("Day off: {d}", { d: humanize(j.weeklyRestDay) })}</span>}
                      </div>
                    )}
                    <div className="row small">
                      <span className="muted">{j.household?.name}</span>
                      {j.household?.householdProfile?.platformKnown && <span className="badge badge-endorsed">{t("Known to our team")}</span>}
                      {j.requireVerified && <span className="badge badge-verified">{t("Verified workers only")}</span>}
                    </div>
                    {j.description && <p className="small muted" dir="auto">{j.description}</p>}
                    {j.myOffer ? (
                      <div className="row-between">
                        <span className="small">
                          {t("You responded:")} <strong>{rupees(j.myOffer.amount)}</strong>
                        </span>
                        <Link to="/worker/offers" className="row">
                          <Pill value={j.myOffer.status} />
                        </Link>
                      </div>
                    ) : j.requireVerified && !verified ? (
                      <span className="muted small">{t("Only police-verified workers can respond.")}</span>
                    ) : (
                      <button className="btn btn-block" disabled={user?.status !== "ACTIVE"} onClick={() => setResponding(j)}>
                        {t("Respond")}
                      </button>
                    )}
                  </div>
                ))}
            </div>
          )
        }
      </Loaded>
      {responding && <RespondModal job={responding} onClose={() => setResponding(null)} onDone={state.reload} />}
    </div>
  );
}
