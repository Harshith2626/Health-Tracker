import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import { FullPageSpinner } from "./components/UI";
import ProtectedRoute from "./components/ProtectedRoute";

import Login from "./pages/Login";
import Register from "./pages/Register";

import PatientDashboard from "./pages/patient/PatientDashboard";
import Vault from "./pages/patient/Vault";
import History from "./pages/patient/History";
import FindDoctors from "./pages/patient/FindDoctors";
import PatientAppointments from "./pages/patient/PatientAppointments";
import PatientPrescriptions from "./pages/patient/PatientPrescriptions";
import Reminders from "./pages/patient/Reminders";
import Authorization from "./pages/patient/Authorization";
import AIAssistant from "./pages/patient/AIAssistant";

import DoctorDashboard from "./pages/doctor/DoctorDashboard";
import DoctorAppointments from "./pages/doctor/DoctorAppointments";
import DoctorPrescriptions from "./pages/doctor/DoctorPrescriptions";
import PatientOverview from "./pages/doctor/PatientOverview";

function RootRedirect() {
  const { user, loading } = useAuth();
  if (loading) return <FullPageSpinner />;
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={user.role === "PATIENT" ? "/patient" : "/doctor"} replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<RootRedirect />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      <Route path="/patient" element={<ProtectedRoute role="PATIENT"><PatientDashboard /></ProtectedRoute>} />
      <Route path="/patient/vault" element={<ProtectedRoute role="PATIENT"><Vault /></ProtectedRoute>} />
      <Route path="/patient/history" element={<ProtectedRoute role="PATIENT"><History /></ProtectedRoute>} />
      <Route path="/patient/find-doctors" element={<ProtectedRoute role="PATIENT"><FindDoctors /></ProtectedRoute>} />
      <Route path="/patient/appointments" element={<ProtectedRoute role="PATIENT"><PatientAppointments /></ProtectedRoute>} />
      <Route path="/patient/prescriptions" element={<ProtectedRoute role="PATIENT"><PatientPrescriptions /></ProtectedRoute>} />
      <Route path="/patient/reminders" element={<ProtectedRoute role="PATIENT"><Reminders /></ProtectedRoute>} />
      <Route path="/patient/authorization" element={<ProtectedRoute role="PATIENT"><Authorization /></ProtectedRoute>} />
      <Route path="/patient/ai-assistant" element={<ProtectedRoute role="PATIENT"><AIAssistant /></ProtectedRoute>} />

      <Route path="/doctor" element={<ProtectedRoute role="DOCTOR"><DoctorDashboard /></ProtectedRoute>} />
      <Route path="/doctor/appointments" element={<ProtectedRoute role="DOCTOR"><DoctorAppointments /></ProtectedRoute>} />
      <Route path="/doctor/prescriptions" element={<ProtectedRoute role="DOCTOR"><DoctorPrescriptions /></ProtectedRoute>} />
      <Route path="/doctor/patient/:patientId" element={<ProtectedRoute role="DOCTOR"><PatientOverview /></ProtectedRoute>} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
