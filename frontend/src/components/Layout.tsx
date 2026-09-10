import { ReactNode, useEffect, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, FolderLock, GitBranch, Stethoscope, CalendarCheck,
  Pill, BellRing, ShieldCheck, Sparkles, LogOut, Bell, Menu, X,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { api } from "../api/client";
import { AppNotification } from "../types";
import FloatingAIChat from "./FloatingAIChat";

const patientNav = [
  { to: "/patient", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/patient/vault", label: "My Health Vault", icon: FolderLock },
  { to: "/patient/history", label: "Health Timeline", icon: GitBranch },
  { to: "/patient/find-doctors", label: "Find Doctors", icon: Stethoscope },
  { to: "/patient/appointments", label: "Appointments", icon: CalendarCheck },
  { to: "/patient/prescriptions", label: "Prescriptions", icon: Pill },
  { to: "/patient/reminders", label: "Reminders", icon: BellRing },
  { to: "/patient/authorization", label: "Doctor Access", icon: ShieldCheck },
  { to: "/patient/ai-assistant", label: "AI Assistant", icon: Sparkles },
];

const doctorNav = [
  { to: "/doctor", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/doctor/appointments", label: "Appointments", icon: CalendarCheck },
  { to: "/doctor/prescriptions", label: "Prescriptions", icon: Pill },
];

export default function Layout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [showNotifs, setShowNotifs] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const nav = user?.role === "PATIENT" ? patientNav : doctorNav;
  const unread = notifications.filter((n) => !n.isRead).length;

  useEffect(() => {
    if (!user) return;
    api.get("/notifications").then((res) => setNotifications(res.data.notifications)).catch(() => {});
  }, [user]);

  async function markAllRead() {
    await api.patch("/notifications/read-all");
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  }

  function handleLogout() {
    logout();
    navigate("/login");
  }

  return (
    <div className="min-h-screen flex bg-vault-bg">
      {/* Sidebar */}
      <aside
        className={`fixed lg:static z-40 inset-y-0 left-0 w-64 bg-white border-r border-vault-line flex flex-col transition-transform lg:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="h-16 flex items-center gap-2 px-5 border-b border-vault-line">
          <div className="w-8 h-8 rounded-lg bg-vault-primary flex items-center justify-center text-white font-display font-bold text-sm">
            HV
          </div>
          <span className="font-display font-semibold text-lg">Health Valut</span>
          <button className="ml-auto lg:hidden" onClick={() => setMobileOpen(false)}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={(item as any).end}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  isActive ? "bg-vault-primaryLight text-vault-primary" : "text-vault-muted hover:bg-vault-bg hover:text-vault-ink"
                }`
              }
            >
              <item.icon className="w-4 h-4 shrink-0" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="p-3 border-t border-vault-line">
          <div className="flex items-center gap-2 px-2 py-2 mb-1">
            <div className="w-8 h-8 rounded-full bg-vault-primaryLight flex items-center justify-center text-vault-primary font-semibold text-sm">
              {user?.profile.name?.[0]?.toUpperCase() || "?"}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{user?.profile.name}</p>
              <p className="text-xs text-vault-muted truncate">{user?.role === "PATIENT" ? "Patient" : "Doctor"}</p>
            </div>
          </div>
          <button onClick={handleLogout} className="w-full flex items-center gap-2 px-2 py-2 rounded-lg text-sm text-vault-muted hover:bg-vault-coralLight hover:text-vault-coral transition-colors">
            <LogOut className="w-4 h-4" /> Sign out
          </button>
        </div>
      </aside>

      {mobileOpen && <div className="fixed inset-0 bg-black/30 z-30 lg:hidden" onClick={() => setMobileOpen(false)} />}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 border-b border-vault-line bg-white/80 backdrop-blur flex items-center justify-between px-4 lg:px-8 sticky top-0 z-20">
          <button className="lg:hidden" onClick={() => setMobileOpen(true)}>
            <Menu className="w-5 h-5" />
          </button>
          <div className="hidden lg:block" />
          <div className="relative">
            <button
              onClick={() => setShowNotifs((s) => !s)}
              className="relative w-9 h-9 flex items-center justify-center rounded-full hover:bg-vault-bg transition-colors"
            >
              <Bell className="w-5 h-5 text-vault-muted" />
              {unread > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-vault-coral" />
              )}
            </button>
            {showNotifs && (
              <div className="absolute right-0 mt-2 w-80 max-h-96 overflow-y-auto card p-0 z-30">
                <div className="flex items-center justify-between p-3 border-b border-vault-line">
                  <p className="text-sm font-semibold">Notifications</p>
                  {unread > 0 && (
                    <button onClick={markAllRead} className="text-xs text-vault-primary font-medium">
                      Mark all read
                    </button>
                  )}
                </div>
                {notifications.length === 0 ? (
                  <p className="text-sm text-vault-muted p-4">No notifications yet.</p>
                ) : (
                  notifications.map((n) => (
                    <div key={n.id} className={`p-3 border-b border-vault-line last:border-0 ${!n.isRead ? "bg-vault-primaryLight/40" : ""}`}>
                      <p className="text-sm font-medium">{n.title}</p>
                      <p className="text-xs text-vault-muted mt-0.5">{n.message}</p>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-8 max-w-6xl w-full mx-auto">{children}</main>
      </div>

      {user?.role === "PATIENT" && <FloatingAIChat />}
    </div>
  );
}
