import { Router } from "express";
import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma";
import { signToken } from "../utils/jwt";
import { requireAuth, AuthRequest } from "../middleware/auth";
import { logAudit } from "../utils/audit";

const router = Router();

// POST /api/auth/register  { role: "PATIENT"|"DOCTOR", email, password, name, ...roleFields }
router.post("/register", async (req, res, next) => {
  try {
    const { role, email, password, name } = req.body;

    if (!role || !email || !password || !name) {
      return res.status(400).json({ error: "role, email, password, and name are required" });
    }
    if (!["PATIENT", "DOCTOR"].includes(role)) {
      return res.status(400).json({ error: "role must be PATIENT or DOCTOR" });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters" });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(409).json({ error: "An account with this email already exists" });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        role,
        ...(role === "PATIENT"
          ? {
              patient: {
                create: {
                  name,
                  dateOfBirth: req.body.dateOfBirth ? new Date(req.body.dateOfBirth) : undefined,
                  gender: req.body.gender,
                  bloodGroup: req.body.bloodGroup,
                  phone: req.body.phone,
                },
              },
            }
          : {
              doctor: {
                create: {
                  name,
                  specialization: req.body.specialization || "General Physician",
                  qualification: req.body.qualification,
                  experienceYears: req.body.experienceYears ? Number(req.body.experienceYears) : undefined,
                  clinicName: req.body.clinicName,
                  location: req.body.location,
                },
              },
            }),
      },
      include: { patient: true, doctor: true },
    });

    const token = signToken({ userId: user.id, role: user.role as "PATIENT" | "DOCTOR" });
    await logAudit(user.id, "USER_REGISTERED", role);

    res.status(201).json({
      token,
      user: { id: user.id, email: user.email, role: user.role, profile: user.patient || user.doctor },
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/login  { email, password }
router.post("/login", async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "email and password are required" });
    }

    const user = await prisma.user.findUnique({
      where: { email },
      include: { patient: true, doctor: true },
    });
    if (!user) return res.status(401).json({ error: "Invalid email or password" });

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return res.status(401).json({ error: "Invalid email or password" });

    const token = signToken({ userId: user.id, role: user.role as "PATIENT" | "DOCTOR" });
    await logAudit(user.id, "USER_LOGGED_IN");

    res.json({
      token,
      user: { id: user.id, email: user.email, role: user.role, profile: user.patient || user.doctor },
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/auth/me
router.get("/me", requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      include: { patient: true, doctor: true },
    });
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json({
      user: { id: user.id, email: user.email, role: user.role, profile: user.patient || user.doctor },
    });
  } catch (err) {
    next(err);
  }
});

export default router;
