import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { HeartPulse, ArrowRight, User, Stethoscope } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { Role } from "../types";

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [role, setRole] = useState<Role>("PATIENT");
  const [form, setForm] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function set(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const user = await register({ role, ...form });
      navigate(user.role === "PATIENT" ? "/patient" : "/doctor");
    } catch (err: any) {
      setError(err.response?.data?.error || "Couldn't create your account. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-vault-bg p-6">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-2 mb-8 justify-center">
          <div className="w-8 h-8 rounded-lg bg-vault-primary flex items-center justify-center text-white font-display font-bold text-sm">HV</div>
          <span className="font-display font-semibold text-lg">Health Valut</span>
        </div>

        <div className="card p-6">
          <h2 className="text-xl font-display font-semibold mb-1">Create your account</h2>
          <p className="text-sm text-vault-muted mb-5">Set up your digital health vault in a minute</p>

          <div className="grid grid-cols-2 gap-2 mb-5">
            <button
              type="button"
              onClick={() => setRole("PATIENT")}
              className={`flex flex-col items-center gap-1.5 py-3 rounded-xl border text-sm font-medium transition-colors ${
                role === "PATIENT" ? "border-vault-primary bg-vault-primaryLight text-vault-primary" : "border-vault-line text-vault-muted"
              }`}
            >
              <User className="w-5 h-5" /> Patient
            </button>
            <button
              type="button"
              onClick={() => setRole("DOCTOR")}
              className={`flex flex-col items-center gap-1.5 py-3 rounded-xl border text-sm font-medium transition-colors ${
                role === "DOCTOR" ? "border-vault-primary bg-vault-primaryLight text-vault-primary" : "border-vault-line text-vault-muted"
              }`}
            >
              <Stethoscope className="w-5 h-5" /> Doctor
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div>
              <label className="label">Full name</label>
              <input required className="input" onChange={(e) => set("name", e.target.value)} placeholder="Jane Doe" />
            </div>
            <div>
              <label className="label">Email</label>
              <input type="email" required className="input" onChange={(e) => set("email", e.target.value)} placeholder="you@example.com" />
            </div>
            <div>
              <label className="label">Password</label>
              <input type="password" required minLength={6} className="input" onChange={(e) => set("password", e.target.value)} placeholder="At least 6 characters" />
            </div>

            {role === "PATIENT" ? (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Date of birth</label>
                  <input type="date" className="input" onChange={(e) => set("dateOfBirth", e.target.value)} />
                </div>
                <div>
                  <label className="label">Blood group</label>
                  <input className="input" placeholder="O+" onChange={(e) => set("bloodGroup", e.target.value)} />
                </div>
              </div>
            ) : (
              <>
                <div>
                  <label className="label">Specialization</label>
                  <input required className="input" placeholder="General Physician" onChange={(e) => set("specialization", e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label">Qualification</label>
                    <input className="input" placeholder="MBBS, MD" onChange={(e) => set("qualification", e.target.value)} />
                  </div>
                  <div>
                    <label className="label">Location</label>
                    <input className="input" placeholder="City" onChange={(e) => set("location", e.target.value)} />
                  </div>
                </div>
              </>
            )}

            {error && <p className="text-sm text-vault-coral">{error}</p>}

            <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2">
              {loading ? "Creating account..." : "Create account"} <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <p className="text-sm text-vault-muted mt-5 text-center">
            Already have an account?{" "}
            <Link to="/login" className="text-vault-primary font-medium">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
