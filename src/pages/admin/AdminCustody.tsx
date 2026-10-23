import { useState } from "react";
import { Link } from "react-router-dom";
import { api, qs } from "../../api";
import { CUSTODY_RETURN_HOURS, type Custody } from "./adminTypes";
import { Empty, formatDate, Loaded, PageHeader, Pill, Tabs, timeAgo, useLoad } from "../../ui";

export default function AdminCustody() {
  const [tab, setTab] = useState<"IN_CUSTODY" | "RETURNED">("IN_CUSTODY");
  const state = useLoad(() => api.get<Custody[]>(`/admin/custody${qs({ status: tab })}`), [tab]);
  const overdue = (state.data ?? []).filter((c) => c.returnOverdue).length;
  return (
    <div className="stack">
      <PageHeader
        title="CNIC custody register"
        subtitle="Every original CNIC the team holds. Log new cards and returns from the worker's page."
        action={
          <button className="btn btn-ghost btn-sm" onClick={() => window.print()}>
            Print register
          </button>
        }
      />
      <div className="callout callout-warn">
        <span>
          <strong>Holding original CNICs is voluntary and discouraged.</strong> The recommended way to confirm identity is an identity check on the
          worker's page (see the card and hand it back, keep a signed copy, or run NADRA Verisys). Only keep an original when the worker freely asks
          us to, with recorded consent. The card always belongs to the worker: if they ask for it back, it must be returned within{" "}
          {CUSTODY_RETURN_HOURS} hours.
        </span>
      </div>
      {tab === "IN_CUSTODY" && overdue > 0 && (
        <div className="callout callout-error">
          <span>
            {overdue} card(s) are overdue: the worker asked for them back more than {CUSTODY_RETURN_HOURS} hours ago. Return them today and record it
            on the worker's page.
          </span>
        </div>
      )}
      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { value: "IN_CUSTODY", label: "Currently held" },
          { value: "RETURNED", label: "Returned" },
        ]}
      />
      <Loaded state={state}>
        {(list) =>
          list.length === 0 ? (
            <Empty title="No records">{tab === "IN_CUSTODY" ? "The team holds no original CNICs." : undefined}</Empty>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Worker</th>
                    <th>CNIC</th>
                    <th>Stored at</th>
                    <th>Consent</th>
                    <th>Received</th>
                    <th>Return requested</th>
                    <th>Returned</th>
                    <th>Logged by</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((c) => (
                    <tr key={c.id}>
                      <td>
                        <Link to={`/admin/workers/${c.workerId}`}>{c.worker?.name ?? "Worker"}</Link>
                      </td>
                      <td className="nowrap mono masked">{c.cnicNumber}</td>
                      <td>
                        {c.storageLocation ?? "-"}
                        {c.notes && <div className="muted small">{c.notes}</div>}
                      </td>
                      <td className="small">{c.consentNote ?? <span className="muted">Not recorded</span>}</td>
                      <td className="nowrap">{formatDate(c.receivedAt)}</td>
                      <td className="nowrap">
                        {c.returnRequestedAt ? (
                          <span title={new Date(c.returnRequestedAt).toLocaleString()}>
                            {formatDate(c.returnRequestedAt)}
                            {c.status === "IN_CUSTODY" && <div className="muted small">{timeAgo(c.returnRequestedAt)}</div>}
                          </span>
                        ) : (
                          "-"
                        )}
                      </td>
                      <td className="nowrap">{c.returnedAt ? formatDate(c.returnedAt) : "-"}</td>
                      <td>{c.handledBy?.name}</td>
                      <td className="nowrap">
                        <Pill value={c.status} label={c.status === "IN_CUSTODY" ? "Held" : "Returned"} />
                        {c.returnOverdue ? (
                          <>
                            {" "}
                            <Pill value="FAILED" label="Return overdue" />
                          </>
                        ) : (
                          c.status === "IN_CUSTODY" &&
                          c.returnRequestedAt && (
                            <>
                              {" "}
                              <Pill value="HIGH" label="Return requested" />
                            </>
                          )
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        }
      </Loaded>
    </div>
  );
}
