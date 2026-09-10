import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth, requireRole, AuthRequest } from "../middleware/auth";
import {
  aiAssistantReply, aiExplainReport, aiAnalyzePrescription, aiHealthSummary,
  aiPatientStatusBrief, aiExtractReminders, AI_DEMO_MODE,
} from "../utils/ai";

const router = Router();

router.get("/status", requireAuth, (_req, res) => {
  res.json({ demoMode: AI_DEMO_MODE });
});

// ---------- 12. AI Health Assistant (general Q&A, conversational, persisted) ----------

router.get("/assistant/conversations", requireAuth, requireRole("PATIENT"), async (req: AuthRequest, res, next) => {
  try {
    const patient = await prisma.patient.findUnique({ where: { userId: req.user!.userId } });
    if (!patient) return res.status(404).json({ error: "Patient profile not found" });
    const conversations = await prisma.aIConversation.findMany({
      where: { patientId: patient.id },
      orderBy: { createdAt: "desc" },
    });
    res.json({ conversations });
  } catch (err) {
    next(err);
  }
});

router.get("/assistant/conversations/:id/messages", requireAuth, requireRole("PATIENT"), async (req: AuthRequest, res, next) => {
  try {
    const messages = await prisma.aIMessage.findMany({
      where: { conversationId: req.params.id },
      orderBy: { createdAt: "asc" },
    });
    res.json({ messages });
  } catch (err) {
    next(err);
  }
});

// POST /api/ai/assistant  { message, conversationId? }
router.post("/assistant", requireAuth, requireRole("PATIENT"), async (req: AuthRequest, res, next) => {
  try {
    const patient = await prisma.patient.findUnique({ where: { userId: req.user!.userId } });
    if (!patient) return res.status(404).json({ error: "Patient profile not found" });

    const { message, conversationId } = req.body;
    if (!message) return res.status(400).json({ error: "message is required" });

    let conversation = conversationId
      ? await prisma.aIConversation.findUnique({ where: { id: conversationId } })
      : null;

    if (!conversation) {
      conversation = await prisma.aIConversation.create({
        data: { patientId: patient.id, title: message.slice(0, 60) },
      });
    }

    const history = await prisma.aIMessage.findMany({
      where: { conversationId: conversation.id },
      orderBy: { createdAt: "asc" },
      take: 20,
    });

    await prisma.aIMessage.create({ data: { conversationId: conversation.id, role: "user", content: message } });

    const { reply, demo } = await aiAssistantReply(message, history.map((h: any) => ({ role: h.role, content: h.content })));

    await prisma.aIMessage.create({ data: { conversationId: conversation.id, role: "assistant", content: reply } });

    res.json({ conversationId: conversation.id, reply, demo });
  } catch (err) {
    next(err);
  }
});

// ---------- 13. AI Prescription Analyzer ----------
// body: { prescriptionText }  (text pasted from / describing the uploaded prescription)
router.post("/analyze-prescription", requireAuth, requireRole("PATIENT"), async (req: AuthRequest, res, next) => {
  try {
    const { prescriptionText } = req.body;
    if (!prescriptionText) return res.status(400).json({ error: "prescriptionText is required" });
    const result = await aiAnalyzePrescription(prescriptionText);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// ---------- 14. AI Medical Report Explainer ----------
// body: { reportText }
router.post("/explain-report", requireAuth, requireRole("PATIENT"), async (req: AuthRequest, res, next) => {
  try {
    const { reportText } = req.body;
    if (!reportText) return res.status(400).json({ error: "reportText is required" });
    const result = await aiExplainReport(reportText);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// ---------- 15. AI Patient Health Summary ----------
router.get("/health-summary", requireAuth, requireRole("PATIENT"), async (req: AuthRequest, res, next) => {
  try {
    const patient = await prisma.patient.findUnique({ where: { userId: req.user!.userId } });
    if (!patient) return res.status(404).json({ error: "Patient profile not found" });

    const [history, records, prescriptions] = await Promise.all([
      prisma.medicalHistoryEvent.findMany({ where: { patientId: patient.id }, orderBy: { eventDate: "desc" }, take: 15 }),
      prisma.medicalRecord.findMany({ where: { patientId: patient.id }, orderBy: { eventDate: "desc" }, take: 15 }),
      prisma.prescription.findMany({ where: { patientId: patient.id }, include: { medicines: true }, orderBy: { issuedAt: "desc" }, take: 10 }),
    ]);

    const profileSummary = `
Patient: ${patient.name}, Blood group: ${patient.bloodGroup || "unknown"}
Allergies: ${patient.allergies || "none listed"}
Existing conditions: ${patient.existingConditions || "none listed"}
Current medications: ${patient.currentMedications || "none listed"}

Recent history events:
${history.map((h: any) => `- ${h.eventDate.toISOString().slice(0, 10)}: ${h.eventType} — ${h.title}`).join("\n") || "none"}

Recent records:
${records.map((r: any) => `- ${r.eventDate.toISOString().slice(0, 10)}: ${r.recordType} — ${r.title}`).join("\n") || "none"}

Recent prescriptions:
${prescriptions.map((p: any) => `- ${p.issuedAt.toISOString().slice(0, 10)}: ${p.medicines.map((m: any) => m.name).join(", ")}`).join("\n") || "none"}
`.trim();

    const result = await aiHealthSummary(profileSummary);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// ---------- Doctor: one-click AI patient status brief (uses authorized data only) ----------
router.get("/patient-brief/:patientId", requireAuth, requireRole("DOCTOR"), async (req: AuthRequest, res, next) => {
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
        ? prisma.medicalHistoryEvent.findMany({ where: { patientId: patient.id }, orderBy: { eventDate: "desc" }, take: 15 })
        : [],
      prisma.medicalRecord.findMany({ where: { patientId: patient.id }, orderBy: { eventDate: "desc" }, take: 15 }),
      grant.allRecords || grant.prescriptions
        ? prisma.prescription.findMany({ where: { patientId: patient.id }, include: { medicines: true }, orderBy: { issuedAt: "desc" }, take: 10 })
        : [],
    ]);

    const heightM = patient.heightCm ? patient.heightCm / 100 : undefined;
    const bmi = heightM && patient.weightKg ? (patient.weightKg / (heightM * heightM)).toFixed(1) : undefined;

    const clinicalContext = `
Patient: ${patient.name}
Blood group: ${patient.bloodGroup || "unknown"}
Allergies: ${patient.allergies || "none listed"}
Existing conditions: ${patient.existingConditions || "none listed"}
Current medications: ${patient.currentMedications || "none listed"}
${bmi ? `BMI: ${bmi} (height ${patient.heightCm}cm, weight ${patient.weightKg}kg)` : ""}

Recent history:
${history.map((h: any) => `- ${h.eventDate.toISOString().slice(0, 10)}: ${h.eventType} — ${h.title}${h.description ? `: ${h.description}` : ""}`).join("\n") || "none authorized"}

Recent records:
${records.map((r: any) => `- ${r.eventDate.toISOString().slice(0, 10)}: ${r.recordType} — ${r.title}`).join("\n") || "none"}

Recent prescriptions:
${prescriptions.map((p: any) => `- ${p.issuedAt.toISOString().slice(0, 10)}: ${p.medicines.map((m: any) => `${m.name} (${m.dosage || ""} ${m.frequency || ""})`).join(", ")}`).join("\n") || "none authorized"}
`.trim();

    const result = await aiPatientStatusBrief(clinicalContext);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// ---------- Patient: auto-generate reminders from an uploaded record ----------
router.post("/generate-reminders", requireAuth, requireRole("PATIENT"), async (req: AuthRequest, res, next) => {
  try {
    const patient = await prisma.patient.findUnique({ where: { userId: req.user!.userId } });
    if (!patient) return res.status(404).json({ error: "Patient profile not found" });

    const { recordId, text } = req.body;
    let sourceText = text as string | undefined;

    if (!sourceText && recordId) {
      const record = await prisma.medicalRecord.findUnique({ where: { id: recordId } });
      if (!record || record.patientId !== patient.id) return res.status(404).json({ error: "Record not found" });
      sourceText = [record.title, record.description].filter(Boolean).join("\n");
    }

    if (!sourceText || !sourceText.trim()) {
      return res.status(400).json({ error: "Provide either recordId (with a description) or text to analyze" });
    }

    const { data, demo } = await aiExtractReminders(sourceText);

    const created: any[] = [];
    for (const m of data.medicines) {
      if (!m.name?.trim()) continue;
      const reminder = await prisma.reminder.create({
        data: {
          patientId: patient.id,
          type: "MEDICINE",
          title: `Take ${m.name}${m.frequency ? ` (${m.frequency})` : ""}`,
          notes: [m.instructions, m.durationDays ? `For ${m.durationDays} day(s)` : null].filter(Boolean).join(". ") || undefined,
          remindAt: new Date(Date.now() + 60 * 60 * 1000),
          repeat: m.frequency || "daily",
        },
      });
      created.push(reminder);
    }

    if (data.followUpDate) {
      const followUp = new Date(data.followUpDate);
      if (!isNaN(followUp.getTime())) {
        const reminder = await prisma.reminder.create({
          data: {
            patientId: patient.id,
            type: "FOLLOW_UP",
            title: "Follow-up mentioned in your record",
            remindAt: followUp,
          },
        });
        created.push(reminder);
      }
    }

    res.status(201).json({ created, demo });
  } catch (err) {
    next(err);
  }
});

export default router;
