import { Link } from "react-router-dom";
import { api } from "../../api";
import type { Complaint } from "../../types";
import { Empty, formatDate, humanize, Loaded, PageHeader, Pill, useLoad } from "../../ui";

export default function HouseholdComplaints() {
  const state = useLoad(() => api.get<Complaint[]>("/complaints"));
  return (
    <div>
      <PageHeader title="Complaints" subtitle="Problems you reported. Our team reviews each one and hears the worker's side." />
      <Loaded state={state}>
        {(list) =>
          list.length === 0 ? (
            <Empty title="No complaints">
              To report a problem, open <Link to="/household/hires">My hires</Link> and choose "Report a problem".
            </Empty>
          ) : (
            <div className="stack">
              {list.map((c) => (
                <div key={c.id} className="card stack-sm">
                  <div className="row-between">
                    <strong>
                      {c.worker?.name} · {humanize(c.category)}
                    </strong>
                    <div className="row">
                      <Pill value={c.severity} />
                      <Pill value={c.status} />
                    </div>
                  </div>
                  <p>{c.description}</p>
                  <span className="muted small">Filed {formatDate(c.createdAt)}</span>
                  {c.resolution && (
                    <div className={`callout ${c.status === "UPHELD" ? "callout-ok" : "callout-info"}`}>
                      <span>
                        <strong>Decision:</strong> {c.resolution}
                      </span>
                    </div>
                  )}
                  {c.penalties && c.penalties.length > 0 && (
                    <div className="row small">
                      Action taken: {c.penalties.map((p) => <Pill key={p.id} value={p.type} />)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )
        }
      </Loaded>
    </div>
  );
}
