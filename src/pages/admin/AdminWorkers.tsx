import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, qs } from "../../api";
import { hasPerm, useAuth } from "../../auth";
import { staffLabel, type AdminUser } from "./adminTypes";
import { Empty, Loaded, PageHeader, Pill, Select, timeAgo, useLoad } from "../../ui";

export default function AdminWorkers() {
  const { user } = useAuth();
  const canSignup = hasPerm(user, "WORKERS_ASSIST");
  const [input, setInput] = useState("");
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [assisted, setAssisted] = useState(false);

  // Small debounce so typing doesn't fire a request per key.
  useEffect(() => {
    const t = setTimeout(() => setQ(input.trim()), 300);
    return () => clearTimeout(t);
  }, [input]);

  const state = useLoad(() => api.get<AdminUser[]>(`/admin/users${qs({ role: "WORKER", q, status, assisted: assisted ? 1 : undefined })}`), [q, status, assisted]);

  return (
    <div>
      <PageHeader
        title="Workers"
        subtitle="Open a worker's case file to check identity, verify, endorse, or act for them. Phone numbers and CNICs are masked."
        action={
          canSignup ? (
            <Link to="/admin/signup" className="btn btn-sm">
              Sign up a worker
            </Link>
          ) : (
            <span className="muted small">Signing up workers needs WORKERS_ASSIST permission</span>
          )
        }
      />
      <div className="filters">
        <input type="search" placeholder="Name or phone" value={input} onChange={(e) => setInput(e.target.value)} style={{ maxWidth: 260 }} />
        <Select value={status} onChange={setStatus} options={["ACTIVE", "SUSPENDED", "BANNED"]} placeholder="Any status" labelFn={staffLabel} />
        <label className="check">
          <input type="checkbox" checked={assisted} onChange={(e) => setAssisted(e.target.checked)} /> Assisted only (no smartphone)
        </label>
      </div>
      <Loaded state={state}>
        {(list) =>
          list.length === 0 ? (
            <Empty title="No workers found">{q || status || assisted ? "Try clearing the filters." : undefined}</Empty>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Phone</th>
                    <th>City</th>
                    <th>Work</th>
                    <th>Identity</th>
                    <th>Verification</th>
                    <th>CNIC held</th>
                    <th>Account</th>
                    <th>Last login</th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((u) => {
                    const p = u.workerProfile;
                    return (
                      <tr key={u.id}>
                        <td>
                          <Link to={`/admin/workers/${u.id}`}>
                            <strong>{u.name}</strong>
                          </Link>
                          {p?.assisted && (
                            <>
                              {" "}
                              <Pill value="IN_PROGRESS" label="Assisted" />
                            </>
                          )}
                        </td>
                        <td className="nowrap mono masked">{u.phone}</td>
                        <td>
                          {u.city}
                          {u.area && <div className="muted small">{u.area}</div>}
                        </td>
                        <td>{p?.skills.map(staffLabel).join(", ")}</td>
                        <td className="small">
                          {p?.identityCheckMethod && p.identityCheckMethod !== "NONE" ? staffLabel(p.identityCheckMethod) : <span className="muted">Not checked</span>}
                        </td>
                        <td>
                          <Pill value={p?.verificationStatus ?? "NONE"} label={staffLabel(p?.verificationStatus ?? "NONE")} />
                          {p?.badgeSuspended && (
                            <>
                              {" "}
                              <Pill value="SUSPENDED" label="Badge off" />
                            </>
                          )}
                        </td>
                        <td>{u.cnicInCustody ? <Pill value="IN_CUSTODY" label="Held" /> : <span className="muted">-</span>}</td>
                        <td>
                          <Pill value={u.status} label={staffLabel(u.status)} />
                        </td>
                        <td className="nowrap muted small">{u.lastLoginAt ? timeAgo(u.lastLoginAt) : "Never"}</td>
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
