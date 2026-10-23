import { Field, Select } from "../../ui";
import { staffLabel } from "./adminTypes";

export interface PenaltyDraft {
  type: string;
  durationDays: string;
  reason: string;
}

export const PENALTY_TYPES = ["WARNING", "BADGE_SUSPENSION", "SUSPENSION", "BAN"] as const;

export const PENALTY_HELP: Record<string, string> = {
  WARNING: "Recorded on file. No effect on the profile.",
  BADGE_SUSPENSION: "Hides the Police verified badge. Worker can still take jobs.",
  SUSPENSION: "Worker hidden from search and cannot respond to jobs.",
  BAN: "Worker cannot log in. Pending offers are closed. Leave duration empty for permanent.",
};

/** Suspensions and bans follow the two-person rule (unless a super admin issues them). */
export const penaltyNeedsApproval = (type: string) => type === "SUSPENSION" || type === "BAN";

export const emptyPenalty = (type = "BADGE_SUSPENSION"): PenaltyDraft => ({ type, durationDays: "30", reason: "" });

export const penaltyPayload = (p: PenaltyDraft) => ({
  type: p.type,
  reason: p.reason,
  durationDays: p.durationDays ? Number(p.durationDays) : undefined,
});

export default function PenaltyFields({ value, onChange }: { value: PenaltyDraft; onChange: (p: PenaltyDraft) => void }) {
  return (
    <>
      <div className="grid-2">
        <Field label="Penalty" hint={PENALTY_HELP[value.type]}>
          <Select value={value.type} onChange={(type) => onChange({ ...value, type })} options={PENALTY_TYPES} labelFn={staffLabel} />
        </Field>
        <Field label="Duration (days)" hint="Empty = until lifted by an admin">
          <input type="number" min={1} max={3650} value={value.durationDays} onChange={(e) => onChange({ ...value, durationDays: e.target.value })} />
        </Field>
      </div>
      {penaltyNeedsApproval(value.type) && (
        <div className="pending-approval">
          <strong>Needs approval.</strong> A {staffLabel(value.type).toLowerCase()} only takes effect after a second staff member with the APPROVE
          permission approves it. Super admin requests apply immediately.
        </div>
      )}
      <Field label="Reason (shown to the worker)">
        <input value={value.reason} onChange={(e) => onChange({ ...value, reason: e.target.value })} minLength={3} required />
      </Field>
    </>
  );
}
