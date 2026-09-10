export type Role = "PATIENT" | "DOCTOR";

export interface Patient {
  id: string;
  userId: string;
  name: string;
  dateOfBirth?: string | null;
  gender?: string | null;
  bloodGroup?: string | null;
  phone?: string | null;
  address?: string | null;
  allergies?: string | null;
  existingConditions?: string | null;
  currentMedications?: string | null;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
  avatarUrl?: string | null;
  heightCm?: number | null;
  weightKg?: number | null;
}

export interface Doctor {
  id: string;
  userId: string;
  name: string;
  specialization: string;
  qualification?: string | null;
  experienceYears?: number | null;
  clinicName?: string | null;
  location?: string | null;
  biography?: string | null;
  avatarUrl?: string | null;
  consultationFee?: number | null;
}

export interface AuthUser {
  id: string;
  email: string;
  role: Role;
  profile: Patient | Doctor;
}

export type RecordType =
  | "LAB_REPORT" | "BLOOD_TEST" | "SCAN" | "PRESCRIPTION"
  | "DISCHARGE_SUMMARY" | "HOSPITAL_RECORD" | "CONSULTATION_REPORT" | "OTHER";

export interface MedicalRecord {
  id: string;
  patientId: string;
  recordType: RecordType;
  title: string;
  eventDate: string;
  hospital?: string | null;
  doctorName?: string | null;
  description?: string | null;
  fileUrl?: string | null;
  fileName?: string | null;
  fileMimeType?: string | null;
  createdAt: string;
}

export type HistoryEventType =
  | "CONSULTATION" | "DIAGNOSIS" | "LAB_TEST" | "HOSPITAL_VISIT" | "PRESCRIPTION" | "PROCEDURE" | "OTHER";

export interface MedicalHistoryEvent {
  id: string;
  patientId: string;
  doctorId?: string | null;
  doctor?: { name: string; specialization: string } | null;
  eventType: HistoryEventType;
  title: string;
  description?: string | null;
  eventDate: string;
}

export type AppointmentStatus = "PENDING" | "CONFIRMED" | "REJECTED" | "CANCELLED" | "COMPLETED" | "NO_SHOW";

export interface AppointmentSlot {
  id: string;
  doctorId: string;
  startTime: string;
  endTime: string;
  isBooked: boolean;
}

export interface Appointment {
  id: string;
  patientId: string;
  doctorId: string;
  slotId?: string | null;
  slot?: AppointmentSlot | null;
  reasonForVisit?: string | null;
  status: AppointmentStatus;
  createdAt: string;
  doctor?: Doctor;
  patient?: Patient;
}

export interface PrescriptionMedicine {
  id: string;
  name: string;
  dosage?: string | null;
  frequency?: string | null;
  duration?: string | null;
  instructions?: string | null;
}

export interface Prescription {
  id: string;
  patientId: string;
  doctorId: string;
  diagnosis?: string | null;
  notes?: string | null;
  issuedAt: string;
  medicines: PrescriptionMedicine[];
  doctor?: { name: string; specialization: string };
  patient?: { name: string };
}

export type ReminderType = "MEDICINE" | "APPOINTMENT" | "LAB" | "HOSPITAL" | "FOLLOW_UP";

export interface Reminder {
  id: string;
  patientId: string;
  type: ReminderType;
  title: string;
  notes?: string | null;
  remindAt: string;
  isDone: boolean;
  repeat?: string | null;
}

export interface RecordAccessGrant {
  id: string;
  patientId: string;
  doctorId: string;
  doctor?: Doctor;
  medicalHistory: boolean;
  labReports: boolean;
  prescriptions: boolean;
  scanReports: boolean;
  hospitalRecords: boolean;
  allRecords: boolean;
  grantedAt: string;
  revokedAt?: string | null;
}

export interface AppNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}
