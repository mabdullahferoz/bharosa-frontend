import { Link } from "react-router-dom";
import { api } from "../../api";
import { Empty, Loaded, PageHeader, useLoad } from "../../ui";
import { ruleInfo, type Alert, type ChainResult, type StaffMember } from "./superTypes";

const LEVELS: { level: Alert["level"]; title: string; hint: string; tone: string }[] = [
  { level: "HIGH", title: "High: act today", hint: "Possible misuse of power or harm to a worker or family.", tone: "danger" },
  { level: "MEDIUM", title: "Medium: look this week", hint: "Unusual patterns worth a conversation.", tone: "warn" },
  { level: "LOW", title: "Low: housekeeping", hint: "Things slowing the team down.", tone: "neutral" },
];

function ChainBanner({ chain }: { chain: ChainResult }) {
  if (chain.ok)
    return (
      <div className="callout callout-ok">
        <span>
          <strong>Audit log intact:</strong> {chain.checked.toLocaleString()} entries verified. No one has changed history.
        </span>
        <Link to="/super/audit" className="btn btn-ghost btn-sm">
          Open audit log
        </Link>
      </div>
    );
  return (
    <div className="callout callout-error">
      <span>
        <strong>History was changed at entry #{chain.brokenAtId}</strong>
        {chain.action ? ` (${chain.action})` : ""}. {chain.checked.toLocaleString()} entries checked before the break. Treat this as a security incident.
      </span>
      <Link to="/super/audit" className="btn btn-danger btn-sm">
        Inspect the log
      </Link>
    </div>
  );
}

function AlertCard({ alert, staff }: { alert: Alert; staff: StaffMember[] }) {
  const info = ruleInfo(alert.rule);
  const who = alert.staffId ? staff.find((s) => s.id === alert.staffId) : undefined;
  return (
    <div className="card stack-sm">
      <div className="row-between">
        <strong>{info.title}</strong>
        <span className="mono muted small">{alert.rule}</span>
      </div>
      <p>{alert.message}</p>
      {info.meaning && <p className="muted small">{info.meaning}</p>}
      {info.todo && (
        <p className="small">
          <strong>What to do:</strong> {info.todo}
        </p>
      )}
      <div className="row">
        {alert.staffId && (
          <Link className="btn btn-ghost btn-sm" to={`/super/audit?actorId=${encodeURIComponent(alert.staffId)}`}>
            {who ? `${who.staffCode ?? ""} activity` : "Staff activity"}
          </Link>
        )}
        {alert.link && (
          <Link className="btn btn-ghost btn-sm" to={alert.link}>
            Open
          </Link>
        )}
      </div>
    </div>
  );
}

export default function SuperAlerts() {
  const alerts = useLoad(() => api.get<{ alerts: Alert[]; auditChain: ChainResult }>("/super/alerts"));
  const staff = useLoad(() => api.get<StaffMember[]>("/super/staff"));
  const pending = useLoad(() => api.get<unknown[]>("/approvals?status=PENDING").catch(() => [] as unknown[]));

  const s = staff.data ?? [];
  const team = s.filter((x) => x.active);
  const sum = (f: (m: StaffMember) => number) => s.reduce((a, m) => a + f(m), 0);

  return (
    <div className="stack">
      <PageHeader
        title="Red flags"
        subtitle="Signs that staff power may be misused. Checked live from the audit log every time you open this page."
        action={
          <button
            className="btn btn-ghost btn-sm"
            disabled={alerts.loading}
            onClick={() => {
              void alerts.reload();
              void staff.reload();
              void pending.reload();
            }}
          >
            Refresh
          </button>
        }
      />

      <Loaded state={alerts}>{(d) => <ChainBanner chain={d.auditChain} />}</Loaded>

      {staff.data && (
        <div className="stats">
          <Link to="/super/staff" className="card card-link stat">
            <div className="stat-value">{team.length}</div>
            <div className="stat-label">Active staff</div>
          </Link>
          <div className="card stat">
            <div className="stat-value">{sum((m) => m.last30d.piiReveals)}</div>
            <div className="stat-label">Private-data reveals (30 days)</div>
          </div>
          <Link to="/super/audit?onBehalfOf=1" className="card card-link stat">
            <div className="stat-value">{sum((m) => m.last30d.assistedActions)}</div>
            <div className="stat-label">Actions on someone's behalf (30 days)</div>
          </Link>
          <Link to="/super/reports" className="card card-link stat">
            <div className="stat-value" style={sum((m) => m.openReports) ? { color: "var(--danger)" } : undefined}>
              {sum((m) => m.openReports)}
            </div>
            <div className="stat-label">Open reports about staff</div>
          </Link>
          {pending.data && (
            <Link to="/admin/approvals" className="card card-link stat">
              <div className="stat-value">{pending.data.length}</div>
              <div className="stat-label">Approvals waiting</div>
            </Link>
          )}
        </div>
      )}

      <Loaded state={alerts}>
        {(d) =>
          d.alerts.length === 0 ? (
            <Empty title="No red flags right now">Nothing unusual in staff activity. This page re-checks every time you open it.</Empty>
          ) : (
            <div className="stack">
              {LEVELS.map(({ level, title, hint, tone }) => {
                const list = d.alerts.filter((a) => a.level === level);
                if (!list.length) return null;
                return (
                  <section key={level} className="stack-sm">
                    <div className="row">
                      <span className={`pill pill-${tone}`}>{list.length}</span>
                      <h2>{title}</h2>
                      <span className="muted small">{hint}</span>
                    </div>
                    <div className="grid">
                      {list.map((a, i) => (
                        <AlertCard key={`${a.rule}-${i}`} alert={a} staff={s} />
                      ))}
                    </div>
                  </section>
                );
              })}
            </div>
          )
        }
      </Loaded>

      <section className="card stack-sm section">
        <h2>How oversight works</h2>
        <ul className="stack-sm" style={{ margin: 0, paddingInlineStart: 20 }}>
          <li>
            <strong>Two-person rule.</strong> Serious actions (final verification, suspensions and bans, dismissing serious complaints, back-dated placements) wait
            until a second staff member approves. Nobody can approve their own request.
          </li>
          <li>
            <strong>Masked private data.</strong> Phone and CNIC numbers are hidden by default. Revealing one needs a permission and a reason, and every reveal is
            logged.
          </li>
          <li>
            <strong>Receipts to workers and families.</strong> When staff act on someone's behalf, that person gets an SMS and an in-app notice naming the staff
            code. They can tap "I did not agree" and it lands in Staff reports.
          </li>
          <li>
            <strong>Append-only, hash-chained log.</strong> Each audit entry carries a fingerprint of the one before it, so editing or deleting any past entry
            breaks the chain and shows up here.
          </li>
          <li>
            <strong>Staff cannot see or change the audit log.</strong> Only super admins can read it, and super admins' own actions (including exports and checks)
            are logged too.
          </li>
        </ul>
      </section>
    </div>
  );
}
