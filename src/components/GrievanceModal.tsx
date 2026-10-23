import { useState } from "react";
import { api } from "../api";
import { useAuth } from "../auth";
import { msg, t } from "../i18n";
import { Field, humanize, Modal, Select, useAction } from "../ui";

const SEVERITY_HELP: Record<string, string> = {
  LOW: msg("Small problem, e.g. late pay by a few days"),
  MEDIUM: msg("It keeps happening"),
  HIGH: msg("Serious: shouting, threats, wages not paid"),
  CRITICAL: msg("Danger: violence, sexual harassment, locked in"),
};

/** A worker reports a problem with a family they work or worked for. */
export default function GrievanceModal({
  engagementId,
  familyName,
  onClose,
  onFiled,
}: {
  engagementId: string;
  familyName: string;
  onClose: () => void;
  onFiled?: () => void;
}) {
  const { meta } = useAuth();
  const { busy, run } = useAction();
  const [category, setCategory] = useState("UNPAID_WAGES");
  const [severity, setSeverity] = useState("MEDIUM");
  const [description, setDescription] = useState("");

  return (
    <Modal title={t("Report a problem with {name}", { name: familyName })} onClose={onClose}>
      <form
        className="form"
        onSubmit={async (e) => {
          e.preventDefault();
          const r = await run(
            () => api.post("/grievances", { engagementId, category, severity, description }),
            t("Sent. Our team will call you."),
          );
          if (r) {
            onFiled?.();
            onClose();
          }
        }}
      >
        <p className="small muted">
          {t("This goes to the Bharosa team, not to the family. Our team reads every report and will contact you.")}
        </p>
        <div className="grid-2">
          <Field label={t("What is the problem?")}>
            <Select value={category} onChange={setCategory} options={meta?.grievanceCategories ?? []} labelFn={humanize} />
          </Field>
          <Field label={t("How serious?")} hint={SEVERITY_HELP[severity] ? t(SEVERITY_HELP[severity]) : undefined}>
            <Select value={severity} onChange={setSeverity} options={meta?.severities ?? []} labelFn={humanize} />
          </Field>
        </div>
        <Field label={t("Tell us what happened")} hint={t("When, what was said or done. At least 10 letters.")}>
          <textarea dir="auto" value={description} onChange={(e) => setDescription(e.target.value)} minLength={10} maxLength={3000} required />
        </Field>
        <div className="callout callout-warn small">
          <span>
            {t("In danger right now? Call the police: 15.")}
            {meta?.supportPhone && (
              <>
                {" "}
                {t("Bharosa helpline:")} <span className="ltr">{meta.supportPhone}</span>
              </>
            )}
          </span>
        </div>
        <button className="btn btn-danger btn-block" disabled={busy}>
          {t("Send to our team")}
        </button>
      </form>
    </Modal>
  );
}
