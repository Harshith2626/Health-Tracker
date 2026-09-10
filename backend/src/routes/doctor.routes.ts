import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth, requireRole, AuthRequest } from "../middleware/auth";

const router = Router();

// GET /api/doctors  ?specialization=&location=&name=  — doctor discovery/search
router.get("/", async (req, res, next) => {
  try {
    const { specialization, location, name } = req.query as Record<string, string>;

    const doctors = await prisma.doctor.findMany({
      where: {
        ...(specialization ? { specialization: { contains: specialization } } : {}),
        ...(location ? { location: { contains: location } } : {}),
        ...(name ? { name: { contains: name } } : {}),
      },
      orderBy: { name: "asc" },
    });

    res.json({ doctors });
  } catch (err) {
    next(err);
  }
});

// GET /api/doctors/me
router.get("/me", requireAuth, requireRole("DOCTOR"), async (req: AuthRequest, res, next) => {
  try {
    const doctor = await prisma.doctor.findUnique({ where: { userId: req.user!.userId } });
    if (!doctor) return res.status(404).json({ error: "Doctor profile not found" });
    res.json({ doctor });
  } catch (err) {
    next(err);
  }
});

// PUT /api/doctors/me
router.put("/me", requireAuth, requireRole("DOCTOR"), async (req: AuthRequest, res, next) => {
  try {
    const doctor = await prisma.doctor.findUnique({ where: { userId: req.user!.userId } });
    if (!doctor) return res.status(404).json({ error: "Doctor profile not found" });

    const {
      name, specialization, qualification, experienceYears,
      clinicName, location, biography, avatarUrl, consultationFee,
    } = req.body;

    const updated = await prisma.doctor.update({
      where: { id: doctor.id },
      data: {
        name, specialization, qualification, clinicName, location, biography, avatarUrl,
        experienceYears: experienceYears !== undefined ? Number(experienceYears) : undefined,
        consultationFee: consultationFee !== undefined ? Number(consultationFee) : undefined,
      },
    });

    res.json({ doctor: updated });
  } catch (err) {
    next(err);
  }
});

// GET /api/doctors/:id — public profile
router.get("/:id", async (req, res, next) => {
  try {
    const doctor = await prisma.doctor.findUnique({ where: { id: req.params.id } });
    if (!doctor) return res.status(404).json({ error: "Doctor not found" });
    res.json({ doctor });
  } catch (err) {
    next(err);
  }
});

export default router;
