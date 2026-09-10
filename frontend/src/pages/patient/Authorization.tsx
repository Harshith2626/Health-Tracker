import { useEffect, useState } from "react";
import { ShieldCheck, ShieldX } from "lucide-react";
import { api } from "../../api/client";
import { Card, EmptyState, Spinner } from "../../components/UI";
import { RecordAccessGrant, Doctor } from "../../types";
import { Modal } from "./Vault";

const CATEGORIES: { key: keyof RecordAccessGrant; label: string }[] = [
  { key: "medicalHistory", label: "Medical History" },
  { key: "labReports", label: "Lab Reports" },
  { key: "prescriptions", label: "Prescriptions" },
  { key: "scanReports", label: "Scan Reports" },
  { key: "hospitalRecords", label: "Hospital Records" },
];

export default function Authorization() {
  const [grants, setGrants] = useState<RecordAccessGrant[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<{ doctor: Doctor; grant?: RecordAccessGrant } | null>(null);
  const [showAdd, setShowAdd] = useState(false);

  function load() {
    return Promise.all([api.get("/authorization"), api.get("/doctors")]).then(([g, d]) => {
      setGrants(g.data.grants);
      setDoctors(d.data.doctors);
    });
  }

  useEffect(() => {
    setLoading(true);
    load().finally(() => setLoading(false));
  }, []);

  async function revoke(doctorId: string) {
    if (!confirm("Revoke this doctor's access to your records?")) return;
    await api.delete(`/authorization/${doctorId}`);
    load();
  }

  const authorizedDoctorIds = new Set(grants.map((g) => g.doctorId));
  const availableDoctors = doctors.filter((d) => !authorizedDoctorIds.has(d.id));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-mono uppercase tracking-wider text-vault-primary mb-1">You Control Access</p>
          <h1 className="text-2xl font-display font-semibold">Doctor Access</h1>
        </div>
        <button onClick={() => setShowAdd(true)} className="btn-primary text-sm">Authorize a doctor</button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Spinner className="w-7 h-7" /></div>
      ) : grants.length === 0 ? (
        <Card><EmptyState icon={<ShieldCheck className="w-8 h-8" />} title="No doctors authorized" description="Grant specific doctors access to your medical history and records — you decide exactly what they can see." /></Card>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {grants.map((g) => (
            <Card key={g.id}>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="font-medium text-sm">{g.doctor?.name}</p>
                  <p className="text-xs text-vault-muted">{g.doctor?.specialization}</p>
                </div>
                <button onClick={() => revoke(g.doctorId)} className="text-vault-coral hover:bg-vault-coralLight p-1.5 rounded-lg transition-colors" title="Revoke all access">
                  <ShieldX className="w-4 h-4" />
                </button>
              </div>
              <div className="space-y-1.5 mb-3">
                {g.allRecords ? (
                  <p className="text-xs text-vault-primary font-medium">☑ All records</p>
                ) : (
                  CATEGORIES.map((c) => (
                    <p key={c.key} className="text-xs flex items-center gap-1.5">
                      <span className={g[c.key] ? "text-vault-primary" : "text-vault-muted"}>{g[c.key] ? "☑" : "☐"}</span> {c.label}
                    </p>
                  ))
                )}
              </div>
              <button onClick={() => setEditing({ doctor: g.doctor!, grant: g })} className="btn-ghost text-xs px-0">Edit access</button>
            </Card>
          ))}
        </div>
      )}

      {showAdd && (
        <SelectDoctorModal doctors={availableDoctors} onClose={() => setShowAdd(false)} onSelect={(d) => { setShowAdd(false); setEditing({ doctor: d }); }} />
      )}
      {editing && (
        <AccessModal doctor={editing.doctor} grant={editing.grant} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />
      )}
    </div>
  );
}

function SelectDoctorModal({ doctors, onClose, onSelect }: { doctors: Doctor[]; onClose: () => void; onSelect: (d: Doctor) => void }) {
  return (
    <Modal title="Choose a doctor" onClose={onClose}>
      {doctors.length === 0 ? (
        <p className="text-sm text-vault-muted">All doctors you've searched are already authorized, or none exist yet — try Find Doctors first.</p>
      ) : (
        <div className="space-y-2 max-h-80 overflow-y-auto">
          {doctors.map((d) => (
            <button key={d.id} onClick={() => onSelect(d)} className="w-full text-left p-3 rounded-xl border border-vault-line hover:bg-vault-primaryLight transition-colors">
              <p className="text-sm font-medium">{d.name}</p>
              <p className="text-xs text-vault-muted">{d.specialization}</p>
            </button>
          ))}
        </div>
      )}
    </Modal>
  );
}

function AccessModal({ doctor, grant, onClose, onSaved }: { doctor: Doctor; grant?: RecordAccessGrant; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    medicalHistory: grant?.medicalHistory || false,
    labReports: grant?.labReports || false,
    prescriptions: grant?.prescriptions || false,
    scanReports: grant?.scanReports || false,
    hospitalRecords: grant?.hospitalRecords || false,
    allRecords: grant?.allRecords || false,
  });
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      await api.put(`/authorization/${doctor.id}`, form);
      onSaved();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={`Access for ${doctor.name}`} onClose={onClose}>
      <div className="space-y-3">
        <label className="flex items-center gap-2 p-3 rounded-xl border border-vault-primary bg-vault-primaryLight cursor-pointer">
          <input type="checkbox" checked={form.allRecords} onChange={(e) => setForm({ ...form, allRecords: e.target.checked })} />
          <span className="text-sm font-medium text-vault-primary">All relevant records</span>
        </label>
        <p className="text-xs text-vault-muted">Or choose specific categories:</p>
        {CATEGORIES.map((c) => (
          <label key={c.key} className="flex items-center gap-2 p-3 rounded-xl border border-vault-line cursor-pointer">
            <input
              type="checkbox"
              checked={form.allRecords ? true : !!(form as any)[c.key]}
              disabled={form.allRecords}
              onChange={(e) => setForm({ ...form, [c.key]: e.target.checked })}
            />
            <span className="text-sm">{c.label}</span>
          </label>
        ))}
        <button onClick={save} disabled={saving} className="btn-primary w-full mt-2">{saving ? "Saving..." : "Save access"}</button>
      </div>
    </Modal>
  );
}
