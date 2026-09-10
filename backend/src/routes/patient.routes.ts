import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth, requireRole, AuthRequest } from "../middleware/auth";
import { logAudit } from "../utils/audit";

const router = Router();

async function getOwnPatient(userId: string) {
  return prisma.patient.findUnique({ where: { userId } });
}

// GET /api/patients/me
router.get("/me", requireAuth, requireRole("PATIENT"), async (req: AuthRequest, res, next) => {
  try {
    const patient = await getOwnPatient(req.user!.userId);
    if (!patient) return res.status(404).json({ error: "Patient profile not found" });
    res.json({ patient });
  } catch (err) {
    next(err);
  }
});

// PUT /api/patients/me
router.put("/me", requireAuth, requireRole("PATIENT"), async (req: AuthRequest, res, next) => {
  try {
    const patient = await getOwnPatient(req.user!.userId);
    if (!patient) return res.status(404).json({ error: "Patient profile not found" });

    const {
      name, dateOfBirth, gender, bloodGroup, phone, address,
      allergies, existingConditions, currentMedications,
      emergencyContactName, emergencyContactPhone, avatarUrl,
      heightCm, weightKg,
    } = req.body;

    const updated = await prisma.patient.update({
      where: { id: patient.id },
      data: {
        name, gender, bloodGroup, phone, address,
        allergies, existingConditions, currentMedications,
        emergencyContactName, emergencyContactPhone, avatarUrl,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
        heightCm: heightCm !== undefined && heightCm !== "" ? Number(heightCm) : undefined,
        weightKg: weightKg !== undefined && weightKg !== "" ? Number(weightKg) : undefined,
      },
    });

    await logAudit(req.user!.userId, "PATIENT_PROFILE_UPDATED");
    res.json({ patient: updated });
  } catch (err) {
    next(err);
  }
});

// GET /api/patients/me/emergency-overview — condensed emergency view
router.get("/me/emergency-overview", requireAuth, requireRole("PATIENT"), async (req: AuthRequest, res, next) => {
  try {
    const patient = await getOwnPatient(req.user!.userId);
    if (!patient) return res.status(404).json({ error: "Patient profile not found" });

    const recentHistory = await prisma.medicalHistoryEvent.findMany({
      where: { patientId: patient.id },
      orderBy: { eventDate: "desc" },
      take: 5,
    });

    res.json({
      overview: {
        name: patient.name,
        bloodGroup: patient.bloodGroup,
        allergies: patient.allergies,
        majorConditions: patient.existingConditions,
        currentMedications: patient.currentMedications,
        emergencyContactName: patient.emergencyContactName,
        emergencyContactPhone: patient.emergencyContactPhone,
        recentEvents: recentHistory,
      },
    });
  } catch (err) {
    next(err);
  }
});

export default router;
