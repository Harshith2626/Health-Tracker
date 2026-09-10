import { FormEvent, useEffect, useState } from "react";
import { format } from "date-fns";
import { Link } from "react-router-dom";
import { Plus, Check, X, CalendarCheck } from "lucide-react";
import { api } from "../../api/client";
import { Card, EmptyState, SectionHeading, Spinner, StatusBadge } from "../../components/UI";
import { Appointment } from "../../types";
import { Modal } from "../patient/Vault";

export default function DoctorAppointments() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSlots, setShowSlots] = useState(false);

  function load() {
    return api.get("/appointments/me").then((res) => setAppointments(res.data.appointments));
  }

  useEffect(() => {
    setLoading(true);
    load().finally(() => setLoading(false));
  }, []);

  async function updateStatus(id: string, status: string) {
    await api.patch(`/appointments/${id}/status`, { status });
    load();
  }

  const pending = appointments.filter((a) => a.status === "PENDING");
  const others = appointments.filter((a) => a.status !== "PENDING");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-mono uppercase tracking-wider text-vault-primary mb-1">Requests + Approval</p>
          <h1 className="text-2xl font-display font-semibold">Appointments</h1>
        </div>
        <button onClick={() => setShowSlots(true)} className="btn-primary flex items-center gap-2 text-sm">
          <Plus className="w-4 h-4" /> Add slots
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Spinner className="w-7 h-7" /></div>
      ) : appointments.length === 0 ? (
        <Card><EmptyState icon={<CalendarCheck className="w-8 h-8" />} title="No appointments yet" description="Add available slots so patients can request appointments with you." /></Card>
      ) : (
        <>
          {pending.length > 0 && (
            <Card>
              <SectionHeading title="Pending requests" />
              <div className="space-y-3">
                {pending.map((a) => (
                  <div key={a.id} className="flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <Link to={`/doctor/patient/${a.patientId}`} className="font-medium text-sm hover:text-vault-primary transition-colors">{a.patient?.name}</Link>
                      <p className="text-xs text-vault-muted">{a.slot ? format(new Date(a.slot.startTime), "EEE, MMM d · h:mm a") : "—"}</p>
                      {a.reasonForVisit && <p className="text-xs text-vault-muted">Reason: {a.reasonForVisit}</p>}
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => updateStatus(a.id, "CONFIRMED")} className="w-8 h-8 rounded-lg bg-vault-primaryLight text-vault-primary flex items-center justify-center hover:bg-vault-primary hover:text-white transition-colors">
                        <Check className="w-4 h-4" />
                      </button>
                      <button onClick={() => updateStatus(a.id, "REJECTED")} className="w-8 h-8 rounded-lg bg-vault-coralLight text-vault-coral flex items-center justify-center hover:bg-vault-coral hover:text-white transition-colors">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          <Card>
            <SectionHeading title="All appointments" />
            <div className="space-y-3">
              {others.map((a) => (
                <div key={a.id} className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <Link to={`/doctor/patient/${a.patientId}`} className="font-medium text-sm hover:text-vault-primary transition-colors">{a.patient?.name}</Link>
                    <p className="text-xs text-vault-muted">{a.slot ? format(new Date(a.slot.startTime), "EEE, MMM d · h:mm a") : "—"}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={a.status} />
                    {a.status === "CONFIRMED" && (
                      <>
                        <button onClick={() => updateStatus(a.id, "COMPLETED")} className="text-xs text-vault-primary font-medium">Mark completed</button>
                        <button onClick={() => updateStatus(a.id, "NO_SHOW")} className="text-xs text-vault-coral font-medium">No-show</button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </>
      )}

      {showSlots && <AddSlotsModal onClose={() => setShowSlots(false)} />}
    </div>
  );
}

function AddSlotsModal({ onClose }: { onClose: () => void }) {
  const [date, setDate] = useState("");
  const [times, setTimes] = useState("09:00,09:30,10:00,10:30,11:00");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const slots = times.split(",").map((t) => t.trim()).filter(Boolean).map((t) => {
        const [h, m] = t.split(":").map(Number);
        const start = new Date(date);
        start.setHours(h, m, 0, 0);
        const end = new Date(start.getTime() + 30 * 60 * 1000);
        return { startTime: start.toISOString(), endTime: end.toISOString() };
      });
      await api.post("/appointments/slots", { slots });
      setDone(true);
    } catch (err: any) {
      setError(err.response?.data?.error || "Couldn't create slots.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title="Add available slots" onClose={onClose}>
      {done ? (
        <div className="text-center py-6">
          <p className="font-medium mb-4">Slots added</p>
          <button onClick={onClose} className="btn-primary">Done</button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="label">Date</label>
            <input type="date" required className="input" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div>
            <label className="label">Times (comma-separated, 24h)</label>
            <input className="input" value={times} onChange={(e) => setTimes(e.target.value)} placeholder="09:00,09:30,10:00" />
            <p className="text-xs text-vault-muted mt-1">Each slot is 30 minutes long.</p>
          </div>
          {error && <p className="text-sm text-vault-coral">{error}</p>}
          <button type="submit" disabled={saving} className="btn-primary w-full">{saving ? "Adding..." : "Add slots"}</button>
        </form>
      )}
    </Modal>
  );
}
