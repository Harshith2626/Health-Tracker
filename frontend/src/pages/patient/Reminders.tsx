import { FormEvent, useEffect, useState } from "react";
import { format } from "date-fns";
import { Plus, BellRing, Check, Trash2 } from "lucide-react";
import { api } from "../../api/client";
import { Card, EmptyState, Spinner } from "../../components/UI";
import { Reminder, ReminderType } from "../../types";
import { Modal } from "./Vault";

const TYPES: { value: ReminderType; label: string }[] = [
  { value: "MEDICINE", label: "Medicine" },
  { value: "APPOINTMENT", label: "Appointment" },
  { value: "LAB", label: "Laboratory" },
  { value: "HOSPITAL", label: "Hospital" },
  { value: "FOLLOW_UP", label: "Follow-up" },
];

export default function Reminders() {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);

  function load() {
    return api.get("/reminders").then((res) => setReminders(res.data.reminders));
  }

  useEffect(() => {
    setLoading(true);
    load().finally(() => setLoading(false));
  }, []);

  async function toggleDone(r: Reminder) {
    await api.patch(`/reminders/${r.id}`, { isDone: !r.isDone });
    load();
  }

  async function remove(id: string) {
    await api.delete(`/reminders/${id}`);
    load();
  }

  const pending = reminders.filter((r) => !r.isDone);
  const done = reminders.filter((r) => r.isDone);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-mono uppercase tracking-wider text-vault-primary mb-1">Your Health Partner</p>
          <h1 className="text-2xl font-display font-semibold">Reminders</h1>
        </div>
        <button onClick={() => setShowAdd(true)} className="btn-primary flex items-center gap-2 text-sm">
          <Plus className="w-4 h-4" /> New reminder
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Spinner className="w-7 h-7" /></div>
      ) : reminders.length === 0 ? (
        <Card><EmptyState icon={<BellRing className="w-8 h-8" />} title="No reminders set" description="Add medicine, appointment, lab, or follow-up reminders so nothing slips through." /></Card>
      ) : (
        <div className="space-y-6">
          {pending.length > 0 && (
            <div className="space-y-3">
              {pending.map((r) => <ReminderRow key={r.id} r={r} onToggle={toggleDone} onDelete={remove} />)}
            </div>
          )}
          {done.length > 0 && (
            <div>
              <p className="text-xs font-medium text-vault-muted mb-2 uppercase tracking-wide">Completed</p>
              <div className="space-y-3 opacity-60">
                {done.map((r) => <ReminderRow key={r.id} r={r} onToggle={toggleDone} onDelete={remove} />)}
              </div>
            </div>
          )}
        </div>
      )}

      {showAdd && <AddReminderModal onClose={() => setShowAdd(false)} onAdded={() => { setShowAdd(false); load(); }} />}
    </div>
  );
}

function ReminderRow({ r, onToggle, onDelete }: { r: Reminder; onToggle: (r: Reminder) => void; onDelete: (id: string) => void }) {
  return (
    <Card className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <button onClick={() => onToggle(r)} className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${r.isDone ? "bg-vault-primary border-vault-primary text-white" : "border-vault-line"}`}>
          {r.isDone && <Check className="w-3.5 h-3.5" />}
        </button>
        <div>
          <p className={`text-sm font-medium ${r.isDone ? "line-through" : ""}`}>{r.title}</p>
          <p className="text-xs text-vault-muted">{TYPES.find((t) => t.value === r.type)?.label} · {format(new Date(r.remindAt), "MMM d, h:mm a")}</p>
        </div>
      </div>
      <button onClick={() => onDelete(r.id)} className="text-vault-muted hover:text-vault-coral transition-colors">
        <Trash2 className="w-4 h-4" />
      </button>
    </Card>
  );
}

function AddReminderModal({ onClose, onAdded }: { onClose: () => void; onAdded: () => void }) {
  const [form, setForm] = useState({ type: "MEDICINE", title: "", notes: "", remindAt: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await api.post("/reminders", form);
      onAdded();
    } catch (err: any) {
      setError(err.response?.data?.error || "Couldn't create this reminder.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title="New reminder" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-3.5">
        <div>
          <label className="label">Type</label>
          <select className="input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
            {TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Title</label>
          <input required className="input" placeholder="e.g. Take metformin" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        </div>
        <div>
          <label className="label">Date & time</label>
          <input type="datetime-local" required className="input" value={form.remindAt} onChange={(e) => setForm({ ...form, remindAt: e.target.value })} />
        </div>
        <div>
          <label className="label">Notes</label>
          <textarea className="input" rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        </div>
        {error && <p className="text-sm text-vault-coral">{error}</p>}
        <div className="flex gap-2 pt-2">
          <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button type="submit" disabled={saving} className="btn-primary flex-1">{saving ? "Saving..." : "Add reminder"}</button>
        </div>
      </form>
    </Modal>
  );
}
