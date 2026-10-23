import { useState } from "react";
import { api } from "../api";
import { useAuth } from "../auth";
import { Field, humanize, Modal, Select, useAction } from "../ui";

const SEVERITY_HELP: Record<string, string> = {
  LOW: "Minor issue, e.g. lateness",
  MEDIUM: "Repeated problems, unannounced absence",
  HIGH: "Serious misconduct, rudeness to family",
  CRITICAL: "Theft, abuse or danger to the family",
};

export default function ComplaintModal({
  workerId,
  workerName,
  engagementId,
  onClose,
  onFiled,
}: {
  workerId: string;
  workerName: string;
  engagementId?: string;
  onClose: () => void;
  onFiled?: () => void;
}) {
  const { meta } = useAuth();
  const { busy, run } = useAction();
  const [category, setCategory] = useState("MISCONDUCT");
  const [severity, setSeverity] = useState("MEDIUM");
  const [description, setDescription] = useState("");

  return (
    <Modal title={`Report a problem with ${workerName}`} onClose={onClose}>
      <form
        className="form"
        onSubmit={async (e) => {
          e.preventDefault();
          const r = await run(
            () => api.post("/complaints", { workerId, engagementId, category, severity, description }),
            "Complaint filed. Our team will review it and contact you.",
          );
          if (r) {
            onFiled?.();
            onClose();
          }
        }}
      >
        <p className="small muted">
          Our team reviews every complaint and hears the worker's side. If it is upheld, the worker can lose their Verified
          badge, be suspended or banned. For crimes, please also inform the police (Pakistan emergency 15).
        </p>
        <div className="grid-2">
          <Field label="What happened?">
            <Select value={category} onChange={setCategory} options={meta?.complaintCategories ?? []} />
          </Field>
          <Field label="How serious?" hint={SEVERITY_HELP[severity]}>
            <Select value={severity} onChange={setSeverity} options={meta?.severities ?? []} labelFn={humanize} />
          </Field>
        </div>
        <Field label="Describe the problem" hint="Dates, what was seen, any evidence (FIR number, etc.)">
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} minLength={10} required />
        </Field>
        <button className="btn btn-danger btn-block" disabled={busy}>
          Submit complaint
        </button>
      </form>
    </Modal>
  );
}
