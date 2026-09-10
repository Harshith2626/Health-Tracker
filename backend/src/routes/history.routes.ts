import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth, requireRole, AuthRequest } from "../middleware/auth";
import { logAudit } from "../utils/audit";

const router = Router();

// GET /api/history — patient's own chronological health timeline
router.get("/", requireAuth, requireRole("PATIENT"), async (req: AuthRequest, res, next) => {
  try {
    const patient = await prisma.patient.findUnique({ where: { userId: req.user!.userId } });
    if (!patient) return res.status(404).json({ error: "Patient profile not found" });

    const events = await prisma.medicalHistoryEvent.findMany({
      where: { patientId: patient.id },
      include: { doctor: { select: { name: true, specialization: true } } },
      orderBy: { eventDate: "desc" },
    });

    res.json({ events });
  } catch (err) {
    next(err);
  }
});

// POST /api/history — patient adds a manual history event
router.post("/", requireAuth, requireRole("PATIENT"), async (req: AuthRequest, res, next) => {
  try {
    const patient = await prisma.patient.findUnique({ where: { userId: req.user!.userId } });
    if (!patient) return res.status(404).json({ error: "Patient profile not found" });

    const { eventType, title, description, eventDate } = req.body;
    if (!eventType || !title || !eventDate) {
      return res.status(400).json({ error: "eventType, title, and eventDate are required" });
    }

    const event = await prisma.medicalHistoryEvent.create({
      data: { patientId: patient.id, eventType, title, description, eventDate: new Date(eventDate) },
    });

    await logAudit(req.user!.userId, "HISTORY_EVENT_ADDED", event.id);
    res.status(201).json({ event });
  } catch (err) {
    next(err);
  }
});

// GET /api/history/patient/:patientId — for an authorized doctor
router.get("/patient/:patientId", requireAuth, requireRole("DOCTOR"), async (req: AuthRequest, res, next) => {
  try {
    const doctor = await prisma.doctor.findUnique({ where: { userId: req.user!.userId } });
    if (!doctor) return res.status(404).json({ error: "Doctor profile not found" });

    const grant = await prisma.recordAccess.findFirst({
      where: {
        doctorId: doctor.id,
        patientId: req.params.patientId,
        revokedAt: null,
        OR: [{ allRecords: true }, { medicalHistory: true }],
      },
    });
    if (!grant) return res.status(403).json({ error: "Not authorized to view this patient's history" });

    const events = await prisma.medicalHistoryEvent.findMany({
      where: { patientId: req.params.patientId },
      orderBy: { eventDate: "desc" },
    });

    res.json({ events });
  } catch (err) {
    next(err);
  }
});

export default router;
