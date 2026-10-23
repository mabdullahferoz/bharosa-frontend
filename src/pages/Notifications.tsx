import { useNavigate } from "react-router-dom";
import { api } from "../api";
import { isUrdu, t } from "../i18n";
import { UR_NOTIF } from "../locales/ur";
import type { Notification } from "../types";
import { Empty, humanize, Loaded, PageHeader, rupees, timeAgo, useLoad } from "../ui";

/**
 * Notifications are stored in English with a template key + values (params).
 * In Urdu we rebuild the text from the key; user-written text (comments, reasons) stays as typed.
 */
function localized(n: Notification): { title: string; body: string | null } {
  if (!isUrdu() || !n.params) return { title: n.title, body: n.body };
  let p: Record<string, string | number | null>;
  try {
    p = JSON.parse(n.params);
  } catch {
    return { title: n.title, body: n.body };
  }
  const tpl = UR_NOTIF[String(p.key)];
  if (!tpl) return { title: n.title, body: n.body };
  const vals: Record<string, string> = {};
  for (const [k, v] of Object.entries(p)) {
    if (v === null || v === undefined) continue;
    vals[k] = k === "amount" ? rupees(Number(v)) : k === "period" ? humanize(String(v)) : String(v);
  }
  const fill = (s: string) => s.replace(/\{(\w+)\}/g, (_, k: string) => vals[k] ?? "");
  return { title: fill(tpl.title), body: tpl.body !== undefined ? fill(tpl.body) : n.body };
}

export default function Notifications() {
  const navigate = useNavigate();
  const state = useLoad(() => api.get<{ items: Notification[]; unread: number }>("/notifications"));

  const open = async (n: Notification) => {
    if (!n.readAt) await api.post(`/notifications/${n.id}/read`).catch(() => undefined);
    if (n.link) navigate(n.link);
    else void state.reload();
  };

  return (
    <div>
      <PageHeader
        title={t("Notifications")}
        action={
          <button className="btn btn-ghost btn-sm" onClick={() => api.post("/notifications/read-all").then(state.reload)}>
            {t("Mark all read")}
          </button>
        }
      />
      <Loaded state={state}>
        {({ items }) =>
          items.length === 0 ? (
            <Empty title={t("Nothing yet")}>{t("Offers, hires and updates from our team will show up here.")}</Empty>
          ) : (
            <div className="stack-sm">
              {items.map((n) => {
                const { title, body } = localized(n);
                return (
                  <button
                    key={n.id}
                    className="card card-link"
                    style={{
                      textAlign: "start",
                      font: "inherit",
                      cursor: "pointer",
                      borderInlineStart: n.readAt ? undefined : "4px solid var(--brand)",
                    }}
                    onClick={() => open(n)}
                  >
                    <div className="row-between">
                      <strong>{title}</strong>
                      <span className="muted small nowrap">{timeAgo(n.createdAt)}</span>
                    </div>
                    {body && (
                      <p className="muted small" dir="auto">
                        {body}
                      </p>
                    )}
                  </button>
                );
              })}
            </div>
          )
        }
      </Loaded>
    </div>
  );
}
