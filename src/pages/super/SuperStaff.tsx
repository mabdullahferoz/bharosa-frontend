import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { api } from "../../api";
import { useAuth } from "../../auth";
import { Empty, Field, Loaded, Modal, PageHeader, humanize, timeAgo, useAction, useLoad, useToast } from "../../ui";
import { staffLabel, type PermissionCatalog, type StaffMember, type StaffRole } from "./superTypes";

/** 30-day counts above these are highlighted. */
const PII_WARN = 30;
const REJECTED_WARN = 3;

function Num({ n, warnAt, danger = false }: { n: number; warnAt: number; danger?: boolean }) {
  if (n >= warnAt && n > 0) return <span className={`pill pill-${danger ? "danger" : "warn"}`}>{n}</span>;
  return <span>{n}</span>;
}

function PermissionPicker({ catalog, value, onChange }: { catalog: PermissionCatalog; value: string[]; onChange: (v: string[]) => void }) {
  const toggle = (k: string) => onChange(value.includes(k) ? value.filter((x) => x !== k) : [...value, k]);
  return (
    <div className="stack-sm">
      {Object.entries(catalog.permissions).map(([key, desc]) => (
        <label key={key} className="check" style={{ alignItems: "flex-start" }}>
          <input type="checkbox" checked={value.includes(key)} onChange={() => toggle(key)} style={{ marginTop: 4 }} />
          <span>
            <span className="mono">{key}</span>
            <span className="muted small" style={{ display: "block" }}>
              {desc}
            </span>
          </span>
        </label>
      ))}
    </div>
  );
}

function TempPasswordModal({ title, who, password, onClose }: { title: string; who: string; password: string; onClose: () => void }) {
  const toast = useToast();
  return (
    <Modal title={title} onClose={onClose}>
      <div className="stack">
        <p>
          Temporary password for <strong>{who}</strong>:
        </p>
        <div className="card row-between">
          <span className="mono" style={{ fontSize: "1.3rem", fontWeight: 700 }}>
            {password}
          </span>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() =>
              navigator.clipboard
                ?.writeText(password)
                .then(() => toast("Copied"))
                .catch(() => undefined)
            }
          >
            Copy
          </button>
        </div>
        <div className="callout callout-warn">
          This is shown only once. Give it to the staff member privately (in person or by phone). They must change it when they first log in.
        </div>
        <button className="btn" onClick={onClose}>
          I have noted it
        </button>
      </div>
    </Modal>
  );
}

function CreateStaffModal({ catalog, onClose, onCreated }: { catalog: PermissionCatalog; onClose: () => void; onCreated: (r: { name: string; staffCode: string; tempPassword: string }) => void }) {
  const { busy, run } = useAction();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [title, setTitle] = useState("");
  const [city, setCity] = useState("Lahore");
  const [role, setRole] = useState<StaffRole>("ADMIN");
  const [perms, setPerms] = useState<string[]>(catalog.defaults);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (role === "SUPER_ADMIN" && !window.confirm(`Make ${name || "this person"} a SUPER ADMIN? They will have full power, including over you.`)) return;
    const r = await run(() =>
      api.post<{ id: string; staffCode: string; tempPassword: string }>("/super/staff", {
        name,
        phone,
        role,
        title: title || undefined,
        city: city || undefined,
        permissions: role === "ADMIN" ? perms : [],
      }),
    );
    if (r) onCreated({ name, staffCode: r.staffCode, tempPassword: r.tempPassword });
  };

  return (
    <Modal title="Add staff member" onClose={onClose}>
      <form className="form" onSubmit={submit}>
        <Field label="Full name">
          <input value={name} onChange={(e) => setName(e.target.value)} required minLength={2} maxLength={80} />
        </Field>
        <Field label="Phone" hint="Format 03XXXXXXXXX. They log in with this number.">
          <input type="tel" className="ltr" value={phone} onChange={(e) => setPhone(e.target.value.trim())} required pattern="03[0-9]{9}" />
        </Field>
        <div className="grid-2">
          <Field label="Job title (optional)">
            <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={80} placeholder="Field agent, Lahore" />
          </Field>
          <Field label="City">
            <input value={city} onChange={(e) => setCity(e.target.value)} maxLength={60} />
          </Field>
        </div>
        <div className="field">
          <span className="field-label">Role</span>
          <div className="role-pick">
            <button type="button" aria-pressed={role === "ADMIN"} onClick={() => setRole("ADMIN")}>
              <strong>Staff (ADMIN)</strong>
              <span className="muted small">Only the permissions you tick below.</span>
            </button>
            <button type="button" aria-pressed={role === "SUPER_ADMIN"} onClick={() => setRole("SUPER_ADMIN")}>
              <strong>Super admin</strong>
              <span className="muted small">Everything, including staff and the audit log.</span>
            </button>
          </div>
        </div>
        {role === "SUPER_ADMIN" ? (
          <div className="callout callout-error">
            A super admin has full power: they can create and remove staff, read and export the whole audit log, and approve anything. Give this only to founders.
            Their actions are still logged.
          </div>
        ) : (
          <div className="field">
            <span className="field-label">Permissions</span>
            <span className="field-hint">Give only what the job needs. A good starting set is pre-selected.</span>
            <PermissionPicker catalog={catalog} value={perms} onChange={setPerms} />
          </div>
        )}
        <div className="row">
          <button className="btn" disabled={busy}>
            {busy ? "Creating…" : "Create account"}
          </button>
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
        </div>
      </form>
    </Modal>
  );
}

function EditStaffModal({ member, catalog, onClose, onSaved }: { member: StaffMember; catalog: PermissionCatalog; onClose: () => void; onSaved: () => void }) {
  const { busy, run } = useAction();
  const [title, setTitle] = useState(member.title ?? "");
  const [perms, setPerms] = useState<string[]>(member.permissions);
  const [active, setActive] = useState(member.active);
  const [reason, setReason] = useState("");

  const permsChanged = perms.length !== member.permissions.length || perms.some((p) => !member.permissions.includes(p));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (member.active && !active && !window.confirm(`Deactivate ${staffLabel(member)}? They will be logged out immediately and cannot log in again until reactivated.`)) return;
    const body: Record<string, unknown> = { reason };
    if (title !== (member.title ?? "")) body.title = title || null;
    if (permsChanged) body.permissions = perms;
    if (active !== member.active) body.active = active;
    const r = await run(() => api.patch("/super/staff/" + member.id, body), "Staff access updated");
    if (r) onSaved();
  };

  return (
    <Modal title={`Edit ${staffLabel(member)}`} onClose={onClose}>
      <form className="form" onSubmit={submit}>
        <Field label="Job title">
          <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={80} />
        </Field>
        <label className="check">
          <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
          Account active (can log in)
        </label>
        <div className="field">
          <span className="field-label">Permissions</span>
          <PermissionPicker catalog={catalog} value={perms} onChange={setPerms} />
        </div>
        {(permsChanged || !active) && (
          <div className="callout callout-info">Changing permissions or deactivating logs them out of every device right away.</div>
        )}
        <Field label="Reason (required)" hint="Recorded in the audit log and sent to the staff member.">
          <textarea value={reason} onChange={(e) => setReason(e.target.value)} required minLength={3} maxLength={300} />
        </Field>
        <div className="row">
          <button className="btn" disabled={busy || reason.trim().length < 3}>
            {busy ? "Saving…" : "Save changes"}
          </button>
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
        </div>
      </form>
    </Modal>
  );
}

function ReasonModal({
  title,
  intro,
  confirmLabel,
  danger,
  onClose,
  onConfirm,
}: {
  title: string;
  intro: string;
  confirmLabel: string;
  danger?: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => Promise<void>;
}) {
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <Modal title={title} onClose={onClose}>
      <form
        className="form"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          try {
            await onConfirm(reason);
          } finally {
            setBusy(false);
          }
        }}
      >
        <p>{intro}</p>
        <Field label="Reason (required)" hint="Recorded in the audit log.">
          <textarea value={reason} onChange={(e) => setReason(e.target.value)} required minLength={3} maxLength={300} />
        </Field>
        <div className="row">
          <button className={`btn ${danger ? "btn-danger" : ""}`} disabled={busy || reason.trim().length < 3}>
            {busy ? "Working…" : confirmLabel}
          </button>
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
        </div>
      </form>
    </Modal>
  );
}

type Dialog =
  | { kind: "create" }
  | { kind: "edit"; member: StaffMember }
  | { kind: "reset"; member: StaffMember }
  | { kind: "logout"; member: StaffMember }
  | { kind: "password"; who: string; password: string; title: string };

export default function SuperStaff() {
  const { user } = useAuth();
  const toast = useToast();
  const { run } = useAction();
  const staff = useLoad(() => api.get<StaffMember[]>("/super/staff"));
  const catalog = useLoad(() => api.get<PermissionCatalog>("/super/permissions"));
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const [showInactive, setShowInactive] = useState(true);
  const close = () => setDialog(null);

  return (
    <div className="stack">
      <PageHeader
        title="Staff"
        subtitle="Who works for Kaam Connect, what each person is allowed to do, and how they used that power in the last 30 days."
        action={
          <button className="btn" disabled={!catalog.data} onClick={() => setDialog({ kind: "create" })}>
            + Add staff
          </button>
        }
      />
      <div className="callout callout-info">
        Every change here (new accounts, permission changes, password resets, logouts) is written to the audit log with your name. Super admins' own actions are
        logged too.
      </div>

      <Loaded state={staff}>
        {(list) => {
          const shown = showInactive ? list : list.filter((s) => s.active);
          return list.length === 0 ? (
            <Empty title="No staff yet" />
          ) : (
            <>
              <label className="check small">
                <input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} />
                Show deactivated accounts
              </label>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Code</th>
                      <th>Name</th>
                      <th>Role</th>
                      <th>Last login</th>
                      <th title="All actions in the last 30 days">Actions</th>
                      <th title="Phone/CNIC numbers unmasked">PII reveals</th>
                      <th title="Actions taken on a worker's or family's behalf">Assisted</th>
                      <th title="Their requests that a second person rejected">Rejected</th>
                      <th>Open reports</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {shown.map((s) => {
                      const self = s.id === user?.id;
                      return (
                        <tr key={s.id} style={s.active ? undefined : { opacity: 0.6 }}>
                          <td className="nowrap">
                            <span className="staff-code mono">{s.staffCode ?? "—"}</span>
                          </td>
                          <td style={{ minWidth: 170 }}>
                            <strong>{s.name}</strong>
                            {self && <span className="muted small"> (you)</span>}
                            <div className="muted small">{s.title ?? "No title"}</div>
                            <div className="muted small mono">{s.phone}</div>
                          </td>
                          <td>
                            <div className="stack-sm" style={{ gap: 4, alignItems: "flex-start" }}>
                              <span className={`pill ${s.role === "SUPER_ADMIN" ? "pill-danger" : "pill-info"}`}>{s.role === "SUPER_ADMIN" ? "Super admin" : "Staff"}</span>
                              {!s.active && <span className="pill pill-neutral">Deactivated</span>}
                              {s.status !== "ACTIVE" && <span className="pill pill-warn">{humanize(s.status)}</span>}
                            </div>
                            {s.role === "ADMIN" && (
                              <div className="muted small" title={s.permissions.join(", ")}>
                                {s.permissions.length} permission{s.permissions.length === 1 ? "" : "s"}
                              </div>
                            )}
                          </td>
                          <td className="nowrap small">{s.lastLoginAt ? timeAgo(s.lastLoginAt) : <span className="muted">Never</span>}</td>
                          <td>{s.last30d.actions}</td>
                          <td>
                            <Num n={s.last30d.piiReveals} warnAt={PII_WARN} />
                          </td>
                          <td>{s.last30d.assistedActions}</td>
                          <td>
                            <Num n={s.last30d.rejectedRequests} warnAt={REJECTED_WARN} />
                          </td>
                          <td>{s.openReports > 0 ? <Link to="/super/reports" className="pill pill-danger">{s.openReports}</Link> : 0}</td>
                          <td>
                            <div className="row" style={{ gap: 6, flexWrap: "nowrap" }}>
                              <Link className="btn btn-ghost btn-sm" to={`/super/audit?actorId=${encodeURIComponent(s.id)}`}>
                                View activity
                              </Link>
                              {s.role === "ADMIN" && (
                                <button className="btn btn-ghost btn-sm" disabled={!catalog.data} onClick={() => setDialog({ kind: "edit", member: s })}>
                                  Edit
                                </button>
                              )}
                              {!self && (
                                <>
                                  <button className="btn btn-ghost btn-sm" onClick={() => setDialog({ kind: "reset", member: s })}>
                                    Reset password
                                  </button>
                                  <button className="btn btn-danger-ghost btn-sm" onClick={() => setDialog({ kind: "logout", member: s })}>
                                    Force logout
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <p className="muted small">
                Highlighted: {PII_WARN}+ private-data reveals or {REJECTED_WARN}+ rejected requests in 30 days. Super admin accounts cannot be edited here; their
                activity is still in the audit log.
              </p>
            </>
          );
        }}
      </Loaded>

      {dialog?.kind === "create" && catalog.data && (
        <CreateStaffModal
          catalog={catalog.data}
          onClose={close}
          onCreated={(r) => {
            void staff.reload();
            setDialog({ kind: "password", who: `${r.staffCode} ${r.name}`, password: r.tempPassword, title: "Staff account created" });
          }}
        />
      )}
      {dialog?.kind === "edit" && catalog.data && (
        <EditStaffModal
          member={dialog.member}
          catalog={catalog.data}
          onClose={close}
          onSaved={() => {
            close();
            void staff.reload();
          }}
        />
      )}
      {dialog?.kind === "reset" && (
        <ReasonModal
          title={`Reset password: ${staffLabel(dialog.member)}`}
          intro="A new temporary password is created and all their sessions end. They must choose a new password when they log in."
          confirmLabel="Reset password"
          onClose={close}
          onConfirm={async (reason) => {
            const m = dialog.member;
            const r = await run(() => api.post<{ tempPassword: string }>(`/super/staff/${m.id}/reset-password`, { reason }));
            if (r) setDialog({ kind: "password", who: staffLabel(m), password: r.tempPassword, title: "Password reset" });
          }}
        />
      )}
      {dialog?.kind === "logout" && (
        <ReasonModal
          title={`Force logout: ${staffLabel(dialog.member)}`}
          intro="Ends their session on every device right away. Use this if a phone is lost or you suspect someone else is using the account."
          confirmLabel="Log them out"
          danger
          onClose={close}
          onConfirm={async (reason) => {
            const r = await run(() => api.post(`/super/users/${dialog.member.id}/force-logout`, { reason }));
            if (r) {
              toast(`${staffLabel(dialog.member)} was logged out everywhere`);
              close();
            }
          }}
        />
      )}
      {dialog?.kind === "password" && <TempPasswordModal title={dialog.title} who={dialog.who} password={dialog.password} onClose={close} />}
    </div>
  );
}
