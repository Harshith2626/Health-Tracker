import { FormEvent, useEffect, useState } from "react";
import { format } from "date-fns";
import { Plus, GitBranch } from "lucide-react";
import { api } from "../../api/client";
import { Card, SectionHeading, EmptyState, Spinner } from "../../components/UI";
import { MedicalHistoryEvent, HistoryEventType } from "../../types";
import { Modal } from "./Vault";

const EVENT_TYPES: { value: HistoryEventType; label: string }[] = [
  { value: "CONSULTATION", label: "Consultation" },
  { value: "DIAGNOSIS", label: "Diagnosis" },
  { value: "LAB_TEST", label: "Laboratory Test" },
  { value: "HOSPITAL_VISIT", label: "Hospital Visit" },
  { value: "PRESCRIPTION", label: "Prescription" },
  { value: "PROCEDURE", label: "Procedure" },
  { value: "OTHER", label: "Other" },
];

export default function History() {
  const [events, setEvents] = useState<MedicalHistoryEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);

  function load() {
    return api.get("/history").then((res) => setEvents(res.data.events));
  }

  useEffect(() => {
    setLoading(true);
    load().finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-mono uppercase tracking-wider text-vault-primary mb-1">Continuous Medical History</p>
          <h1 className="text-2xl font-display font-semibold">Health Timeline</h1>
        </div>
        <button onClick={() => setShowAdd(true)} className="btn-primary flex items-center gap-2 text-sm">
          <Plus className="w-4 h-4" /> Add event
        </button>
      </div>

      <Card>
        {loading ? (
          <div className="flex justify-center py-16"><Spinner className="w-7 h-7" /></div>
        ) : events.length === 0 ? (
          <EmptyState icon={<GitBranch className="w-8 h-8" />} title="No history yet" description="Your healthcare events — consultations, tests, procedures — will appear here as a continuous timeline." />
        ) : (
          <div className="vault-thread space-y-7 pl-7 py-2">
            {events.map((e) => (
              <div key={e.id} className="vault-node">
                <p className="text-xs font-mono text-vault-muted mb-0.5">{format(new Date(e.eventDate), "MMM d, yyyy")}</p>
                <div className="flex items-center gap-2 mb-1">
                  <span className="badge bg-vault-primaryLight text-vault-primary text-[10px]">{EVENT_TYPES.find((t) => t.value === e.eventType)?.label}</span>
                  {e.doctor && <span className="text-xs text-vault-muted">Dr. {e.doctor.name}</span>}
                </div>
                <p className="font-medium text-sm">{e.title}</p>
                {e.description && <p className="text-sm text-vault-muted mt-0.5">{e.description}</p>}
              </div>
            ))}
          </div>
        )}
      </Card>

      {showAdd && <AddEventModal onClose={() => setShowAdd(false)} onAdded={() => { setShowAdd(false); load(); }} />}
    </div>
  );
}

function AddEventModal({ onClose, onAdded }: { onClose: () => void; onAdded: () => void }) {
  const [form, setForm] = useState({ eventType: "CONSULTATION", title: "", description: "", eventDate: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await api.post("/history", form);
      onAdded();
    } catch (err: any) {
      setError(err.response?.data?.error || "Couldn't add this event.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title="Add a health event" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-3.5">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Type</label>
            <select className="input" value={form.eventType} onChange={(e) => setForm({ ...form, eventType: e.target.value })}>
              {EVENT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Date</label>
            <input type="date" required className="input" value={form.eventDate} onChange={(e) => setForm({ ...form, eventDate: e.target.value })} />
          </div>
        </div>
        <div>
          <label className="label">Title</label>
          <input required className="input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        </div>
        <div>
          <label className="label">Notes</label>
          <textarea className="input" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </div>
        {error && <p className="text-sm text-vault-coral">{error}</p>}
        <div className="flex gap-2 pt-2">
          <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button type="submit" disabled={saving} className="btn-primary flex-1">{saving ? "Saving..." : "Add event"}</button>
        </div>
      </form>
    </Modal>
  );
}
