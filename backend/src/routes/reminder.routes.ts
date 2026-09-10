import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth, requireRole, AuthRequest } from "../middleware/auth";
import { logAudit } from "../utils/audit";

const router = Router();

// GET /api/reminders
router.get("/", requireAuth, requireRole("PATIENT"), async (req: AuthRequest, res, next) => {
  try {
    const patient = await prisma.patient.findUnique({ where: { userId: req.user!.userId } });
    if (!patient) return res.status(404).json({ error: "Patient profile not found" });

    const reminders = await prisma.reminder.findMany({
      where: { patientId: patient.id },
      orderBy: { remindAt: "asc" },
    });

    res.json({ reminders });
  } catch (err) {
    next(err);
  }
});

// POST /api/reminders
router.post("/", requireAuth, requireRole("PATIENT"), async (req: AuthRequest, res, next) => {
  try {
    const patient = await prisma.patient.findUnique({ where: { userId: req.user!.userId } });
    if (!patient) return res.status(404).json({ error: "Patient profile not found" });

    const { type, title, notes, remindAt, repeat } = req.body;
    if (!type || !title || !remindAt) {
      return res.status(400).json({ error: "type, title, and remindAt are required" });
    }

    const reminder = await prisma.reminder.create({
      data: { patientId: patient.id, type, title, notes, remindAt: new Date(remindAt), repeat },
    });

    await logAudit(req.user!.userId, "REMINDER_CREATED", reminder.id);
    res.status(201).json({ reminder });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/reminders/:id  (toggle done / edit)
router.patch("/:id", requireAuth, requireRole("PATIENT"), async (req: AuthRequest, res, next) => {
  try {
    const patient = await prisma.patient.findUnique({ where: { userId: req.user!.userId } });
    if (!patient) return res.status(404).json({ error: "Patient profile not found" });

    const reminder = await prisma.reminder.findUnique({ where: { id: req.params.id } });
    if (!reminder || reminder.patientId !== patient.id) return res.status(404).json({ error: "Reminder not found" });

    const { isDone, title, notes, remindAt, repeat, type } = req.body;
    const updated = await prisma.reminder.update({
      where: { id: reminder.id },
      data: {
        isDone, title, notes, repeat, type,
        remindAt: remindAt ? new Date(remindAt) : undefined,
      },
    });

    res.json({ reminder: updated });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/reminders/:id
router.delete("/:id", requireAuth, requireRole("PATIENT"), async (req: AuthRequest, res, next) => {
  try {
    const patient = await prisma.patient.findUnique({ where: { userId: req.user!.userId } });
    if (!patient) return res.status(404).json({ error: "Patient profile not found" });

    const reminder = await prisma.reminder.findUnique({ where: { id: req.params.id } });
    if (!reminder || reminder.patientId !== patient.id) return res.status(404).json({ error: "Reminder not found" });

    await prisma.reminder.delete({ where: { id: reminder.id } });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

export default router;
