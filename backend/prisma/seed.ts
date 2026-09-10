import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const patientPassword = await bcrypt.hash("patient123", 10);
  const doctorPassword = await bcrypt.hash("doctor123", 10);

  const patientUser = await prisma.user.upsert({
    where: { email: "patient@demo.com" },
    update: {},
    create: {
      email: "patient@demo.com",
      passwordHash: patientPassword,
      role: "PATIENT",
      patient: {
        create: {
          name: "Asha Rao",
          gender: "Female",
          bloodGroup: "O+",
          phone: "9876543210",
          allergies: "Penicillin",
          existingConditions: "Mild asthma",
          currentMedications: "Salbutamol inhaler (as needed)",
          emergencyContactName: "Rohan Rao",
          emergencyContactPhone: "9876500000",
        },
      },
    },
    include: { patient: true },
  });

  const doctorUser = await prisma.user.upsert({
    where: { email: "doctor@demo.com" },
    update: {},
    create: {
      email: "doctor@demo.com",
      passwordHash: doctorPassword,
      role: "DOCTOR",
      doctor: {
        create: {
          name: "Dr. Meera Iyer",
          specialization: "General Physician",
          qualification: "MBBS, MD",
          experienceYears: 9,
          clinicName: "Sunrise Clinic",
          location: "Bengaluru",
          biography: "General physician focused on preventive care and chronic condition management.",
          consultationFee: 500,
        },
      },
    },
    include: { doctor: true },
  });

  if (patientUser.patient && doctorUser.doctor) {
    await prisma.medicalHistoryEvent.createMany({
      data: [
        {
          patientId: patientUser.patient.id,
          doctorId: doctorUser.doctor.id,
          eventType: "CONSULTATION",
          title: "Routine checkup",
          description: "General wellness checkup, no concerns.",
          eventDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30),
        },
        {
          patientId: patientUser.patient.id,
          eventType: "LAB_TEST",
          title: "Annual blood work",
          description: "CBC and lipid profile within normal range.",
          eventDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 20),
        },
      ],
    });

    await prisma.recordAccess.upsert({
      where: {
        patientId_doctorId_recordId: {
          patientId: patientUser.patient.id,
          doctorId: doctorUser.doctor.id,
          recordId: "CATEGORY",
        },
      },
      update: {},
      create: {
        patientId: patientUser.patient.id,
        doctorId: doctorUser.doctor.id,
        allRecords: true,
      },
    });

    await prisma.appointmentSlot.createMany({
      data: [
        {
          doctorId: doctorUser.doctor.id,
          startTime: new Date(Date.now() + 1000 * 60 * 60 * 24),
          endTime: new Date(Date.now() + 1000 * 60 * 60 * 24 + 1000 * 60 * 30),
        },
        {
          doctorId: doctorUser.doctor.id,
          startTime: new Date(Date.now() + 1000 * 60 * 60 * 24 * 2),
          endTime: new Date(Date.now() + 1000 * 60 * 60 * 24 * 2 + 1000 * 60 * 30),
        },
      ],
    });
  }

  console.log("Seed complete. Demo logins:");
  console.log("  Patient -> patient@demo.com / patient123");
  console.log("  Doctor  -> doctor@demo.com / doctor123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
