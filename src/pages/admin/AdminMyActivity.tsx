import { Link } from "react-router-dom";
import { api } from "../../api";
import { staffLabel, type StaffAuditEntry } from "./adminTypes";
import { Empty, Loaded, PageHeader, Pill, timeAgo, useLoad } from "../../ui";

function detailText(raw: string | null) {
  if (!raw) return null;
  try {
    const d = JSON.parse(raw) as Record<string, unknown>;
    const parts = Object.entries(d)
      .filter(([k, v]) => v !== null && v !== undefined && v !== "" && !/cnic|phone|password/i.test(k))
      .slice(0, 5)
      .map(([k, v]) => `${staffLabel(k.replace(/([a-z])([A-Z])/g, "$1_$2"))}: ${typeof v === "object" ? JSON.stringify(v) : String(v)}`);
    return parts.length ? parts.join(" · ") : null;
  } catch {
    return raw;
  }
}

export default function AdminMyActivity() {
  const state = useLoad(() => api.get<StaffAuditEntry[]>("/admin/my-activity"));
  return (
    <div className="stack">
      <PageHeader title="My activity" subtitle="Your own audit trail: the last 200 things you did as staff." />
      <div className="callout callout-info">
        <span>
          Every staff action is written to a tamper-evident audit log. Super admins can see every staff member's actions, and the people you act on
          see staff actions on their own account activity page.
        </span>
      </div>
      <Loaded state={state}>
        {(list) =>
          list.length === 0 ? (
            <Empty title="Nothing yet" />
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>When</th>
                    <th>Action</th>
                    <th>About</th>
                    <th>Reason</th>
                    <th>Details</th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((e) => {
                    const details = detailText(e.details);
                    return (
                      <tr key={e.id}>
                        <td className="nowrap small" title={new Date(e.createdAt).toLocaleString()}>
                          {timeAgo(e.createdAt)}
                        </td>
                        <td>
                          <strong className="small">{staffLabel(e.action)}</strong>
                          {e.onBehalfOf && (
                            <>
                              {" "}
                              <Pill value="IN_PROGRESS" label="On behalf of user" />
                            </>
                          )}
                          {e.approvalId && <div className="muted small">Via approval request</div>}
                        </td>
                        <td className="small">
                          {e.subjectUserId ? (
                            <Link to={`/admin/workers/${e.subjectUserId}`} title="Opens the worker file (households open as not found)">
                              {staffLabel(e.entity)}
                            </Link>
                          ) : (
                            <span className="muted">{staffLabel(e.entity)}</span>
                          )}
                        </td>
                        <td className="small">{e.reason ?? <span className="muted">-</span>}</td>
                        <td className="small muted">{details ?? "-"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )
        }
      </Loaded>
    </div>
  );
}
