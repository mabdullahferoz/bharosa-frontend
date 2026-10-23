import { useState } from "react";
import { api } from "../../api";
import { Empty, Loaded, PageHeader, useLoad } from "../../ui";
import { formatDateTime, type OutboundSms } from "./superTypes";

const TONE: Record<string, string> = { SENT: "ok", FAILED: "danger", LOGGED: "neutral" };
const LABEL: Record<string, string> = { SENT: "Sent", FAILED: "Failed", LOGGED: "Logged only" };

type Filter = "ALL" | "FAILED";

export default function SuperMessages() {
  const msgs = useLoad(() => api.get<OutboundSms[]>("/super/messages"));
  const [filter, setFilter] = useState<Filter>("ALL");

  return (
    <div className="stack">
      <PageHeader
        title="SMS log"
        subtitle="The last 200 text messages the platform sent, including receipts that tell workers and families when staff acted for them."
        action={
          <button className="btn btn-ghost btn-sm" disabled={msgs.loading} onClick={() => void msgs.reload()}>
            Refresh
          </button>
        }
      />
      <div className="callout callout-info">
        <span>
          <strong>Logged only</strong> means the <span className="mono">console</span> provider is in use (development): the message was recorded here but no
          real SMS left the system. Configure a real SMS provider on the API server before going live.
        </span>
      </div>
      <div className="chips">
        {(["ALL", "FAILED"] as Filter[]).map((f) => (
          <button key={f} className="chip" aria-pressed={filter === f} onClick={() => setFilter(f)}>
            {f === "ALL" ? "All" : "Failed only"}
          </button>
        ))}
      </div>
      <Loaded state={msgs}>
        {(list) => {
          const shown = filter === "FAILED" ? list.filter((m) => m.status === "FAILED") : list;
          if (!shown.length) return <Empty title={filter === "FAILED" ? "No failed messages" : "No messages sent yet"} />;
          return (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>To</th>
                    <th>Status</th>
                    <th>Message</th>
                  </tr>
                </thead>
                <tbody>
                  {shown.map((m) => (
                    <tr key={m.id}>
                      <td className="nowrap small">{formatDateTime(m.createdAt)}</td>
                      <td className="nowrap mono">{m.to}</td>
                      <td>
                        <span className={`pill pill-${TONE[m.status] ?? "neutral"}`}>{LABEL[m.status] ?? m.status}</span>
                        <div className="muted small">
                          {m.channel} · {m.provider}
                        </div>
                      </td>
                      <td style={{ minWidth: 240 }}>
                        <div dir="auto" style={{ whiteSpace: "pre-wrap" }}>
                          {m.body}
                        </div>
                        {m.error && <div className="small" style={{ color: "var(--danger)", marginTop: 4 }}>Error: {m.error}</div>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        }}
      </Loaded>
    </div>
  );
}
