import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth, requireRole, AuthRequest } from "../middleware/auth";
import { logAudit, notify } from "../utils/audit";

const router = Router();

// GET /api/authorization  — patient's list of grants (per doctor)
router.get("/", requireAuth, requireRole("PATIENT"), async (req: AuthRequest, res, next) => {
  try {
    const patient = await prisma.patient.findUnique({ where: { userId: req.user!.userId } });
    if (!patient) return res.status(404).json({ error: "Patient profile not found" });

    const grants = await prisma.recordAccess.findMany({
      where: { patientId: patient.id, revokedAt: null },
      include: { doctor: true },
      orderBy: { grantedAt: "desc" },
    });

    res.json({ grants });
  } catch (err) {
    next(err);
  }
});

// PUT /api/authorization/:doctorId
// body: { medicalHistory, labReports, prescriptions, scanReports, hospitalRecords, allRecords }
router.put("/:doctorId", requireAuth, requireRole("PATIENT"), async (req: AuthRequest, res, next) => {
  try {
    const patient = await prisma.patient.findUnique({ where: { userId: req.user!.userId } });
    if (!patient) return res.status(404).json({ error: "Patient profile not found" });

    const doctor = await prisma.doctor.findUnique({ where: { id: req.params.doctorId }, include: { user: true } });
    if (!doctor) return res.status(404).json({ error: "Doctor not found" });

    const { medicalHistory, labReports, prescriptions, scanReports, hospitalRecords, allRecords } = req.body;

    const grant = await prisma.recordAccess.upsert({
      where: {
        patientId_doctorId_recordId: { patientId: patient.id, doctorId: doctor.id, recordId: "CATEGORY" },
      },
      create: {
        patientId: patient.id,
        doctorId: doctor.id,
        medicalHistory: !!medicalHistory,
        labReports: !!labReports,
        prescriptions: !!prescriptions,
        scanReports: !!scanReports,
        hospitalRecords: !!hospitalRecords,
        allRecords: !!allRecords,
      },
      update: {
        medicalHistory: !!medicalHistory,
        labReports: !!labReports,
        prescriptions: !!prescriptions,
        scanReports: !!scanReports,
        hospitalRecords: !!hospitalRecords,
        allRecords: !!allRecords,
        revokedAt: null,
      },
    });

    await notify(doctor.user.id, "RECORD_SHARED", "Access updated", `${patient.name} updated your access to their records`);
    await logAudit(req.user!.userId, "AUTHORIZATION_UPDATED", doctor.id);

    res.json({ grant });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/authorization/:doctorId  — revoke all access for a doctor
router.delete("/:doctorId", requireAuth, requireRole("PATIENT"), async (req: AuthRequest, res, next) => {
  try {
    const patient = await prisma.patient.findUnique({ where: { userId: req.user!.userId } });
    if (!patient) return res.status(404).json({ error: "Patient profile not found" });

    await prisma.recordAccess.updateMany({
      where: { patientId: patient.id, doctorId: req.params.doctorId, revokedAt: null },
      data: { revokedAt: new Date(), medicalHistory: false, labReports: false, prescriptions: false, scanReports: false, hospitalRecords: false, allRecords: false },
    });

    const doctor = await prisma.doctor.findUnique({ where: { id: req.params.doctorId }, include: { user: true } });
    if (doctor) {
      await notify(doctor.user.id, "ACCESS_REVOKED", "Access revoked", `${patient.name} revoked your access to their records`);
    }
    await logAudit(req.user!.userId, "AUTHORIZATION_REVOKED", req.params.doctorId);

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// GET /api/authorization/patient-overview/:patientId  — doctor's consolidated authorized view
router.get("/patient-overview/:patientId", requireAuth, requireRole("DOCTOR"), async (req: AuthRequest, res, next) => {
  try {
    const doctor = await prisma.doctor.findUnique({ where: { userId: req.user!.userId } });
    if (!doctor) return res.status(404).json({ error: "Doctor profile not found" });

    const grant = await prisma.recordAccess.findFirst({
      where: { doctorId: doctor.id, patientId: req.params.patientId, revokedAt: null },
    });
    if (!grant) return res.status(403).json({ error: "You are not authorized to view this patient" });

    const patient = await prisma.patient.findUnique({ where: { id: req.params.patientId } });
    if (!patient) return res.status(404).json({ error: "Patient not found" });

    const [history, records, prescriptions] = await Promise.all([
      grant.allRecords || grant.medicalHistory
        ? prisma.medicalHistoryEvent.findMany({ where: { patientId: patient.id }, orderBy: { eventDate: "desc" } })
        : [],
      prisma.medicalRecord.findMany({
        where: {
          patientId: patient.id,
          ...(grant.allRecords
            ? {}
            : {
                OR: [
                  ...(grant.labReports ? [{ recordType: { in: ["LAB_REPORT", "BLOOD_TEST"] as any } }] : []),
                  ...(grant.scanReports ? [{ recordType: "SCAN" as any }] : []),
                  ...(grant.hospitalRecords ? [{ recordType: { in: ["HOSPITAL_RECORD", "DISCHARGE_SUMMARY"] as any } }] : []),
                  ...(grant.prescriptions ? [{ recordType: "PRESCRIPTION" as any }] : []),
                ],
              }),
        },
        orderBy: { eventDate: "desc" },
      }),
      grant.allRecords || grant.prescriptions
        ? prisma.prescription.findMany({ where: { patientId: patient.id }, include: { medicines: true }, orderBy: { issuedAt: "desc" } })
        : [],
    ]);

    await logAudit(req.user!.userId, "DOCTOR_VIEWED_PATIENT_OVERVIEW", patient.id);

    const heightM = patient.heightCm ? patient.heightCm / 100 : undefined;
    const bmi = heightM && patient.weightKg ? Number((patient.weightKg / (heightM * heightM)).toFixed(1)) : undefined;

    res.json({
      patient: {
        id: patient.id,
        name: patient.name,
        bloodGroup: patient.bloodGroup,
        allergies: patient.allergies,
        existingConditions: patient.existingConditions,
        currentMedications: patient.currentMedications,
        heightCm: patient.heightCm,
        weightKg: patient.weightKg,
        bmi,
      },
      access: grant,
      history,
      records,
      prescriptions,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
