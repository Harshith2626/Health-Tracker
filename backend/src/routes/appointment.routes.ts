import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth, requireRole, AuthRequest } from "../middleware/auth";
import { logAudit, notify } from "../utils/audit";

const router = Router();

// ---------- Slots ----------

// POST /api/appointments/slots  (doctor creates available slots)
router.post("/slots", requireAuth, requireRole("DOCTOR"), async (req: AuthRequest, res, next) => {
  try {
    const doctor = await prisma.doctor.findUnique({ where: { userId: req.user!.userId } });
    if (!doctor) return res.status(404).json({ error: "Doctor profile not found" });

    const { slots } = req.body as { slots: { startTime: string; endTime: string }[] };
    if (!Array.isArray(slots) || slots.length === 0) {
      return res.status(400).json({ error: "slots must be a non-empty array of { startTime, endTime }" });
    }

    const created = await prisma.$transaction(
      slots.map((s) =>
        prisma.appointmentSlot.create({
          data: { doctorId: doctor.id, startTime: new Date(s.startTime), endTime: new Date(s.endTime) },
        })
      )
    );

    res.status(201).json({ slots: created });
  } catch (err) {
    next(err);
  }
});

// GET /api/appointments/slots/:doctorId  (public — available slots for a doctor)
router.get("/slots/:doctorId", async (req, res, next) => {
  try {
    const slots = await prisma.appointmentSlot.findMany({
      where: { doctorId: req.params.doctorId, isBooked: false, startTime: { gte: new Date() } },
      orderBy: { startTime: "asc" },
    });
    res.json({ slots });
  } catch (err) {
    next(err);
  }
});

// ---------- Appointments ----------

// POST /api/appointments  (patient requests an appointment for a slot)
router.post("/", requireAuth, requireRole("PATIENT"), async (req: AuthRequest, res, next) => {
  try {
    const patient = await prisma.patient.findUnique({ where: { userId: req.user!.userId } });
    if (!patient) return res.status(404).json({ error: "Patient profile not found" });

    const { doctorId, slotId, reasonForVisit } = req.body;
    if (!doctorId || !slotId) return res.status(400).json({ error: "doctorId and slotId are required" });

    const appointment = await prisma.$transaction(async (tx: any) => {
      const slot = await tx.appointmentSlot.findUnique({ where: { id: slotId } });
      if (!slot || slot.isBooked || slot.doctorId !== doctorId) {
        throw Object.assign(new Error("This slot is no longer available"), { status: 409 });
      }
      const created = await tx.appointment.create({
        data: { patientId: patient.id, doctorId, slotId, reasonForVisit, status: "PENDING" },
      });
      await tx.appointmentSlot.update({ where: { id: slotId }, data: { isBooked: true } });
      return created;
    });

    const doctor = await prisma.doctor.findUnique({ where: { id: doctorId }, include: { user: true } });
    if (doctor) {
      await notify(doctor.user.id, "APPOINTMENT_REQUEST", "New appointment request", `${patient.name} requested an appointment`);
    }
    await logAudit(req.user!.userId, "APPOINTMENT_REQUESTED", appointment.id);

    res.status(201).json({ appointment });
  } catch (err: any) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  }
});

// GET /api/appointments/me  (works for both roles)
router.get("/me", requireAuth, async (req: AuthRequest, res, next) => {
  try {
    if (req.user!.role === "PATIENT") {
      const patient = await prisma.patient.findUnique({ where: { userId: req.user!.userId } });
      if (!patient) return res.status(404).json({ error: "Patient profile not found" });
      const appointments = await prisma.appointment.findMany({
        where: { patientId: patient.id },
        include: { doctor: true, slot: true },
        orderBy: { createdAt: "desc" },
      });
      return res.json({ appointments });
    } else {
      const doctor = await prisma.doctor.findUnique({ where: { userId: req.user!.userId } });
      if (!doctor) return res.status(404).json({ error: "Doctor profile not found" });
      const appointments = await prisma.appointment.findMany({
        where: { doctorId: doctor.id },
        include: { patient: true, slot: true },
        orderBy: { createdAt: "desc" },
      });
      return res.json({ appointments });
    }
  } catch (err) {
    next(err);
  }
});

// PATCH /api/appointments/:id/status   { status: CONFIRMED|REJECTED|CANCELLED|COMPLETED|NO_SHOW }
router.patch("/:id/status", requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const { status } = req.body;
    const valid = ["CONFIRMED", "REJECTED", "CANCELLED", "COMPLETED", "NO_SHOW"];
    if (!valid.includes(status)) return res.status(400).json({ error: `status must be one of ${valid.join(", ")}` });

    const appointment = await prisma.appointment.findUnique({
      where: { id: req.params.id },
      include: { doctor: { include: { user: true } }, patient: { include: { user: true } }, slot: true },
    });
    if (!appointment) return res.status(404).json({ error: "Appointment not found" });

    // Doctors approve/reject/complete/no-show; patients cancel their own pending/confirmed appointment.
    if (req.user!.role === "DOCTOR") {
      if (appointment.doctor.userId !== req.user!.userId) return res.status(403).json({ error: "Not your appointment" });
    } else {
      if (appointment.patient.userId !== req.user!.userId) return res.status(403).json({ error: "Not your appointment" });
      if (status !== "CANCELLED") return res.status(403).json({ error: "Patients may only cancel appointments" });
    }

    const updated = await prisma.appointment.update({ where: { id: appointment.id }, data: { status } });

    // Free up the slot on rejection/cancellation
    if ((status === "REJECTED" || status === "CANCELLED") && appointment.slotId) {
      await prisma.appointmentSlot.update({ where: { id: appointment.slotId }, data: { isBooked: false } });
    }

    const recipientUserId =
      req.user!.role === "DOCTOR" ? appointment.patient.userId : appointment.doctor.userId;
    const typeMap: Record<string, any> = {
      CONFIRMED: "APPOINTMENT_APPROVED",
      REJECTED: "APPOINTMENT_REJECTED",
      CANCELLED: "APPOINTMENT_CANCELLED",
    };
    if (typeMap[status]) {
      await notify(recipientUserId, typeMap[status], "Appointment update", `Your appointment status is now ${status}`);
    }

    // Auto-manage a "next doctor visit" reminder for the patient
    if (status === "CONFIRMED" && appointment.slot) {
      const title = `Doctor visit: Dr. ${appointment.doctor.name}`;
      const existing = await prisma.reminder.findFirst({
        where: { patientId: appointment.patientId, type: "APPOINTMENT", title },
      });
      if (existing) {
        await prisma.reminder.update({ where: { id: existing.id }, data: { remindAt: appointment.slot.startTime, isDone: false } });
      } else {
        await prisma.reminder.create({
          data: {
            patientId: appointment.patientId,
            type: "APPOINTMENT",
            title,
            notes: appointment.reasonForVisit || undefined,
            remindAt: appointment.slot.startTime,
          },
        });
      }
    } else if ((status === "CANCELLED" || status === "REJECTED") && appointment.slot) {
      await prisma.reminder.deleteMany({
        where: { patientId: appointment.patientId, type: "APPOINTMENT", title: `Doctor visit: Dr. ${appointment.doctor.name}`, isDone: false },
      });
    }

    await logAudit(req.user!.userId, "APPOINTMENT_STATUS_UPDATED", `${appointment.id}:${status}`);
    res.json({ appointment: updated });
  } catch (err) {
    next(err);
  }
});

export default router;
