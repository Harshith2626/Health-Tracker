import { useEffect, useState } from "react";
import { format } from "date-fns";
import { CalendarCheck, X } from "lucide-react";
import { api } from "../../api/client";
import { Card, EmptyState, Spinner, StatusBadge } from "../../components/UI";
import { Appointment } from "../../types";

export default function PatientAppointments() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  function load() {
    return api.get("/appointments/me").then((res) => setAppointments(res.data.appointments));
  }

  useEffect(() => {
    setLoading(true);
    load().finally(() => setLoading(false));
  }, []);

  async function cancel(id: string) {
    if (!confirm("Cancel this appointment?")) return;
    await api.patch(`/appointments/${id}/status`, { status: "CANCELLED" });
    load();
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-mono uppercase tracking-wider text-vault-primary mb-1">Patient Convenience + Doctor Approval</p>
        <h1 className="text-2xl font-display font-semibold">Appointments</h1>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Spinner className="w-7 h-7" /></div>
      ) : appointments.length === 0 ? (
        <Card><EmptyState icon={<CalendarCheck className="w-8 h-8" />} title="No appointments yet" description="Find a doctor and request an appointment to get started." /></Card>
      ) : (
        <div className="space-y-3">
          {appointments.map((a) => (
            <Card key={a.id} className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <p className="font-medium text-sm">{a.doctor?.name}</p>
                <p className="text-xs text-vault-muted">{a.doctor?.specialization}</p>
                {a.slot && <p className="text-xs text-vault-muted mt-1">{format(new Date(a.slot.startTime), "EEE, MMM d · h:mm a")}</p>}
                {a.reasonForVisit && <p className="text-xs text-vault-muted mt-1">Reason: {a.reasonForVisit}</p>}
              </div>
              <div className="flex items-center gap-3">
                <StatusBadge status={a.status} />
                {["PENDING", "CONFIRMED"].includes(a.status) && (
                  <button onClick={() => cancel(a.id)} className="text-vault-muted hover:text-vault-coral transition-colors" title="Cancel">
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
