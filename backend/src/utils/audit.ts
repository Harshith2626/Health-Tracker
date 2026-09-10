import { prisma } from "../lib/prisma";

export async function logAudit(userId: string, action: string, details?: string) {
  try {
    await prisma.auditLog.create({ data: { userId, action, details } });
  } catch (err) {
    // Auditing should never break the main request flow.
    console.error("Failed to write audit log:", err);
  }
}

export async function notify(
  userId: string,
  type:
    | "APPOINTMENT_REQUEST"
    | "APPOINTMENT_APPROVED"
    | "APPOINTMENT_REJECTED"
    | "APPOINTMENT_CANCELLED"
    | "NEW_PRESCRIPTION"
    | "MEDICINE_REMINDER"
    | "RECORD_SHARED"
    | "ACCESS_REVOKED"
    | "GENERAL",
  title: string,
  message: string
) {
  try {
    await prisma.notification.create({ data: { userId, type, title, message } });
  } catch (err) {
    console.error("Failed to create notification:", err);
  }
}
