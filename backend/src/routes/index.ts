import { Router } from "express";
import authRoutes from "./auth.routes";
import patientRoutes from "./patient.routes";
import doctorRoutes from "./doctor.routes";
import recordRoutes from "./record.routes";
import historyRoutes from "./history.routes";
import appointmentRoutes from "./appointment.routes";
import authorizationRoutes from "./authorization.routes";
import prescriptionRoutes from "./prescription.routes";
import reminderRoutes from "./reminder.routes";
import notificationRoutes from "./notification.routes";
import aiRoutes from "./ai.routes";

const router = Router();

router.use("/auth", authRoutes);
router.use("/patients", patientRoutes);
router.use("/doctors", doctorRoutes);
router.use("/records", recordRoutes);
router.use("/history", historyRoutes);
router.use("/appointments", appointmentRoutes);
router.use("/authorization", authorizationRoutes);
router.use("/prescriptions", prescriptionRoutes);
router.use("/reminders", reminderRoutes);
router.use("/notifications", notificationRoutes);
router.use("/ai", aiRoutes);

export default router;
