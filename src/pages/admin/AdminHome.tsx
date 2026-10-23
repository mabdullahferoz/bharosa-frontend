import { Link } from "react-router-dom";
import { api } from "../../api";
import { hasPerm, useAuth } from "../../auth";
import type { Approval, Complaint, Permission } from "../../types";
import { PERMISSION_LABEL, staffLabel, type SweepResult, type Stats } from "./adminTypes";
import { Loaded, PageHeader, Pill, timeAgo, useAction, useLoad, useToast } from "../../ui";
import CountUp from "../../components/reactbits/CountUp";

type StatTile = { label: string; value: number | undefined; to?: string; alert?: boolean };

export default function AdminHome() {
  const { user } = useAuth();
  const toast = useToast();
  const canApprove = hasPerm(user, "APPROVE");
  const canComplaints = hasPerm(user, "COMPLAINTS") || hasPerm(user, "REPORTS");
  const canReports = hasPerm(user, "REPORTS");
  const isSuper = user?.role === "SUPER_ADMIN";

  const stats = useLoad(() => api.get<Stats>("/admin/stats"));
  const waiting = useLoad(() => (canApprove ? api.get<Approval[]>("/approvals?status=PENDING") : Promise.resolve([] as Approval[])), [canApprove]);
  const complaints = useLoad(() => (canComplaints ? api.get<Complaint[]>("/admin/complaints?status=OPEN") : Promise.resolve([] as Complaint[])), [canComplaints]);
  const { busy, run } = useAction();

  const perms = user?.staff?.permissions ?? [];

  return (
    <div className="stack">
      <PageHeader
        title="Operations"
        subtitle="Verification, identity checks, placements, complaints and approvals."
        action={
          canReports ? (
            <button
              className="btn btn-ghost btn-sm"
              disabled={busy}
              title="Send due endorsement requests, lift expired penalties, expire old jobs and police checks (also runs hourly)"
              onClick={async () => {
                const r = await run(() => api.post<SweepResult>("/admin/sweep"));
                if (r)
                  toast(
                    `Daily checks done: ${r.endorsementRequests} endorsement request(s) sent, ${r.expiredJobs} job(s) expired, ${r.expiredVerifications} police check(s) expired.`,
                  );
                void stats.reload();
              }}
            >
              Run daily checks
            </button>
          ) : (
            <span className="muted small" title="Needs REPORTS permission">
              Daily checks need REPORTS permission
            </span>
          )
        }
      />

      <div className="card stack-sm">
        <div className="row-between">
          <div>
            <strong>{user?.name}</strong>{" "}
            <span className="staff-code mono">{user?.staff?.staffCode}</span>
            {user?.staff?.title && <span className="muted small"> · {user.staff.title}</span>}
          </div>
          <Link to="/admin/my-activity" className="small">
            My activity →
          </Link>
        </div>
        {isSuper || perms.includes("*") ? (
          <p className="small muted">Super admin: you hold every permission and your requests run immediately. They are still recorded in the audit log.</p>
        ) : (
          <div className="chips">
            {perms.length === 0 && <span className="muted small">No permissions yet. Ask a super admin.</span>}
            {perms.map((p) => (
              <span key={p} className="chip" title={p}>
                {PERMISSION_LABEL[p as Permission] ?? p}
              </span>
            ))}
          </div>
        )}
      </div>

      <Loaded state={stats}>
        {(s) => {
          const tiles: StatTile[] = [
            { label: "Approvals waiting", value: s.pendingApprovals, to: "/admin/approvals", alert: !!s.pendingApprovals },
            { label: "CNIC returns overdue", value: s.cnicReturnOverdue, to: "/admin/custody", alert: !!s.cnicReturnOverdue },
            { label: "Open complaints", value: s.openComplaints, to: "/admin/complaints", alert: !!s.openComplaints },
            { label: "Open worker grievances", value: s.openGrievances, to: "/admin/grievances", alert: !!s.openGrievances },
            { label: "Awaiting verification", value: s.pendingVerification, to: "/admin/verification" },
            { label: "Workers", value: s.workers, to: "/admin/workers" },
            { label: "Police verified", value: s.verified, to: "/admin/verification" },
            { label: "CNICs in custody", value: s.cnicHeld, to: "/admin/custody" },
            { label: "Households", value: s.households, to: "/admin/households" },
            { label: "Open jobs", value: s.openJobs },
            { label: "Active placements", value: s.activeEngagements, to: "/admin/placements" },
            { label: "Active penalties", value: s.activePenalties, to: "/admin/workers" },
          ];
          return (
            <>
              {!!s.cnicReturnOverdue && (
                <div className="callout callout-error">
                  <span>
                    {s.cnicReturnOverdue} original CNIC(s) were not returned within 48 hours of the worker asking. Return them today.
                  </span>
                  <Link to="/admin/custody" className="btn btn-sm btn-danger">
                    Open register
                  </Link>
                </div>
              )}
              <div className="stats">
                {tiles.map((t) => {
                  const body = (
                    <>
                      <div className="stat-value" style={t.alert ? { color: "var(--danger)" } : undefined}>
                        {typeof t.value === "number" ? <CountUp to={t.value} duration={0.9} separator="," trigger="load" /> : "-"}
                      </div>
                      <div className="stat-label">{t.label}</div>
                    </>
                  );
                  return t.to ? (
                    <Link key={t.label} to={t.to} className="card card-link stat">
                      {body}
                    </Link>
                  ) : (
                    <div key={t.label} className="card stat">
                      {body}
                    </div>
                  );
                })}
              </div>
            </>
          );
        }}
      </Loaded>

      <div className="grid-2">
        <div className="stack-sm">
          <div className="row-between">
            <h2>Waiting for your approval</h2>
            <Link to="/admin/approvals" className="small">
              All approvals →
            </Link>
          </div>
          {!canApprove ? (
            <p className="muted small">
              You can't approve requests (needs APPROVE permission). Your own requests and their status are on the{" "}
              <Link to="/admin/approvals">Approvals</Link> page.
            </p>
          ) : (
            <Loaded state={waiting}>
              {(list) => {
                const mine = list.filter((a) => a.canDecide);
                return mine.length === 0 ? (
                  <p className="muted">Nothing waiting for you.</p>
                ) : (
                  <>
                    {mine.slice(0, 5).map((a) => (
                      <Link key={a.id} to="/admin/approvals" className="card card-link stack-sm">
                        <div className="row-between">
                          <strong>{a.summary}</strong>
                          <Pill value="PENDING" label={staffLabel(a.type)} />
                        </div>
                        <span className="muted small">
                          by {a.requestedBy.name} <span className="mono">{a.requestedBy.staffProfile?.staffCode}</span> · {timeAgo(a.createdAt)}
                        </span>
                      </Link>
                    ))}
                  </>
                );
              }}
            </Loaded>
          )}
        </div>

        <div className="stack-sm">
          <div className="row-between">
            <h2>New complaints</h2>
            <Link to="/admin/complaints" className="small">
              All complaints →
            </Link>
          </div>
          {!canComplaints ? (
            <p className="muted small">Needs COMPLAINTS or REPORTS permission.</p>
          ) : (
            <Loaded state={complaints}>
              {(list) =>
                list.length === 0 ? (
                  <p className="muted">No new complaints.</p>
                ) : (
                  list.slice(0, 5).map((c) => (
                    <Link key={c.id} to="/admin/complaints" className="card card-link stack-sm">
                      <div className="row-between">
                        <strong>
                          {c.worker?.name} · {staffLabel(c.category)}
                        </strong>
                        <Pill value={c.severity} label={staffLabel(c.severity)} />
                      </div>
                      <span className="muted small">
                        by {c.filedBy?.name} · {timeAgo(c.createdAt)}
                      </span>
                    </Link>
                  ))
                )
              }
            </Loaded>
          )}
        </div>
      </div>
    </div>
  );
}
