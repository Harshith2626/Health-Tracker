import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  FolderLock,
  CalendarCheck,
  Pill,
  BellRing,
  ArrowRight,
  AlertTriangle,
  Sparkles,
  FileText,
  Activity,
  Maximize2,
} from "lucide-react";
import { api } from "../../api/client";
import { Card, SectionHeading, Spinner } from "../../components/UI";
import { MedicalHistoryEvent, Appointment, Reminder, Patient } from "../../types";
import { format } from "date-fns";

export default function PatientDashboard() {
  const [loading, setLoading] = useState(true);
  const [patient, setPatient] = useState<Patient | null>(null);
  const [events, setEvents] = useState<MedicalHistoryEvent[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);

  useEffect(() => {
    Promise.all([
      api.get("/patients/me"),
      api.get("/history"),
      api.get("/appointments/me"),
      api.get("/reminders"),
    ])
      .then(([p, h, a, r]) => {
        setPatient(p.data.patient);
        setEvents(h.data.events.slice(0, 4));
        setAppointments(a.data.appointments);
        setReminders(r.data.reminders.filter((rem: Reminder) => !rem.isDone).slice(0, 4));
      })
      .finally(() => setLoading(false));
  }, []);

  function triggerAIChat(tab: "chat" | "explain" | "analyze" | "summary" = "chat", maximized = false) {
    window.dispatchEvent(
      new CustomEvent("open-ai-chat", {
        detail: { tab, maximized },
      })
    );
  }

  if (loading) return <div className="flex justify-center py-20"><Spinner className="w-8 h-8" /></div>;

  const upcoming = appointments.filter((a) => ["PENDING", "CONFIRMED"].includes(a.status)).slice(0, 3);
  const profileGaps = !patient?.bloodGroup || !patient?.emergencyContactPhone;
  const heightM = patient?.heightCm ? patient.heightCm / 100 : undefined;
  const bmi = heightM && patient?.weightKg ? patient.weightKg / (heightM * heightM) : undefined;
  const bmiCategory = bmi == null ? "" : bmi < 18.5 ? "Underweight" : bmi < 25 ? "Healthy range" : bmi < 30 ? "Overweight" : "Obese";
  const bmiColor = bmi == null ? "" : bmi < 18.5 || bmi >= 30 ? "text-vault-coral" : bmi < 25 ? "text-vault-primary" : "text-vault-gold";

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <p className="text-xs font-mono uppercase tracking-wider text-vault-primary mb-1">Dashboard</p>
          <h1 className="text-2xl font-display font-semibold">Hi {patient?.name?.split(" ")[0]}, here's where things stand.</h1>
        </div>
        <button
          onClick={() => triggerAIChat("chat", false)}
          className="btn-primary self-start sm:self-auto flex items-center gap-2 text-xs sm:text-sm py-2 px-3.5 shadow-md"
        >
          <Sparkles className="w-4 h-4" /> Open AI Assistant
        </button>
      </div>

      {/* AI Assistant Interactive Card */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-vault-primary/10 via-vault-primaryLight/40 to-vault-surface border border-vault-primary/20 p-5 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-vault-primary text-white">
                <Sparkles className="w-4 h-4" />
              </span>
              <h3 className="font-semibold text-vault-ink">Health Valut AI Assistant</h3>
              <span className="text-[11px] font-medium bg-vault-primary/10 text-vault-primary px-2 py-0.5 rounded-full">
                Floating Window Ready
              </span>
            </div>
            <p className="text-xs sm:text-sm text-vault-muted max-w-xl">
              Instant medical explanations, first-aid measures, lab report interpretation, and automated health summaries.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => triggerAIChat("chat", false)}
              className="px-3 py-2 rounded-xl bg-white border border-vault-line text-xs font-medium text-vault-ink hover:border-vault-primary hover:text-vault-primary transition-colors flex items-center gap-1.5 shadow-xs"
            >
              <Sparkles className="w-3.5 h-3.5 text-vault-primary" /> Ask Question
            </button>
            <button
              onClick={() => triggerAIChat("explain", false)}
              className="px-3 py-2 rounded-xl bg-white border border-vault-line text-xs font-medium text-vault-ink hover:border-vault-primary hover:text-vault-primary transition-colors flex items-center gap-1.5 shadow-xs"
            >
              <FileText className="w-3.5 h-3.5 text-vault-primary" /> Explain Report
            </button>
            <button
              onClick={() => triggerAIChat("summary", false)}
              className="px-3 py-2 rounded-xl bg-white border border-vault-line text-xs font-medium text-vault-ink hover:border-vault-primary hover:text-vault-primary transition-colors flex items-center gap-1.5 shadow-xs"
            >
              <Activity className="w-3.5 h-3.5 text-vault-primary" /> Health Summary
            </button>
            <button
              onClick={() => triggerAIChat("chat", true)}
              className="p-2 rounded-xl bg-vault-primary text-white hover:bg-vault-primaryDark transition-colors shadow-xs"
              title="Open maximized AI workspace"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {profileGaps && (
        <Card className="border-vault-gold/40 bg-vault-gold/5 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-vault-gold shrink-0" />
          <p className="text-sm">
            Your health profile is missing key emergency details. <Link to="/patient/vault" className="font-medium underline">Complete it</Link> so doctors can help faster in an emergency.
          </p>
        </Card>
      )}

      {bmi != null ? (
        <Card className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <p className="text-xs text-vault-muted mb-1">Body Mass Index</p>
            <p className={`text-2xl font-display font-semibold ${bmiColor}`}>{bmi.toFixed(1)} <span className="text-sm font-normal">· {bmiCategory}</span></p>
          </div>
          <Link to="/patient/vault" className="btn-ghost text-sm">Update vitals</Link>
        </Card>
      ) : (
        <Card className="flex items-center justify-between flex-wrap gap-3">
          <p className="text-sm text-vault-muted">Add your height and weight to see your BMI here.</p>
          <Link to="/patient/vault" className="btn-ghost text-sm">Add vitals</Link>
        </Card>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <QuickLink to="/patient/vault" icon={FolderLock} label="Health Vault" />
        <QuickLink to="/patient/appointments" icon={CalendarCheck} label="Appointments" />
        <QuickLink to="/patient/prescriptions" icon={Pill} label="Prescriptions" />
        <QuickLink to="/patient/reminders" icon={BellRing} label="Reminders" />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <SectionHeading eyebrow="What happened recently" title="Health Timeline" action={
            <Link to="/patient/history" className="btn-ghost text-sm flex items-center gap-1">View all <ArrowRight className="w-3.5 h-3.5" /></Link>
          } />
          {events.length === 0 ? (
            <p className="text-sm text-vault-muted">No events recorded yet.</p>
          ) : (
            <div className="vault-thread space-y-5 pl-6">
              {events.map((e) => (
                <div key={e.id} className="vault-node">
                  <p className="text-xs font-mono text-vault-muted">{format(new Date(e.eventDate), "MMM d, yyyy")}</p>
                  <p className="text-sm font-medium">{e.title}</p>
                  {e.description && <p className="text-xs text-vault-muted mt-0.5">{e.description}</p>}
                </div>
              ))}
            </div>
          )}
        </Card>

        <div className="space-y-6">
          <Card>
            <SectionHeading eyebrow="What's next" title="Upcoming appointments" action={
              <Link to="/patient/appointments" className="btn-ghost text-sm flex items-center gap-1">View all <ArrowRight className="w-3.5 h-3.5" /></Link>
            } />
            {upcoming.length === 0 ? (
              <p className="text-sm text-vault-muted">No upcoming appointments. <Link to="/patient/find-doctors" className="text-vault-primary font-medium">Find a doctor</Link></p>
            ) : (
              <div className="space-y-3">
                {upcoming.map((a) => (
                  <div key={a.id} className="flex items-center justify-between text-sm">
                    <div>
                      <p className="font-medium">{a.doctor?.name}</p>
                      <p className="text-xs text-vault-muted">{a.slot ? format(new Date(a.slot.startTime), "MMM d, h:mm a") : "—"}</p>
                    </div>
                    <span className="badge bg-vault-primaryLight text-vault-primary">{a.status}</span>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card>
            <SectionHeading eyebrow="Don't forget" title="Reminders" action={
              <Link to="/patient/reminders" className="btn-ghost text-sm flex items-center gap-1">View all <ArrowRight className="w-3.5 h-3.5" /></Link>
            } />
            {reminders.length === 0 ? (
              <p className="text-sm text-vault-muted">No pending reminders.</p>
            ) : (
              <div className="space-y-3">
                {reminders.map((r) => (
                  <div key={r.id} className="flex items-center justify-between text-sm">
                    <p className="font-medium">{r.title}</p>
                    <p className="text-xs text-vault-muted">{format(new Date(r.remindAt), "MMM d, h:mm a")}</p>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

function QuickLink({ to, icon: Icon, label }: { to: string; icon: any; label: string }) {
  return (
    <Link to={to} className="card p-4 flex items-center gap-3 hover:border-vault-primary/40 transition-colors group">
      <div className="w-10 h-10 rounded-xl bg-vault-primaryLight flex items-center justify-center text-vault-primary group-hover:bg-vault-primary group-hover:text-white transition-colors">
        <Icon className="w-5 h-5" />
      </div>
      <span className="font-medium text-sm">{label}</span>
    </Link>
  );
}
