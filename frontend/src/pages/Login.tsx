import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { HeartPulse, ArrowRight } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const user = await login(email, password);
      navigate(user.role === "PATIENT" ? "/patient" : "/doctor");
    } catch (err: any) {
      setError(err.response?.data?.error || "Couldn't sign in. Check your details and try again.");
    } finally {
      setLoading(false);
    }
  }

  function fillDemo(role: "PATIENT" | "DOCTOR") {
    setEmail(role === "PATIENT" ? "patient@demo.com" : "doctor@demo.com");
    setPassword(role === "PATIENT" ? "patient123" : "doctor123");
  }

  return (
    <div className="min-h-screen flex bg-vault-bg">
      <div className="hidden lg:flex flex-col justify-between w-1/2 bg-vault-primary text-white p-12 relative overflow-hidden">
        <div className="absolute -right-24 -top-24 w-96 h-96 rounded-full bg-white/5" />
        <div className="absolute -right-10 bottom-0 w-64 h-64 rounded-full bg-white/5" />
        <div className="flex items-center gap-2 relative z-10">
          <div className="w-9 h-9 rounded-lg bg-white/15 flex items-center justify-center">
            <HeartPulse className="w-5 h-5" />
          </div>
          <span className="font-display font-semibold text-xl">Health Valut</span>
        </div>
        <div className="relative z-10 max-w-md">
          <h1 className="font-display text-4xl font-semibold leading-tight mb-4">
            One patient. One vault.<br />One continuous history.
          </h1>
          <p className="text-white/80 leading-relaxed">
            Store your records, track your health timeline, and share only what you choose — with the doctors you choose.
          </p>
        </div>
        <p className="relative z-10 text-sm text-white/60">Digital health locker · Patient–doctor platform · AI assistance</p>
      </div>

      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <div className="w-8 h-8 rounded-lg bg-vault-primary flex items-center justify-center text-white font-display font-bold text-sm">HV</div>
            <span className="font-display font-semibold text-lg">Health Valut</span>
          </div>

          <h2 className="text-2xl font-display font-semibold mb-1">Welcome back</h2>
          <p className="text-sm text-vault-muted mb-6">Sign in to your account</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Email</label>
              <input type="email" required className="input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
            </div>
            <div>
              <label className="label">Password</label>
              <input type="password" required className="input" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
            </div>
            {error && <p className="text-sm text-vault-coral">{error}</p>}
            <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2">
              {loading ? "Signing in..." : "Sign in"} <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <div className="mt-5 flex gap-2 text-xs">
            <button onClick={() => fillDemo("PATIENT")} className="flex-1 py-2 rounded-lg border border-vault-line text-vault-muted hover:bg-vault-primaryLight hover:text-vault-primary transition-colors">
              Use demo patient
            </button>
            <button onClick={() => fillDemo("DOCTOR")} className="flex-1 py-2 rounded-lg border border-vault-line text-vault-muted hover:bg-vault-primaryLight hover:text-vault-primary transition-colors">
              Use demo doctor
            </button>
          </div>

          <p className="text-sm text-vault-muted mt-6 text-center">
            New to Health Valut?{" "}
            <Link to="/register" className="text-vault-primary font-medium">Create an account</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
