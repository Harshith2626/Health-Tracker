import { useEffect, useState } from "react";
import { format } from "date-fns";
import { Pill } from "lucide-react";
import { api } from "../../api/client";
import { Card, EmptyState, Spinner } from "../../components/UI";
import { Prescription } from "../../types";

export default function PatientPrescriptions() {
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/prescriptions/me").then((res) => setPrescriptions(res.data.prescriptions)).finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-mono uppercase tracking-wider text-vault-primary mb-1">Digital Prescriptions</p>
        <h1 className="text-2xl font-display font-semibold">Prescriptions</h1>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Spinner className="w-7 h-7" /></div>
      ) : prescriptions.length === 0 ? (
        <Card><EmptyState icon={<Pill className="w-8 h-8" />} title="No prescriptions yet" description="Prescriptions issued by your doctors after a consultation will appear here." /></Card>
      ) : (
        <div className="space-y-4">
          {prescriptions.map((p) => (
            <Card key={p.id}>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="font-medium text-sm">Dr. {p.doctor?.name}</p>
                  <p className="text-xs text-vault-muted">{p.doctor?.specialization} · {format(new Date(p.issuedAt), "MMM d, yyyy")}</p>
                </div>
              </div>
              {p.diagnosis && <p className="text-sm mb-3"><span className="text-vault-muted">Diagnosis: </span>{p.diagnosis}</p>}
              <div className="border border-vault-line rounded-xl overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-vault-bg text-vault-muted">
                    <tr>
                      <th className="text-left font-medium p-2.5">Medicine</th>
                      <th className="text-left font-medium p-2.5">Dosage</th>
                      <th className="text-left font-medium p-2.5">Frequency</th>
                      <th className="text-left font-medium p-2.5">Duration</th>
                    </tr>
                  </thead>
                  <tbody>
                    {p.medicines.map((m) => (
                      <tr key={m.id} className="border-t border-vault-line">
                        <td className="p-2.5 font-medium">{m.name}</td>
                        <td className="p-2.5">{m.dosage || "—"}</td>
                        <td className="p-2.5">{m.frequency || "—"}</td>
                        <td className="p-2.5">{m.duration || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {p.notes && <p className="text-xs text-vault-muted mt-3">Notes: {p.notes}</p>}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
