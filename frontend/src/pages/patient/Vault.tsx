import { FormEvent, ReactNode, useEffect, useState } from "react";
import { Upload, FileText, Search, Trash2, Download, X, User, Sparkles } from "lucide-react";
import { format } from "date-fns";
import { api, fileUrl } from "../../api/client";
import { Card, SectionHeading, EmptyState, Spinner } from "../../components/UI";
import { MedicalRecord, RecordType, Patient } from "../../types";

const RECORD_TYPES: { value: RecordType; label: string }[] = [
  { value: "LAB_REPORT", label: "Lab Report" },
  { value: "BLOOD_TEST", label: "Blood Test" },
  { value: "SCAN", label: "Scan / Imaging" },
  { value: "PRESCRIPTION", label: "Prescription" },
  { value: "DISCHARGE_SUMMARY", label: "Discharge Summary" },
  { value: "HOSPITAL_RECORD", label: "Hospital Record" },
  { value: "CONSULTATION_REPORT", label: "Consultation Report" },
  { value: "OTHER", label: "Other" },
];

export default function Vault() {
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [patient, setPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [showUpload, setShowUpload] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [reminderRecord, setReminderRecord] = useState<MedicalRecord | null>(null);

  function load() {
    const params: Record<string, string> = {};
    if (q) params.q = q;
    if (typeFilter) params.type = typeFilter;
    return api.get("/records", { params }).then((res) => setRecords(res.data.records));
  }

  useEffect(() => {
    setLoading(true);
    Promise.all([load(), api.get("/patients/me").then((r) => setPatient(r.data.patient))]).finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const t = setTimeout(() => load(), 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, typeFilter]);

  async function handleDelete(id: string) {
    if (!confirm("Delete this record permanently?")) return;
    await api.delete(`/records/${id}`);
    load();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-mono uppercase tracking-wider text-vault-primary mb-1">Digital Medical Locker</p>
          <h1 className="text-2xl font-display font-semibold">My Health Vault</h1>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowProfile(true)} className="btn-secondary flex items-center gap-2 text-sm">
            <User className="w-4 h-4" /> Health Profile
          </button>
          <button onClick={() => setShowUpload(true)} className="btn-primary flex items-center gap-2 text-sm">
            <Upload className="w-4 h-4" /> Upload Record
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-vault-muted" />
          <input className="input pl-9" placeholder="Search records..." value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <select className="input w-auto" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
          <option value="">All types</option>
          {RECORD_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Spinner className="w-7 h-7" /></div>
      ) : records.length === 0 ? (
        <Card><EmptyState icon={<FileText className="w-8 h-8" />} title="Your vault is empty" description="Upload lab reports, scans, prescriptions, and other medical documents to keep everything in one place." /></Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {records.map((r) => (
            <Card key={r.id} className="flex flex-col">
              <div className="flex items-start justify-between mb-2">
                <span className="badge bg-vault-primaryLight text-vault-primary">{RECORD_TYPES.find((t) => t.value === r.recordType)?.label || r.recordType}</span>
                <button onClick={() => handleDelete(r.id)} className="text-vault-muted hover:text-vault-coral transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <p className="font-medium text-sm mb-1">{r.title}</p>
              <p className="text-xs text-vault-muted mb-3">{format(new Date(r.eventDate), "MMM d, yyyy")}{r.hospital ? ` · ${r.hospital}` : ""}</p>
              {r.description && <p className="text-xs text-vault-muted mb-3 line-clamp-2">{r.description}</p>}
              <div className="mt-auto flex items-center justify-between gap-2">
                {r.fileUrl ? (
                  <a href={fileUrl(r.fileUrl)} target="_blank" rel="noreferrer" className="text-xs font-medium text-vault-primary flex items-center gap-1 hover:underline">
                    <Download className="w-3.5 h-3.5" /> View document
                  </a>
                ) : <span />}
                <button onClick={() => setReminderRecord(r)} className="text-xs font-medium text-vault-coral flex items-center gap-1 hover:underline" title="Auto-generate reminders from this record using AI">
                  <Sparkles className="w-3.5 h-3.5" /> Reminders
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {showUpload && <UploadModal onClose={() => setShowUpload(false)} onUploaded={() => { setShowUpload(false); load(); }} />}
      {showProfile && patient && (
        <ProfileModal patient={patient} onClose={() => setShowProfile(false)} onSaved={(p) => { setPatient(p); setShowProfile(false); }} />
      )}
      {reminderRecord && <GenerateRemindersModal record={reminderRecord} onClose={() => setReminderRecord(null)} />}
    </div>
  );
}

function UploadModal({ onClose, onUploaded }: { onClose: () => void; onUploaded: () => void }) {
  const [form, setForm] = useState({ recordType: "LAB_REPORT", title: "", eventDate: "", hospital: "", doctorName: "", description: "" });
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));
      if (file) fd.append("file", file);
      await api.post("/records", fd, { headers: { "Content-Type": "multipart/form-data" } });
      onUploaded();
    } catch (err: any) {
      setError(err.response?.data?.error || "Couldn't upload this record.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title="Upload medical record" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-3.5">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Record type</label>
            <select className="input" value={form.recordType} onChange={(e) => setForm({ ...form, recordType: e.target.value })}>
              {RECORD_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Date</label>
            <input type="date" required className="input" value={form.eventDate} onChange={(e) => setForm({ ...form, eventDate: e.target.value })} />
          </div>
        </div>
        <div>
          <label className="label">Title</label>
          <input required className="input" placeholder="e.g. CBC Blood Test" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Hospital / Lab</label>
            <input className="input" value={form.hospital} onChange={(e) => setForm({ ...form, hospital: e.target.value })} />
          </div>
          <div>
            <label className="label">Doctor</label>
            <input className="input" value={form.doctorName} onChange={(e) => setForm({ ...form, doctorName: e.target.value })} />
          </div>
        </div>
        <div>
          <label className="label">Description</label>
          <textarea className="input" rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </div>
        <div>
          <label className="label">Document (PDF or image, up to 15MB)</label>
          <input type="file" accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx" className="text-sm" onChange={(e) => setFile(e.target.files?.[0] || null)} />
        </div>
        {error && <p className="text-sm text-vault-coral">{error}</p>}
        <div className="flex gap-2 pt-2">
          <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button type="submit" disabled={saving} className="btn-primary flex-1">{saving ? "Uploading..." : "Save record"}</button>
        </div>
      </form>
    </Modal>
  );
}

function ProfileModal({ patient, onClose, onSaved }: { patient: Patient; onClose: () => void; onSaved: (p: Patient) => void }) {
  const [form, setForm] = useState({
    name: patient.name || "", gender: patient.gender || "", bloodGroup: patient.bloodGroup || "",
    phone: patient.phone || "", address: patient.address || "", allergies: patient.allergies || "",
    existingConditions: patient.existingConditions || "", currentMedications: patient.currentMedications || "",
    emergencyContactName: patient.emergencyContactName || "", emergencyContactPhone: patient.emergencyContactPhone || "",
    heightCm: patient.heightCm != null ? String(patient.heightCm) : "",
    weightKg: patient.weightKg != null ? String(patient.weightKg) : "",
  });
  const [saving, setSaving] = useState(false);

  const heightM = Number(form.heightCm) / 100;
  const weight = Number(form.weightKg);
  const bmi = heightM > 0 && weight > 0 ? weight / (heightM * heightM) : null;
  const bmiCategory = bmi == null ? "" : bmi < 18.5 ? "Underweight" : bmi < 25 ? "Healthy range" : bmi < 30 ? "Overweight" : "Obese";
  const bmiColor = bmi == null ? "" : bmi < 18.5 || bmi >= 30 ? "text-vault-coral" : bmi < 25 ? "text-vault-primary" : "text-vault-gold";

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await api.put("/patients/me", form);
      onSaved(res.data.patient);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title="Health profile" onClose={onClose} wide>
      <form onSubmit={handleSubmit} className="space-y-3.5">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Full name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
          <Field label="Gender" value={form.gender} onChange={(v) => setForm({ ...form, gender: v })} />
          <Field label="Blood group" value={form.bloodGroup} onChange={(v) => setForm({ ...form, bloodGroup: v })} placeholder="O+" />
          <Field label="Phone" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />
        </div>

        <div>
          <p className="label mb-2">Physical data</p>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Height (cm)" value={form.heightCm} onChange={(v) => setForm({ ...form, heightCm: v })} placeholder="170" />
            <Field label="Weight (kg)" value={form.weightKg} onChange={(v) => setForm({ ...form, weightKg: v })} placeholder="65" />
          </div>
          {bmi != null && (
            <div className="mt-2 flex items-center gap-2 bg-vault-bg rounded-lg px-3 py-2">
              <span className="text-xs text-vault-muted">BMI</span>
              <span className={`text-sm font-semibold ${bmiColor}`}>{bmi.toFixed(1)}</span>
              <span className={`text-xs ${bmiColor}`}>· {bmiCategory}</span>
            </div>
          )}
        </div>

        <Field label="Address" value={form.address} onChange={(v) => setForm({ ...form, address: v })} />
        <Field label="Allergies" value={form.allergies} onChange={(v) => setForm({ ...form, allergies: v })} placeholder="e.g. Penicillin" />
        <Field label="Existing conditions" value={form.existingConditions} onChange={(v) => setForm({ ...form, existingConditions: v })} />
        <Field label="Current medications" value={form.currentMedications} onChange={(v) => setForm({ ...form, currentMedications: v })} />
        <div>
          <p className="label mb-2">Emergency contact</p>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Name" value={form.emergencyContactName} onChange={(v) => setForm({ ...form, emergencyContactName: v })} />
            <Field label="Phone" value={form.emergencyContactPhone} onChange={(v) => setForm({ ...form, emergencyContactPhone: v })} />
          </div>
        </div>
        <div className="flex gap-2 pt-2">
          <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button type="submit" disabled={saving} className="btn-primary flex-1">{saving ? "Saving..." : "Save profile"}</button>
        </div>
      </form>
    </Modal>
  );
}

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div>
      <label className="label">{label}</label>
      <input className="input" value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function GenerateRemindersModal({ record, onClose }: { record: MedicalRecord; onClose: () => void }) {
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [createdCount, setCreatedCount] = useState(0);
  const [demo, setDemo] = useState(false);
  const [error, setError] = useState("");

  async function generate() {
    setStatus("loading");
    setError("");
    try {
      const res = await api.post("/ai/generate-reminders", { recordId: record.id });
      setCreatedCount(res.data.created.length);
      setDemo(res.data.demo);
      setStatus("done");
    } catch (err: any) {
      setError(err.response?.data?.error || "Couldn't generate reminders from this record.");
      setStatus("error");
    }
  }

  return (
    <Modal title="Auto-generate reminders" onClose={onClose}>
      <div className="space-y-4">
        <p className="text-sm text-vault-muted">
          Health Valut AI will read <span className="font-medium text-vault-ink">{record.title}</span>'s title and description to find medicines and follow-up dates, then create reminders automatically.
        </p>
        {status === "idle" && (
          <button onClick={generate} className="btn-primary w-full">Analyze & create reminders</button>
        )}
        {status === "loading" && <div className="flex justify-center py-6"><Spinner className="w-6 h-6" /></div>}
        {status === "done" && (
          <div>
            <p className="text-sm font-medium mb-1">{createdCount > 0 ? `${createdCount} reminder(s) created` : "No medicines or follow-up dates were found"}</p>
            {demo && <p className="text-xs text-vault-gold">Running in demo mode — add an ANTHROPIC_API_KEY on the backend for real extraction.</p>}
            <button onClick={onClose} className="btn-primary w-full mt-3">Done</button>
          </div>
        )}
        {status === "error" && (
          <div>
            <p className="text-sm text-vault-coral mb-3">{error}</p>
            <button onClick={generate} className="btn-secondary w-full">Try again</button>
          </div>
        )}
      </div>
    </Modal>
  );
}

export function Modal({ title, children, onClose, wide }: { title: string; children: ReactNode; onClose: () => void; wide?: boolean }) {
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className={`card p-6 w-full ${wide ? "max-w-lg" : "max-w-md"} max-h-[90vh] overflow-y-auto`} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display font-semibold text-lg">{title}</h3>
          <button onClick={onClose} className="text-vault-muted hover:text-vault-ink"><X className="w-5 h-5" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}
