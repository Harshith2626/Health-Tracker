import { FormEvent, useEffect, useState } from "react";
import { format } from "date-fns";
import { Plus, Pill, Trash2 } from "lucide-react";
import { api } from "../../api/client";
import { Card, EmptyState, Spinner } from "../../components/UI";
import { Prescription, Patient } from "../../types";
import { Modal } from "../patient/Vault";

interface MedRow { name: string; dosage: string; frequency: string; duration: string; instructions: string }

export default function DoctorPrescriptions() {
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);

  function load() {
    return Promise.all([
      api.get("/prescriptions/issued"),
      api.get("/appointments/me"),
    ]).then(([pr, ap]) => {
      setPrescriptions(pr.data.prescriptions);
      const uniq = new Map<string, Patient>();
      ap.data.appointments.forEach((a: any) => { if (a.patient) uniq.set(a.patientId, a.patient); });
      setPatients(Array.from(uniq.values()));
    });
  }

  useEffect(() => {
    setLoading(true);
    load().finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-mono uppercase tracking-wider text-vault-primary mb-1">Digital Prescription</p>
          <h1 className="text-2xl font-display font-semibold">Prescriptions</h1>
        </div>
        <button onClick={() => setShowNew(true)} className="btn-primary flex items-center gap-2 text-sm">
          <Plus className="w-4 h-4" /> New prescription
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Spinner className="w-7 h-7" /></div>
      ) : prescriptions.length === 0 ? (
        <Card><EmptyState icon={<Pill className="w-8 h-8" />} title="No prescriptions issued" description="Prescriptions you issue after a consultation will appear here." /></Card>
      ) : (
        <div className="space-y-4">
          {prescriptions.map((p) => (
            <Card key={p.id}>
              <div className="flex items-center justify-between mb-2">
                <p className="font-medium text-sm">{p.patient?.name}</p>
                <p className="text-xs text-vault-muted">{format(new Date(p.issuedAt), "MMM d, yyyy")}</p>
              </div>
              {p.diagnosis && <p className="text-sm mb-2"><span className="text-vault-muted">Diagnosis: </span>{p.diagnosis}</p>}
              <p className="text-xs text-vault-muted">{p.medicines.map((m) => m.name).join(", ")}</p>
            </Card>
          ))}
        </div>
      )}

      {showNew && <NewPrescriptionModal patients={patients} onClose={() => setShowNew(false)} onSaved={() => { setShowNew(false); load(); }} />}
    </div>
  );
}

function NewPrescriptionModal({ patients, onClose, onSaved }: { patients: Patient[]; onClose: () => void; onSaved: () => void }) {
  const [patientId, setPatientId] = useState(patients[0]?.id || "");
  const [diagnosis, setDiagnosis] = useState("");
  const [notes, setNotes] = useState("");
  const [medicines, setMedicines] = useState<MedRow[]>([{ name: "", dosage: "", frequency: "", duration: "", instructions: "" }]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function updateMed(i: number, field: keyof MedRow, value: string) {
    setMedicines((meds) => meds.map((m, idx) => (idx === i ? { ...m, [field]: value } : m)));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!patientId) { setError("Select a patient"); return; }
    setSaving(true);
    setError("");
    try {
      await api.post("/prescriptions", {
        patientId, diagnosis, notes,
        medicines: medicines.filter((m) => m.name.trim()),
      });
      onSaved();
    } catch (err: any) {
      setError(err.response?.data?.error || "Couldn't create this prescription. Make sure you have access to this patient's records.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title="New prescription" onClose={onClose} wide>
      {patients.length === 0 ? (
        <p className="text-sm text-vault-muted">You don't have any patients yet. Patients appear here once you've had an appointment with them.</p>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="label">Patient</label>
            <select className="input" value={patientId} onChange={(e) => setPatientId(e.target.value)}>
              {patients.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Diagnosis / consultation notes</label>
            <input className="input" value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)} />
          </div>

          <div>
            <label className="label">Medicines</label>
            <div className="space-y-2">
              {medicines.map((m, i) => (
                <div key={i} className="grid grid-cols-12 gap-1.5 items-center">
                  <input className="input col-span-3 text-xs" placeholder="Name" value={m.name} onChange={(e) => updateMed(i, "name", e.target.value)} />
                  <input className="input col-span-2 text-xs" placeholder="Dosage" value={m.dosage} onChange={(e) => updateMed(i, "dosage", e.target.value)} />
                  <input className="input col-span-2 text-xs" placeholder="Frequency" value={m.frequency} onChange={(e) => updateMed(i, "frequency", e.target.value)} />
                  <input className="input col-span-2 text-xs" placeholder="Duration" value={m.duration} onChange={(e) => updateMed(i, "duration", e.target.value)} />
                  <input className="input col-span-2 text-xs" placeholder="Instructions" value={m.instructions} onChange={(e) => updateMed(i, "instructions", e.target.value)} />
                  <button type="button" onClick={() => setMedicines((meds) => meds.filter((_, idx) => idx !== i))} className="col-span-1 text-vault-muted hover:text-vault-coral">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
            <button type="button" onClick={() => setMedicines((meds) => [...meds, { name: "", dosage: "", frequency: "", duration: "", instructions: "" }])} className="btn-ghost text-xs mt-2 px-0">
              + Add medicine
            </button>
          </div>

          <div>
            <label className="label">Additional notes</label>
            <textarea className="input" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>

          {error && <p className="text-sm text-vault-coral">{error}</p>}
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1">{saving ? "Saving..." : "Issue prescription"}</button>
          </div>
        </form>
      )}
    </Modal>
  );
}
