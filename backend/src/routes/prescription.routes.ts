import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth, requireRole, AuthRequest } from "../middleware/auth";
import { logAudit, notify } from "../utils/audit";

const router = Router();

// POST /api/prescriptions  (doctor creates a prescription for an authorized patient)
// body: { patientId, diagnosis, notes, medicines: [{ name, dosage, frequency, duration, instructions }] }
router.post("/", requireAuth, requireRole("DOCTOR"), async (req: AuthRequest, res, next) => {
  try {
    const doctor = await prisma.doctor.findUnique({ where: { userId: req.user!.userId } });
    if (!doctor) return res.status(404).json({ error: "Doctor profile not found" });

    const { patientId, diagnosis, notes, medicines } = req.body;
    if (!patientId || !Array.isArray(medicines) || medicines.length === 0) {
      return res.status(400).json({ error: "patientId and at least one medicine are required" });
    }

    const prescription = await prisma.prescription.create({
      data: {
        patientId,
        doctorId: doctor.id,
        diagnosis,
        notes,
        medicines: { create: medicines.map((m: any) => ({
          name: m.name, dosage: m.dosage, frequency: m.frequency, duration: m.duration, instructions: m.instructions,
        })) },
      },
      include: { medicines: true },
    });

    // Prescription doubles as a medical history event for the timeline
    await prisma.medicalHistoryEvent.create({
      data: {
        patientId,
        doctorId: doctor.id,
        eventType: "PRESCRIPTION",
        title: `Prescription from Dr. ${doctor.name}`,
        description: diagnosis,
        eventDate: prescription.issuedAt,
      },
    });

    // Auto-create medicine intake reminders so the patient doesn't have to add them manually
    const reminderRows = medicines
      .filter((m: any) => m.name?.trim())
      .map((m: any) => {
        const parts = [m.dosage, m.frequency].filter(Boolean).join(" · ");
        return {
          patientId,
          type: "MEDICINE" as const,
          title: `Take ${m.name}${parts ? ` (${parts})` : ""}`,
          notes: [m.instructions, m.duration ? `Duration: ${m.duration}` : null].filter(Boolean).join(". ") || undefined,
          remindAt: new Date(Date.now() + 60 * 60 * 1000), // first reminder 1 hour from now
          repeat: m.frequency || "daily",
        };
      });
    if (reminderRows.length > 0) {
      await prisma.reminder.createMany({ data: reminderRows });
    }

    const patient = await prisma.patient.findUnique({ where: { id: patientId }, include: { user: true } });
    if (patient) {
      await notify(patient.user.id, "NEW_PRESCRIPTION", "New prescription", `Dr. ${doctor.name} issued you a new prescription`);
    }
    await logAudit(req.user!.userId, "PRESCRIPTION_CREATED", prescription.id);

    res.status(201).json({ prescription });
  } catch (err) {
    next(err);
  }
});

// GET /api/prescriptions/me  (patient's own prescriptions)
router.get("/me", requireAuth, requireRole("PATIENT"), async (req: AuthRequest, res, next) => {
  try {
    const patient = await prisma.patient.findUnique({ where: { userId: req.user!.userId } });
    if (!patient) return res.status(404).json({ error: "Patient profile not found" });

    const prescriptions = await prisma.prescription.findMany({
      where: { patientId: patient.id },
      include: { medicines: true, doctor: { select: { name: true, specialization: true } } },
      orderBy: { issuedAt: "desc" },
    });

    res.json({ prescriptions });
  } catch (err) {
    next(err);
  }
});

// GET /api/prescriptions/issued  (doctor's issued prescriptions)
router.get("/issued", requireAuth, requireRole("DOCTOR"), async (req: AuthRequest, res, next) => {
  try {
    const doctor = await prisma.doctor.findUnique({ where: { userId: req.user!.userId } });
    if (!doctor) return res.status(404).json({ error: "Doctor profile not found" });

    const prescriptions = await prisma.prescription.findMany({
      where: { doctorId: doctor.id },
      include: { medicines: true, patient: { select: { name: true } } },
      orderBy: { issuedAt: "desc" },
    });

    res.json({ prescriptions });
  } catch (err) {
    next(err);
  }
});

export default router;
