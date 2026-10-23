import { Fragment, useEffect, useState, type CSSProperties } from "react";
import { useSearchParams } from "react-router-dom";
import { api, qs } from "../../api";
import { Empty, Loaded, PageHeader, humanize, useAction, useLoad } from "../../ui";
import { downloadAuditCsv, formatDateTime, prettyDetails, shortHash, type AuditEntry, type ChainResult, type StaffMember } from "./superTypes";

const PAGE = 100;

/** YYYY-MM-DD (local) -> ISO timestamp at the start or end of that day. */
const dayBound = (d: string | null, end: boolean) => (d ? new Date(`${d}T${end ? "23:59:59.999" : "00:00:00"}`).toISOString() : undefined);

export default function SuperAudit() {
  const [params, setParams] = useSearchParams();
  const actorId = params.get("actorId") ?? "";
  const subjectUserId = params.get("subjectUserId") ?? "";
  const action = params.get("action") ?? "";
  const onBehalfOf = params.get("onBehalfOf") === "1";
  const from = params.get("from") ?? "";
  const to = params.get("to") ?? "";

  const filterQuery = qs({ actorId, subjectUserId, action, onBehalfOf: onBehalfOf ? "1" : undefined, from: dayBound(from, false), to: dayBound(to, true) });

  const staff = useLoad(() => api.get<StaffMember[]>("/super/staff"));
  const log = useLoad(() => api.get<AuditEntry[]>(`/super/audit${filterQuery}`), [filterQuery]);
  const [exhausted, setExhausted] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [open, setOpen] = useState<number | null>(null);
  const [actionDraft, setActionDraft] = useState(action);
  const [chain, setChain] = useState<ChainResult | null>(null);
  const verify = useAction();
  const exporter = useAction();

  useEffect(() => setActionDraft(action), [action]);
  useEffect(() => setExhausted(false), [filterQuery]);

  const setFilter = (k: string, v: string) => {
    const next = new URLSearchParams(params);
    if (v) next.set(k, v);
    else next.delete(k);
    setParams(next, { replace: true });
  };

  const loadOlder = async () => {
    const rows = log.data ?? [];
    const last = rows[rows.length - 1];
    if (!last) return;
    setLoadingMore(true);
    try {
      const more = await api.get<AuditEntry[]>(`/super/audit${filterQuery}${filterQuery ? "&" : "?"}before=${last.id}`);
      log.setData([...rows, ...more]);
      if (more.length < PAGE) setExhausted(true);
    } catch {
      /* keep the button so the user can retry */
    } finally {
      setLoadingMore(false);
    }
  };

  const filtered = !!(actorId || subjectUserId || action || onBehalfOf || from || to);
  const staffName = staff.data?.find((s) => s.id === actorId);

  return (
    <div className="stack">
      <PageHeader
        title="Audit log"
        subtitle="Every action by staff and users, newest first. Entries cannot be edited: each one is chained to the one before it."
        action={
          <div className="row">
            <button
              className="btn btn-ghost btn-sm"
              disabled={verify.busy}
              onClick={async () => {
                const r = await verify.run(() => api.get<ChainResult>("/super/audit/verify"));
                if (r) setChain(r);
              }}
            >
              {verify.busy ? "Checking…" : "Verify chain"}
            </button>
            <button className="btn btn-ghost btn-sm" disabled={exporter.busy} onClick={() => exporter.run(() => downloadAuditCsv(filterQuery), "Export downloaded")}>
              {exporter.busy ? "Exporting…" : filtered ? "Export CSV (filtered)" : "Export CSV"}
            </button>
          </div>
        }
      />

      {chain &&
        (chain.ok ? (
          <div className="callout callout-ok">
            <span>
              <strong>Chain intact.</strong> {chain.checked.toLocaleString()} entries verified. Last fingerprint <span className="mono">{shortHash(chain.lastHash)}</span>.
            </span>
            <button className="btn btn-ghost btn-sm" onClick={() => setChain(null)}>
              Hide
            </button>
          </div>
        ) : (
          <div className="callout callout-error">
            <span>
              <strong>History was changed at entry #{chain.brokenAtId}</strong>
              {chain.action ? ` (${humanize(chain.action)})` : ""}
              {chain.brokenAt ? `, recorded ${formatDateTime(chain.brokenAt)}` : ""}. That entry or one before it was edited or deleted outside the app.
              Export the log and investigate.
            </span>
          </div>
        ))}

      <div className="filters">
        <select value={actorId} onChange={(e) => setFilter("actorId", e.target.value)} aria-label="Staff member">
          <option value="">All people</option>
          {staffName === undefined && actorId && <option value={actorId}>Selected person</option>}
          {staff.data?.map((s) => (
            <option key={s.id} value={s.id}>
              {s.staffCode ?? "—"} {s.name}
              {s.active ? "" : " (deactivated)"}
            </option>
          ))}
        </select>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setFilter("action", actionDraft.trim().toUpperCase());
          }}
          style={{ display: "flex", gap: 6 }}
        >
          <input value={actionDraft} onChange={(e) => setActionDraft(e.target.value)} placeholder="Action, e.g. PII_REVEALED" aria-label="Action contains" />
          <button className="btn btn-ghost btn-sm">Go</button>
        </form>
        <label className="check small" style={{ minWidth: 0 }}>
          <input type="checkbox" checked={onBehalfOf} onChange={(e) => setFilter("onBehalfOf", e.target.checked ? "1" : "")} />
          Assisted only
        </label>
        <label className="row small" style={{ gap: 6, flexWrap: "nowrap" }}>
          From
          <input type="date" value={from} onChange={(e) => setFilter("from", e.target.value)} />
        </label>
        <label className="row small" style={{ gap: 6, flexWrap: "nowrap" }}>
          To
          <input type="date" value={to} onChange={(e) => setFilter("to", e.target.value)} />
        </label>
        {filtered && (
          <button className="btn btn-ghost btn-sm" onClick={() => setParams(new URLSearchParams(), { replace: true })}>
            Clear filters
          </button>
        )}
      </div>
      {subjectUserId && <p className="muted small">Showing entries about one user only.</p>}

      <Loaded state={log}>
        {(rows) =>
          rows.length === 0 ? (
            <Empty title="No entries">{filtered ? "Nothing matches these filters." : "The log is empty."}</Empty>
          ) : (
            <>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Time</th>
                      <th>Who</th>
                      <th>Action</th>
                      <th>About</th>
                      <th>Reason</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((l) => {
                      const code = l.actor?.staffProfile?.staffCode;
                      const expanded = open === l.id;
                      return (
                        <Fragment key={l.id}>
                          <tr>
                            <td className="mono muted">{l.id}</td>
                            <td className="nowrap small">{formatDateTime(l.createdAt)}</td>
                            <td>
                              {l.actor ? (
                                <>
                                  {code && <span className="staff-code mono">{code} </span>}
                                  {l.actor.name}
                                  {!code && <div className="muted small">{humanize(l.actorRole ?? l.actor.role)}</div>}
                                </>
                              ) : (
                                <span className="muted">System</span>
                              )}
                            </td>
                            <td>
                              <strong>{humanize(l.action)}</strong>
                              <div className="row" style={{ gap: 4, marginTop: 2 }}>
                                {l.onBehalfOf && <span className="pill pill-warn">On their behalf</span>}
                                {l.approvalId && <span className="pill pill-info">Approved by 2nd person</span>}
                              </div>
                            </td>
                            <td>
                              {l.subject ? (
                                <button className="btn-link" style={linkBtn} onClick={() => setFilter("subjectUserId", l.subject!.id)} title="Show only entries about this person">
                                  {l.subject.name}
                                </button>
                              ) : (
                                <span className="muted">—</span>
                              )}
                              {l.subject && <div className="muted small">{humanize(l.subject.role)}</div>}
                            </td>
                            <td className="small" style={{ maxWidth: 260 }}>
                              {l.reason ?? <span className="muted">—</span>}
                            </td>
                            <td>
                              <button className="btn btn-ghost btn-sm" aria-expanded={expanded} onClick={() => setOpen(expanded ? null : l.id)}>
                                {expanded ? "Hide" : "Details"}
                              </button>
                            </td>
                          </tr>
                          {expanded && (
                            <tr>
                              <td colSpan={7} style={{ background: "var(--surface-2)" }}>
                                <dl className="kv small">
                                  <dt>Record</dt>
                                  <dd>
                                    {l.entity ?? "—"} <span className="mono muted">{l.entityId ?? ""}</span>
                                  </dd>
                                  {l.approvalId && (
                                    <>
                                      <dt>Approval</dt>
                                      <dd className="mono">{l.approvalId}</dd>
                                    </>
                                  )}
                                  <dt>IP address</dt>
                                  <dd className="mono">{l.ip ?? "—"}</dd>
                                  <dt>Fingerprint</dt>
                                  <dd className="mono" title={l.hash}>
                                    {shortHash(l.hash)}
                                  </dd>
                                  <dt>Previous</dt>
                                  <dd className="mono" title={l.prevHash ?? ""}>
                                    {shortHash(l.prevHash)}
                                  </dd>
                                </dl>
                                {l.details && (
                                  <pre className="mono" style={preStyle}>
                                    {prettyDetails(l.details)}
                                  </pre>
                                )}
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="row-between">
                <span className="muted small">{rows.length} entries shown</span>
                {!exhausted && rows.length >= PAGE && (
                  <button className="btn btn-ghost" disabled={loadingMore} onClick={loadOlder}>
                    {loadingMore ? "Loading…" : "Load older"}
                  </button>
                )}
              </div>
            </>
          )
        }
      </Loaded>
    </div>
  );
}

const linkBtn: CSSProperties = { background: "none", border: 0, padding: 0, font: "inherit", color: "var(--brand)", cursor: "pointer", textAlign: "start" };
const preStyle: CSSProperties = {
  margin: "10px 0 0",
  padding: 10,
  background: "var(--surface)",
  border: "1px solid var(--line)",
  borderRadius: 8,
  overflowX: "auto",
  whiteSpace: "pre-wrap",
  wordBreak: "break-word",
  maxWidth: "100%",
};
