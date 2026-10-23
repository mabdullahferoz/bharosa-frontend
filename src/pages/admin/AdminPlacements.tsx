import { useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../api";
import { hasPerm, useAuth } from "../../auth";
import type { PerformResult } from "../../types";
import type { AdminUser } from "./adminTypes";
import { categoryLabel, Empty, Field, formatDate, humanize, Loaded, Money, PageHeader, performMessage, Pill, Select, useAction, useLoad, useToast } from "../../ui";
import { WageHint } from "./assist/shared";

interface AdminEngagement {
  id: string;
  title: string;
  category: string;
  wage: number;
  wagePeriod: string;
  source: string;
  status: string;
  startDate: string;
  workingHours: string | null;
  weeklyRestDay: string | null;
  household: { id: string; name: string };
  worker: { id: string; name: string };
  endorsement: { trustworthy: boolean } | null;
}

const DAY = 86_400_000;
const isoDay = (d: Date) => d.toISOString().slice(0, 10);

export default function AdminPlacements() {
  const { user, meta } = useAuth();
  const toast = useToast();
  const canPlace = hasPerm(user, "PLACEMENTS");
  const households = useLoad(() => api.get<AdminUser[]>("/admin/users?role=HOUSEHOLD"));
  const workers = useLoad(() => api.get<AdminUser[]>("/admin/users?role=WORKER&status=ACTIVE"));
  const engagements = useLoad(() => api.get<AdminEngagement[]>("/admin/engagements"));
  const { busy, run } = useAction();
  const today = isoDay(new Date());
  const blank = {
    householdId: "",
    workerId: "",
    title: "",
    category: "MAID",
    wage: "",
    wagePeriod: "MONTHLY",
    workingHours: "",
    weeklyRestDay: "SUNDAY",
    startDate: today,
    reason: "",
  };
  const [f, setF] = useState(blank);
  const household = households.data?.find((h) => h.id === f.householdId);
  const backdated = !!f.startDate && new Date(f.startDate).getTime() < Date.now() - 7 * DAY;

  return (
    <div className="stack">
      <PageHeader
        title="Placements"
        subtitle="Record a placement the team arranged directly between a worker and a family it knows, without a job post. Both sides are notified."
      />
      {!canPlace && <div className="callout callout-error">You need the PLACEMENTS permission to create placements.</div>}
      <div className="split">
        <form
          className="card form"
          onSubmit={async (e) => {
            e.preventDefault();
            const r = await run(() =>
              api.post<PerformResult>("/admin/placements", {
                householdId: f.householdId,
                workerId: f.workerId,
                title: f.title.trim(),
                category: f.category,
                wage: Number(f.wage),
                wagePeriod: f.wagePeriod,
                workingHours: f.workingHours.trim() || undefined,
                weeklyRestDay: f.weeklyRestDay || undefined,
                startDate: f.startDate ? new Date(f.startDate).toISOString() : undefined,
                reason: f.reason.trim(),
              }),
            );
            if (r) {
              toast(performMessage(r, "Placement created. Both sides have been notified."));
              setF({ ...blank, householdId: f.householdId });
              void engagements.reload();
            }
          }}
        >
          <h2>New placement</h2>
          <div className="grid-2">
            <Field label="Household">
              <select value={f.householdId} onChange={(e) => setF({ ...f, householdId: e.target.value })} required>
                <option value="">Choose</option>
                {households.data?.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.name} ({h.area ?? h.city}){h.householdProfile?.platformKnown ? " ★ known" : ""}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Worker" hint="Only active workers are listed.">
              <select value={f.workerId} onChange={(e) => setF({ ...f, workerId: e.target.value })} required>
                <option value="">Choose</option>
                {workers.data?.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name} ({w.workerProfile?.skills.map(categoryLabel).join(", ")}){w.workerProfile?.verificationStatus === "VERIFIED" ? " ✓ verified" : ""}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Role / title">
              <input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="e.g. Full-time cook" required minLength={3} maxLength={120} />
            </Field>
            <Field label="Type of work">
              <Select value={f.category} onChange={(category) => setF({ ...f, category })} options={meta?.categories ?? []} labelFn={categoryLabel} />
            </Field>
            <Field
              label="Agreed wage (Rs)"
              hint={household ? <WageHint meta={meta} city={household.city} schedule="FULL_TIME" wagePeriod={f.wagePeriod} amount={Number(f.wage)} /> : "Pay at least the legal minimum for full-time work."}
            >
              <input type="number" min={100} step={100} value={f.wage} onChange={(e) => setF({ ...f, wage: e.target.value })} required />
            </Field>
            <Field label="Pay period">
              <Select value={f.wagePeriod} onChange={(wagePeriod) => setF({ ...f, wagePeriod })} options={meta?.wagePeriods ?? ["MONTHLY"]} />
            </Field>
            <Field label="Working hours" hint="e.g. 8am - 4pm, 1-hour break">
              <input value={f.workingHours} onChange={(e) => setF({ ...f, workingHours: e.target.value })} maxLength={80} />
            </Field>
            <Field label="Weekly rest day" hint="Full-time workers are entitled to one day off a week.">
              <Select value={f.weeklyRestDay} onChange={(weeklyRestDay) => setF({ ...f, weeklyRestDay })} options={meta?.weekdays ?? []} placeholder="None (part-time)" />
            </Field>
            <Field label="Start date" hint="Needs approval by a second staff member if more than 7 days ago.">
              <input type="date" value={f.startDate} max={isoDay(new Date(Date.now() + 365 * DAY))} onChange={(e) => setF({ ...f, startDate: e.target.value })} />
            </Field>
            <Field label="Reason / how it was arranged">
              <input value={f.reason} onChange={(e) => setF({ ...f, reason: e.target.value })} minLength={3} maxLength={500} required placeholder="e.g. Office visit 21 Oct, both agreed" />
            </Field>
          </div>
          {backdated && (
            <div className="pending-approval">
              This start date is more than 7 days ago. A back-dated placement makes the family able to endorse the worker sooner, so another staff member
              must approve it before it is created.
            </div>
          )}
          <button className="btn" disabled={busy || !canPlace}>
            {busy ? "Saving…" : backdated ? "Send for approval" : "Create placement"}
          </button>
        </form>

        <div className="card stack-sm">
          <h2>Households known to the team</h2>
          <p className="small muted">Marked households show a "Known to our team" badge on their job posts.</p>
          <Loaded state={households}>
            {(list) =>
              list.length === 0 ? (
                <p className="small muted">No households yet.</p>
              ) : (
                list.map((h) => (
                  <label key={h.id} className="check row-between">
                    <span>
                      {h.name} <span className="muted small">{h.area ?? h.city}</span>
                    </span>
                    <input
                      type="checkbox"
                      checked={h.householdProfile?.platformKnown ?? false}
                      disabled={busy || !canPlace}
                      onChange={async (e) => {
                        const r = await run(() => api.post(`/admin/households/${h.id}/known`, { platformKnown: e.target.checked }));
                        if (r) void households.reload();
                      }}
                    />
                  </label>
                ))
              )
            }
          </Loaded>
        </div>
      </div>

      <h2>All placements & hires</h2>
      <Loaded state={engagements}>
        {(list) =>
          list.length === 0 ? (
            <Empty title="No placements or hires yet" />
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Household</th>
                    <th>Worker</th>
                    <th>Role</th>
                    <th>Wage</th>
                    <th>Hours / day off</th>
                    <th>Source</th>
                    <th>Since</th>
                    <th>Status</th>
                    <th>Endorsed</th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((e) => (
                    <tr key={e.id}>
                      <td>{e.household.name}</td>
                      <td>
                        <Link to={`/admin/workers/${e.worker.id}`}>{e.worker.name}</Link>
                      </td>
                      <td>{e.title}</td>
                      <td className="nowrap">
                        <Money amount={e.wage} period={e.wagePeriod} />
                      </td>
                      <td className="small">
                        {e.workingHours || <span className="muted">-</span>}
                        {e.weeklyRestDay && <div className="muted">{humanize(e.weeklyRestDay)} off</div>}
                      </td>
                      <td>{e.source === "PLATFORM_PLACEMENT" ? "Team placement" : "Marketplace"}</td>
                      <td className="nowrap">{formatDate(e.startDate)}</td>
                      <td>
                        <Pill value={e.status} />
                      </td>
                      <td>{e.endorsement ? (e.endorsement.trustworthy ? "Yes" : "Concerns") : <span className="muted">-</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        }
      </Loaded>
    </div>
  );
}
