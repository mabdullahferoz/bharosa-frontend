import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../../api";
import { useAuth } from "../../auth";
import type { Job } from "../../types";
import { categoryLabel, Field, humanize, PageHeader, rupees, Select, useAction } from "../../ui";

// Daily floor = monthly minimum / 26 working days (same rule as api/src/lib/wages.ts).
const WORKING_DAYS_PER_MONTH = 26;

export default function PostJob() {
  const { user, meta } = useAuth();
  const navigate = useNavigate();
  const { busy, run } = useAction();
  const [form, setForm] = useState({
    title: "",
    category: "MAID",
    description: "",
    city: user?.city ?? "Lahore",
    area: user?.area ?? "",
    offeredWage: "40000",
    wagePeriod: "MONTHLY",
    schedule: "FULL_TIME",
    requireVerified: false,
    workingHours: "",
    weeklyRestDay: "",
  });
  const set = <K extends keyof typeof form>(k: K) => (v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }));
  const fullTime = form.schedule === "FULL_TIME" || form.schedule === "LIVE_IN";
  const monthlyMin = meta?.monthlyMinimumWage?.[meta?.provinceOfCity?.[form.city] ?? "ICT"];
  const floor =
    fullTime && monthlyMin
      ? form.wagePeriod === "MONTHLY"
        ? { amount: monthlyMin, label: `${rupees(monthlyMin)} per month` }
        : form.wagePeriod === "DAILY"
          ? { amount: Math.ceil(monthlyMin / WORKING_DAYS_PER_MONTH), label: `${rupees(Math.ceil(monthlyMin / WORKING_DAYS_PER_MONTH))} per day` }
          : null
      : null;
  const belowFloor = !!floor && Number(form.offeredWage) > 0 && Number(form.offeredWage) < floor.amount;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const job = await run(
      () =>
        api.post<Job>("/jobs", {
          ...form,
          offeredWage: Number(form.offeredWage),
          description: form.description || undefined,
          area: form.area || undefined,
          workingHours: form.workingHours.trim() || undefined,
          weeklyRestDay: form.weeklyRestDay || undefined,
        }),
      "Job posted. Workers will start responding.",
    );
    if (job) navigate(`/household/jobs/${job.id}`);
  };

  return (
    <div style={{ maxWidth: 640 }}>
      <PageHeader title="Post a job" subtitle="Say what you need and what you will pay. Workers can accept or suggest their own price." />
      <form className="card form" onSubmit={submit}>
        <Field label="Type of work">
          <div className="chips">
            {(meta?.categories ?? []).map((c) => (
              <button key={c} type="button" className="chip" aria-pressed={form.category === c} onClick={() => set("category")(c)}>
                {categoryLabel(c)}
              </button>
            ))}
          </div>
        </Field>
        <Field label="Job title">
          <input value={form.title} onChange={(e) => set("title")(e.target.value)} placeholder="e.g. Live-in maid for family of five" required minLength={3} />
        </Field>
        <Field label="Details (optional)" hint="Duties, timings, days off, room provided…">
          <textarea value={form.description} onChange={(e) => set("description")(e.target.value)} />
        </Field>
        <div className="grid-2">
          <Field
            label="Your offered wage (Rs)"
            hint={
              floor ? (
                <span style={belowFloor ? { color: "var(--danger)" } : undefined}>
                  Legal minimum for full-time work in {form.city}: {floor.label}
                </span>
              ) : fullTime ? undefined : (
                "Part-time and one-off pay should be fair for the hours worked."
              )
            }
          >
            <input type="number" min={100} step={100} value={form.offeredWage} onChange={(e) => set("offeredWage")(e.target.value)} required />
          </Field>
          <Field label="Paid">
            <Select value={form.wagePeriod} onChange={set("wagePeriod")} options={meta?.wagePeriods ?? ["MONTHLY"]} labelFn={(p) => ({ MONTHLY: "Per month", DAILY: "Per day", ONE_TIME: "One-time" })[p] ?? humanize(p)} />
          </Field>
          <Field label="Schedule">
            <Select value={form.schedule} onChange={set("schedule")} options={meta?.schedules ?? ["FULL_TIME"]} />
          </Field>
          <Field label="City">
            <Select value={form.city} onChange={set("city")} options={meta?.cities ?? ["Lahore"]} labelFn={(c) => c} />
          </Field>
        </div>
        <Field label="Area">
          <input value={form.area} onChange={(e) => set("area")(e.target.value)} placeholder="e.g. DHA Phase 5" />
        </Field>
        <div className="grid-2">
          <Field label={fullTime ? "Working hours" : "Working hours (optional)"} hint="e.g. 8am to 5pm, with a lunch break">
            <input value={form.workingHours} onChange={(e) => set("workingHours")(e.target.value)} placeholder="8am - 5pm" maxLength={80} required={fullTime} />
          </Field>
          <Field
            label={fullTime ? "Weekly day off" : "Weekly day off (optional)"}
            hint={fullTime ? "Full-time workers are entitled to one paid day off every week." : undefined}
          >
            <Select
              value={form.weeklyRestDay}
              onChange={set("weeklyRestDay")}
              options={meta?.weekdays ?? []}
              placeholder={fullTime ? "Choose a day" : "Not fixed"}
            />
          </Field>
        </div>
        <label className="check">
          <input type="checkbox" checked={form.requireVerified} onChange={(e) => set("requireVerified")(e.target.checked)} />
          Only police-verified workers can respond
        </label>
        <p className="small muted">
          Your job stays open for {meta?.jobExpiryDays ?? 14} days. After that it closes on its own; you can post it again.
        </p>
        <button className="btn btn-block" disabled={busy || belowFloor || (fullTime && !form.weeklyRestDay)}>
          {busy ? "Posting…" : "Post job"}
        </button>
      </form>
    </div>
  );
}
