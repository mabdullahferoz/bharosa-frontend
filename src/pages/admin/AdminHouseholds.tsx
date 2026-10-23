// Households: find a family, reveal their number when needed, mark them known to the team,
// and post a job for families who can't use the app (assisted mode).
import { useState } from "react";
import { Link } from "react-router-dom";
import { api, qs } from "../../api";
import { hasPerm, useAuth } from "../../auth";
import type { AdminUser } from "./adminTypes";
import { Avatar, categoryLabel, Empty, Field, formatDate, Loaded, Modal, PageHeader, Pill, rupees, Select, useAction, useLoad, useToast } from "../../ui";
import { ConsentModal, WageHint, wageFloor } from "./assist/shared";

export default function AdminHouseholds() {
  const { user } = useAuth();
  const [input, setInput] = useState("");
  const [q, setQ] = useState("");
  const state = useLoad(() => api.get<AdminUser[]>(`/admin/users${qs({ role: "HOUSEHOLD", q })}`), [q]);
  const [posting, setPosting] = useState<AdminUser | null>(null);
  const [revealing, setRevealing] = useState<AdminUser | null>(null);
  const [revealed, setRevealed] = useState<Record<string, string>>({});
  const { busy, run } = useAction();
  const canPlace = hasPerm(user, "PLACEMENTS");
  const canAssist = hasPerm(user, "HOUSEHOLDS_ASSIST");

  return (
    <div className="stack">
      <PageHeader
        title="Households"
        subtitle="Families on Kaam Connect. Phone numbers are hidden; revealing one is logged and shown to the family."
        action={
          canAssist && (
            <Link className="btn btn-sm" to="/admin/signup?role=HOUSEHOLD">
              Sign up a household
            </Link>
          )
        }
      />
      <form
        className="filters"
        onSubmit={(e) => {
          e.preventDefault();
          setQ(input.trim());
        }}
      >
        <input type="search" value={input} onChange={(e) => setInput(e.target.value)} placeholder="Search name or phone" aria-label="Search households" />
        <button className="btn btn-ghost btn-sm">Search</button>
        {q && (
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => {
              setInput("");
              setQ("");
            }}
          >
            Clear
          </button>
        )}
      </form>

      <Loaded state={state}>
        {(list) =>
          list.length === 0 ? (
            <Empty title={q ? "No households match" : "No households yet"} />
          ) : (
            <div className="stack-sm">
              {list.map((h) => (
                <div key={h.id} className="card row-between">
                  <div className="row" style={{ minWidth: 0 }}>
                    <Avatar name={h.name} size={40} />
                    <div className="stack-sm" style={{ gap: 2 }}>
                      <div className="row" style={{ gap: 6 }}>
                        <strong>{h.name}</strong>
                        {h.householdProfile?.platformKnown && <span className="badge badge-endorsed">Known to our team</span>}
                        {h.status !== "ACTIVE" && <Pill value={h.status} />}
                      </div>
                      <div className="card-meta">
                        <span>{h.area ? `${h.area}, ${h.city}` : h.city}</span>
                        <span>
                          {revealed[h.id] ? (
                            <a href={`tel:${revealed[h.id]}`} className="mono">
                              {revealed[h.id]}
                            </a>
                          ) : (
                            <>
                              <span className="masked">{h.phone}</span>{" "}
                              <button className="btn btn-ghost btn-sm" style={{ padding: "0 8px" }} onClick={() => setRevealing(h)}>
                                Reveal
                              </button>
                            </>
                          )}
                        </span>
                        <span>Joined {formatDate(h.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="row">
                    {canPlace && (
                      <label className="check small">
                        <input
                          type="checkbox"
                          checked={h.householdProfile?.platformKnown ?? false}
                          disabled={busy}
                          onChange={async (e) => {
                            const r = await run(
                              () => api.post(`/admin/households/${h.id}/known`, { platformKnown: e.target.checked }),
                              e.target.checked ? "Marked as known to the team" : "No longer marked as known",
                            );
                            if (r) void state.reload();
                          }}
                        />
                        Known to team
                      </label>
                    )}
                    {canAssist && h.status === "ACTIVE" && (
                      <button className="btn btn-sm" onClick={() => setPosting(h)}>
                        Post a job for them
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )
        }
      </Loaded>

      {posting && <PostJobModal household={posting} onClose={() => setPosting(null)} />}
      {revealing && (
        <RevealModal
          user={revealing}
          onClose={() => setRevealing(null)}
          onRevealed={(v) => setRevealed((r) => ({ ...r, [revealing.id]: v }))}
        />
      )}
    </div>
  );
}

function RevealModal({ user, onClose, onRevealed }: { user: AdminUser; onClose: () => void; onRevealed: (v: string) => void }) {
  const { busy, run } = useAction();
  const [reason, setReason] = useState("");
  return (
    <Modal title={`Reveal ${user.name}'s phone number`} onClose={onClose}>
      <form
        className="form"
        onSubmit={async (e) => {
          e.preventDefault();
          const r = await run(() => api.post<{ value: string | null }>(`/admin/users/${user.id}/reveal`, { field: "phone", reason: reason.trim() }));
          if (r) {
            onRevealed(r.value ?? "Not on file");
            onClose();
          }
        }}
      >
        <p className="small muted">This is logged with your name and reason, and the family can see it on their activity page.</p>
        <Field label="Why do you need it?">
          <input value={reason} onChange={(e) => setReason(e.target.value)} minLength={5} maxLength={300} required placeholder="e.g. Calling to confirm job details they asked us to post" />
        </Field>
        <button className="btn btn-block" disabled={busy || reason.trim().length < 5}>
          Reveal number
        </button>
      </form>
    </Modal>
  );
}

function PostJobModal({ household, onClose }: { household: AdminUser; onClose: () => void }) {
  const { meta } = useAuth();
  const toast = useToast();
  const { busy, run } = useAction();
  const [f, setF] = useState({
    title: "",
    category: meta?.categories[0] ?? "MAID",
    description: "",
    city: household.city,
    area: household.area ?? "",
    offeredWage: "",
    wagePeriod: "MONTHLY",
    schedule: "FULL_TIME",
    workingHours: "",
    weeklyRestDay: "SUNDAY",
    requireVerified: false,
  });
  const fullTime = f.schedule === "FULL_TIME" || f.schedule === "LIVE_IN";
  const wage = Number(f.offeredWage);
  const floor = wageFloor(meta, f.city, f.schedule, f.wagePeriod);
  const belowMin = floor !== null && wage > 0 && wage < floor;
  const per = f.wagePeriod === "MONTHLY" ? " a month" : f.wagePeriod === "DAILY" ? " a day" : "";

  return (
    <ConsentModal
      title={`Post a job for ${household.name}`}
      name={household.name}
      busy={busy}
      confirmLabel="Post job"
      readOut={
        <>
          I will post "{f.title || "…"}" ({categoryLabel(f.category).toLowerCase()}) in {f.area || f.city} for <strong>{wage ? rupees(wage) : "…"}</strong>
          {per}
          {f.workingHours && <>, hours {f.workingHours}</>}
          {fullTime && f.weeklyRestDay && <>, with {categoryLabel(f.weeklyRestDay)} off every week</>}. Workers will see this and may offer other prices. Do you
          agree?
        </>
      }
      onSubmit={async (consent) => {
        if (belowMin) {
          toast("The wage is below the legal minimum. Agree a fair wage with the family first.", "error");
          return false;
        }
        const r = await run(() =>
          api.post(`/assist/households/${household.id}/jobs`, {
            title: f.title.trim(),
            category: f.category,
            description: f.description.trim() || undefined,
            city: f.city,
            area: f.area.trim() || undefined,
            offeredWage: wage,
            wagePeriod: f.wagePeriod,
            schedule: f.schedule,
            workingHours: f.workingHours.trim() || undefined,
            weeklyRestDay: f.weeklyRestDay || undefined,
            requireVerified: f.requireVerified,
            consent,
          }),
        );
        if (!r) return false;
        toast(`Job posted for ${household.name}. They have been notified.`);
        return true;
      }}
      onClose={onClose}
    >
      <div className="grid-2">
        <Field label="Job title">
          <input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} minLength={3} maxLength={120} required placeholder="e.g. Full-time maid" />
        </Field>
        <Field label="Type of work">
          <Select value={f.category} onChange={(category) => setF({ ...f, category })} options={meta?.categories ?? []} labelFn={categoryLabel} />
        </Field>
        <Field label="Schedule">
          <Select value={f.schedule} onChange={(schedule) => setF({ ...f, schedule })} options={meta?.schedules ?? ["FULL_TIME"]} />
        </Field>
        <Field label="Pay period">
          <Select value={f.wagePeriod} onChange={(wagePeriod) => setF({ ...f, wagePeriod })} options={meta?.wagePeriods ?? ["MONTHLY"]} />
        </Field>
        <Field label="Wage (Rs)" hint={<WageHint meta={meta} city={f.city} schedule={f.schedule} wagePeriod={f.wagePeriod} amount={wage} />}>
          <input type="number" min={floor ?? 100} step={100} value={f.offeredWage} onChange={(e) => setF({ ...f, offeredWage: e.target.value })} required />
        </Field>
        <Field label="Working hours" hint="e.g. 9am - 5pm, 1-hour break">
          <input value={f.workingHours} onChange={(e) => setF({ ...f, workingHours: e.target.value })} maxLength={80} required={fullTime} />
        </Field>
        <Field label="Weekly rest day" hint={fullTime ? "Required: full-time workers get one day off a week." : "Optional for part-time work."}>
          <Select
            value={f.weeklyRestDay}
            onChange={(weeklyRestDay) => setF({ ...f, weeklyRestDay })}
            options={meta?.weekdays ?? []}
            placeholder={fullTime ? undefined : "None"}
          />
        </Field>
        <Field label="City">
          <Select value={f.city} onChange={(city) => setF({ ...f, city })} options={meta?.cities ?? [f.city]} labelFn={(c) => c} />
        </Field>
        <Field label="Area">
          <input value={f.area} onChange={(e) => setF({ ...f, area: e.target.value })} maxLength={80} />
        </Field>
      </div>
      <Field label="Details (optional)">
        <textarea value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} maxLength={2000} rows={3} placeholder="Duties, house size, meals or room provided" />
      </Field>
      <label className="check">
        <input type="checkbox" checked={f.requireVerified} onChange={(e) => setF({ ...f, requireVerified: e.target.checked })} />
        Only police-verified workers can respond
      </label>
    </ConsentModal>
  );
}
