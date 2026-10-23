import { useState } from "react";
import { Link } from "react-router-dom";
import { api, qs } from "../../api";
import { staffLabel, type AdminUser } from "./adminTypes";
import { Empty, formatDate, Loaded, PageHeader, Pill, Tabs, useLoad } from "../../ui";

type Tab = "PENDING" | "IN_PROGRESS" | "VERIFIED" | "FAILED";

export default function AdminVerification() {
  const [tab, setTab] = useState<Tab>("PENDING");
  const state = useLoad(() => api.get<AdminUser[]>(`/admin/users${qs({ role: "WORKER", verification: tab })}`), [tab]);
  return (
    <div className="stack">
      <PageHeader
        title="Police verification"
        subtitle="Confirm identity first (see the original CNIC and hand it back, keep a signed copy, or run a NADRA Verisys check), then record the police check on the worker's page."
      />
      <div className="callout callout-info">
        <span>
          Marking a worker <strong>In progress</strong> is recorded straight away. A final <strong>Verified</strong> or <strong>Failed</strong>{" "}
          decision is sent for a second staff member's approval. Police checks are valid for 12 months.
        </span>
      </div>
      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { value: "PENDING", label: "Requested" },
          { value: "IN_PROGRESS", label: "In progress" },
          { value: "VERIFIED", label: "Verified" },
          { value: "FAILED", label: "Failed" },
        ]}
      />
      <Loaded state={state}>
        {(list) =>
          list.length === 0 ? (
            <Empty title="Nobody here" />
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Worker</th>
                    <th>Phone</th>
                    <th>CNIC</th>
                    <th>Identity check</th>
                    <th>Work</th>
                    <th>Status</th>
                    <th>{tab === "VERIFIED" ? "Expires" : "Updated"}</th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((u) => {
                    const p = u.workerProfile;
                    const expires = p?.verificationExpiresAt;
                    const expiringSoon = !!expires && new Date(expires).getTime() - Date.now() < 30 * 86400_000;
                    return (
                      <tr key={u.id}>
                        <td>
                          <Link to={`/admin/workers/${u.id}`}>
                            <strong>{u.name}</strong>
                          </Link>
                          {p?.assisted && <div className="muted small">Assisted</div>}
                        </td>
                        <td className="nowrap mono masked">{u.phone}</td>
                        <td className="nowrap mono masked">{p?.cnicNumber ?? <span className="muted">Not given</span>}</td>
                        <td className="small">
                          {p?.identityCheckMethod && p.identityCheckMethod !== "NONE" ? (
                            <>
                              {staffLabel(p.identityCheckMethod)}
                              {p.identityCheckedAt && <div className="muted">{formatDate(p.identityCheckedAt)}</div>}
                            </>
                          ) : (
                            <span className="muted">Not checked</span>
                          )}
                          {u.cnicInCustody && <div className="muted">Original held by team</div>}
                        </td>
                        <td>{p?.skills.map(staffLabel).join(", ")}</td>
                        <td>
                          <Pill value={p?.verificationStatus ?? "NONE"} label={staffLabel(p?.verificationStatus ?? "NONE")} />
                          {p?.badgeSuspended && (
                            <>
                              {" "}
                              <Pill value="SUSPENDED" label="Badge suspended" />
                            </>
                          )}
                        </td>
                        <td className="nowrap muted">
                          {tab === "VERIFIED" ? (
                            expires ? (
                              <span style={expiringSoon ? { color: "var(--danger)" } : undefined}>{formatDate(expires)}</span>
                            ) : (
                              "-"
                            )
                          ) : (
                            p && formatDate(p.updatedAt)
                          )}
                        </td>
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
