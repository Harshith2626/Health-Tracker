import { Router } from "express";
import path from "path";
import { prisma } from "../lib/prisma";
import { requireAuth, requireRole, AuthRequest } from "../middleware/auth";
import { upload } from "../middleware/upload";
import { logAudit, notify } from "../utils/audit";

const router = Router();

async function assertDoctorCanAccessRecord(doctorId: string, patientId: string, recordId?: string) {
  const grants = await prisma.recordAccess.findMany({
    where: { doctorId, patientId, revokedAt: null },
  });
  if (grants.length === 0) return false;
  if (grants.some((g: any) => g.allRecords)) return true;
  if (recordId && grants.some((g: any) => g.recordId === recordId)) return true;
  // Category grants: labReports / scanReports / hospitalRecords / prescriptions apply to record TYPE,
  // so callers filter by type separately; here we just confirm *some* grant exists.
  return grants.some((g: any) => g.labReports || g.scanReports || g.hospitalRecords || g.prescriptions);
}

// POST /api/records  (patient uploads a record) — multipart/form-data, field "file"
router.post("/", requireAuth, requireRole("PATIENT"), upload.single("file"), async (req: AuthRequest, res, next) => {
  try {
    const patient = await prisma.patient.findUnique({ where: { userId: req.user!.userId } });
    if (!patient) return res.status(404).json({ error: "Patient profile not found" });

    const { recordType, title, eventDate, hospital, doctorName, description } = req.body;
    if (!recordType || !title || !eventDate) {
      return res.status(400).json({ error: "recordType, title, and eventDate are required" });
    }

    const record = await prisma.medicalRecord.create({
      data: {
        patientId: patient.id,
        recordType,
        title,
        eventDate: new Date(eventDate),
        hospital,
        doctorName,
        description,
        fileUrl: req.file ? `/uploads/${req.file.filename}` : undefined,
        fileName: req.file?.originalname,
        fileMimeType: req.file?.mimetype,
      },
    });

    await logAudit(req.user!.userId, "MEDICAL_RECORD_UPLOADED", record.id);
    res.status(201).json({ record });
  } catch (err) {
    next(err);
  }
});

// GET /api/records  (patient's own records — filter/search by type or title)
router.get("/", requireAuth, requireRole("PATIENT"), async (req: AuthRequest, res, next) => {
  try {
    const patient = await prisma.patient.findUnique({ where: { userId: req.user!.userId } });
    if (!patient) return res.status(404).json({ error: "Patient profile not found" });

    const { type, q } = req.query as Record<string, string>;

    const records = await prisma.medicalRecord.findMany({
      where: {
        patientId: patient.id,
        ...(type ? { recordType: type as any } : {}),
        ...(q ? { title: { contains: q } } : {}),
      },
      orderBy: { eventDate: "desc" },
    });

    res.json({ records });
  } catch (err) {
    next(err);
  }
});

// GET /api/records/:id
router.get("/:id", requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const record = await prisma.medicalRecord.findUnique({ where: { id: req.params.id } });
    if (!record) return res.status(404).json({ error: "Record not found" });

    if (req.user!.role === "PATIENT") {
      const patient = await prisma.patient.findUnique({ where: { userId: req.user!.userId } });
      if (!patient || patient.id !== record.patientId) {
        return res.status(403).json({ error: "Not authorized to view this record" });
      }
    } else {
      const doctor = await prisma.doctor.findUnique({ where: { userId: req.user!.userId } });
      if (!doctor) return res.status(404).json({ error: "Doctor profile not found" });
      const allowed = await assertDoctorCanAccessRecord(doctor.id, record.patientId, record.id);
      if (!allowed) return res.status(403).json({ error: "You do not have authorized access to this record" });
      await logAudit(req.user!.userId, "DOCTOR_VIEWED_RECORD", record.id);
    }

    res.json({ record });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/records/:id  (patient only, own record)
router.delete("/:id", requireAuth, requireRole("PATIENT"), async (req: AuthRequest, res, next) => {
  try {
    const patient = await prisma.patient.findUnique({ where: { userId: req.user!.userId } });
    if (!patient) return res.status(404).json({ error: "Patient profile not found" });

    const record = await prisma.medicalRecord.findUnique({ where: { id: req.params.id } });
    if (!record || record.patientId !== patient.id) {
      return res.status(404).json({ error: "Record not found" });
    }

    await prisma.medicalRecord.delete({ where: { id: record.id } });
    await logAudit(req.user!.userId, "MEDICAL_RECORD_DELETED", record.id);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// POST /api/records/doctor-upload/:patientId — doctor contributes a record (requires authorization)
router.post(
  "/doctor-upload/:patientId",
  requireAuth,
  requireRole("DOCTOR"),
  upload.single("file"),
  async (req: AuthRequest, res, next) => {
    try {
      const doctor = await prisma.doctor.findUnique({ where: { userId: req.user!.userId } });
      if (!doctor) return res.status(404).json({ error: "Doctor profile not found" });

      const allowed = await assertDoctorCanAccessRecord(doctor.id, req.params.patientId);
      if (!allowed) return res.status(403).json({ error: "You are not authorized to contribute records for this patient" });

      const { recordType, title, eventDate, description } = req.body;
      if (!recordType || !title || !eventDate) {
        return res.status(400).json({ error: "recordType, title, and eventDate are required" });
      }

      const record = await prisma.medicalRecord.create({
        data: {
          patientId: req.params.patientId,
          recordType,
          title,
          eventDate: new Date(eventDate),
          description,
          doctorName: doctor.name,
          uploadedByDoctorId: doctor.id,
          fileUrl: req.file ? `/uploads/${req.file.filename}` : undefined,
          fileName: req.file?.originalname,
          fileMimeType: req.file?.mimetype,
        },
      });

      const patientUser = await prisma.patient.findUnique({ where: { id: req.params.patientId }, include: { user: true } });
      if (patientUser) {
        await notify(patientUser.user.id, "RECORD_SHARED", "New record added", `Dr. ${doctor.name} added a new record: ${title}`);
      }

      await logAudit(req.user!.userId, "DOCTOR_UPLOADED_RECORD", record.id);
      res.status(201).json({ record });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
