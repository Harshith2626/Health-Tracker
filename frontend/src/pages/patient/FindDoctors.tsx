import { FormEvent, useEffect, useState } from "react";
import { format } from "date-fns";
import { Search, MapPin, Stethoscope, Award, Calendar } from "lucide-react";
import { api } from "../../api/client";
import { Card, EmptyState, Spinner } from "../../components/UI";
import { Doctor, AppointmentSlot } from "../../types";
import { Modal } from "./Vault";

export default function FindDoctors() {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [specialization, setSpecialization] = useState("");
  const [location, setLocation] = useState("");
  const [bookingDoctor, setBookingDoctor] = useState<Doctor | null>(null);

  function load() {
    return api
      .get("/doctors", { params: { name: name || undefined, specialization: specialization || undefined, location: location || undefined } })
      .then((res) => setDoctors(res.data.doctors));
  }

  useEffect(() => {
    setLoading(true);
    load().finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const t = setTimeout(() => load(), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name, specialization, location]);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-mono uppercase tracking-wider text-vault-primary mb-1">Doctor Discovery</p>
        <h1 className="text-2xl font-display font-semibold">Find a doctor</h1>
      </div>

      <div className="grid sm:grid-cols-3 gap-3">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-vault-muted" />
          <input className="input pl-9" placeholder="Doctor name" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="relative">
          <Stethoscope className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-vault-muted" />
          <input className="input pl-9" placeholder="Specialization" value={specialization} onChange={(e) => setSpecialization(e.target.value)} />
        </div>
        <div className="relative">
          <MapPin className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-vault-muted" />
          <input className="input pl-9" placeholder="Location" value={location} onChange={(e) => setLocation(e.target.value)} />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Spinner className="w-7 h-7" /></div>
      ) : doctors.length === 0 ? (
        <Card><EmptyState icon={<Stethoscope className="w-8 h-8" />} title="No doctors found" description="Try a different name, specialization, or location." /></Card>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {doctors.map((d) => (
            <Card key={d.id} className="flex flex-col">
              <div className="flex items-start gap-3 mb-3">
                <div className="w-11 h-11 rounded-full bg-vault-primaryLight flex items-center justify-center text-vault-primary font-semibold shrink-0">
                  {d.name[0]}
                </div>
                <div className="min-w-0">
                  <p className="font-medium">{d.name}</p>
                  <p className="text-xs text-vault-muted">{d.specialization}</p>
                </div>
              </div>
              <div className="space-y-1.5 text-xs text-vault-muted mb-3">
                {d.qualification && <p className="flex items-center gap-1.5"><Award className="w-3.5 h-3.5" /> {d.qualification} {d.experienceYears ? `· ${d.experienceYears} yrs experience` : ""}</p>}
                {(d.clinicName || d.location) && <p className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" /> {[d.clinicName, d.location].filter(Boolean).join(", ")}</p>}
                {d.consultationFee != null && <p>Consultation fee: ₹{d.consultationFee}</p>}
              </div>
              {d.biography && <p className="text-xs text-vault-muted mb-3 line-clamp-2">{d.biography}</p>}
              <button onClick={() => setBookingDoctor(d)} className="btn-primary mt-auto text-sm flex items-center justify-center gap-2">
                <Calendar className="w-4 h-4" /> View slots & book
              </button>
            </Card>
          ))}
        </div>
      )}

      {bookingDoctor && <BookingModal doctor={bookingDoctor} onClose={() => setBookingDoctor(null)} />}
    </div>
  );
}

function BookingModal({ doctor, onClose }: { doctor: Doctor; onClose: () => void }) {
  const [slots, setSlots] = useState<AppointmentSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<AppointmentSlot | null>(null);
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    api.get(`/appointments/slots/${doctor.id}`).then((res) => setSlots(res.data.slots)).finally(() => setLoading(false));
  }, [doctor.id]);

  async function handleBook(e: FormEvent) {
    e.preventDefault();
    if (!selected) return;
    setSaving(true);
    setError("");
    try {
      await api.post("/appointments", { doctorId: doctor.id, slotId: selected.id, reasonForVisit: reason });
      setDone(true);
    } catch (err: any) {
      setError(err.response?.data?.error || "Couldn't request this appointment.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={`Book with ${doctor.name}`} onClose={onClose}>
      {done ? (
        <div className="text-center py-6">
          <p className="font-medium mb-1">Appointment requested</p>
          <p className="text-sm text-vault-muted mb-4">Dr. {doctor.name} will review your request. You'll be notified once it's confirmed.</p>
          <button onClick={onClose} className="btn-primary">Done</button>
        </div>
      ) : loading ? (
        <div className="flex justify-center py-10"><Spinner className="w-6 h-6" /></div>
      ) : slots.length === 0 ? (
        <EmptyState title="No open slots" description="This doctor has no available slots right now. Please check back later." />
      ) : (
        <form onSubmit={handleBook} className="space-y-4">
          <div>
            <label className="label">Available slots</label>
            <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
              {slots.map((s) => (
                <button
                  type="button"
                  key={s.id}
                  onClick={() => setSelected(s)}
                  className={`text-xs px-3 py-2.5 rounded-lg border text-left transition-colors ${
                    selected?.id === s.id ? "border-vault-primary bg-vault-primaryLight text-vault-primary" : "border-vault-line hover:bg-vault-bg"
                  }`}
                >
                  <p className="font-medium">{format(new Date(s.startTime), "MMM d")}</p>
                  <p>{format(new Date(s.startTime), "h:mm a")}</p>
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="label">Reason for visit (optional)</label>
            <textarea className="input" rows={2} value={reason} onChange={(e) => setReason(e.target.value)} />
          </div>
          {error && <p className="text-sm text-vault-coral">{error}</p>}
          <button type="submit" disabled={!selected || saving} className="btn-primary w-full">
            {saving ? "Requesting..." : "Request appointment"}
          </button>
        </form>
      )}
    </Modal>
  );
}
