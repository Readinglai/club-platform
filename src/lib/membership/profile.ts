/**
 * The "complete your profile" details, collected once and reused.
 *
 * Until a profile is saved, it is pre-filled from the person's copied
 * membership (the old member list), matched through Membership.legacyId.
 */

import { db } from "@/lib/db";

export type ProfileInput = {
  name: string;
  phone: string;
  studentNumber: string;
  program: string;
  yearOfStudy: string;
  personalEmail: string;
};

export const REQUIRED_PROFILE_FIELDS = ["name", "phone", "studentNumber", "program", "yearOfStudy"] as const;

export async function getProfileForForm(userId: string): Promise<ProfileInput & { completed: boolean }> {
  const user = await db.user.findUniqueOrThrow({
    where: { id: userId },
    select: { name: true, major: true, profile: true },
  });

  if (user.profile) {
    const p = user.profile;
    return {
      name: user.name,
      phone: p.phone ?? "",
      studentNumber: p.studentNumber ?? "",
      program: p.program ?? "",
      yearOfStudy: p.yearOfStudy ?? "",
      personalEmail: p.personalEmail ?? "",
      completed: p.completedAt !== null,
    };
  }

  // Pre-fill from the old member list, if this account has a copied membership.
  const imported = await db.membership.findFirst({
    where: { userId, legacyId: { not: null } },
    orderBy: { termStart: "desc" },
    select: { legacyId: true },
  });
  const legacy = imported?.legacyId
    ? await db.rOCSAUT_Membership_Info.findUnique({
        where: { id: imported.legacyId },
        select: { name: true, student_number: true, year_of_study: true, personal_email: true },
      })
    : null;

  return {
    name: user.name || legacy?.name || "",
    phone: "",
    studentNumber: legacy?.student_number ?? "",
    program: user.major ?? "",
    yearOfStudy: legacy?.year_of_study ?? "",
    personalEmail: legacy?.personal_email ?? "",
    completed: false,
  };
}

/** Validates and saves; returns the missing required fields, if any. */
export async function saveProfile(userId: string, raw: Partial<Record<keyof ProfileInput, unknown>>) {
  const value = (key: keyof ProfileInput) => (typeof raw[key] === "string" ? (raw[key] as string).trim() : "");
  const input: ProfileInput = {
    name: value("name").replace(/\s+/g, " "),
    phone: value("phone"),
    studentNumber: value("studentNumber"),
    program: value("program"),
    yearOfStudy: value("yearOfStudy"),
    personalEmail: value("personalEmail").toLowerCase(),
  };

  const missing = REQUIRED_PROFILE_FIELDS.filter((key) => !input[key]);
  if (missing.length > 0) return { ok: false as const, missing };

  if (input.personalEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.personalEmail)) {
    return { ok: false as const, missing: ["personalEmail" as const] };
  }

  const data = {
    phone: input.phone,
    studentNumber: input.studentNumber,
    program: input.program,
    yearOfStudy: input.yearOfStudy,
    personalEmail: input.personalEmail || null,
    completedAt: new Date(),
  };

  await db.$transaction([
    db.user.update({ where: { id: userId }, data: { name: input.name } }),
    db.profile.upsert({ where: { userId }, create: { userId, ...data }, update: data }),
  ]);

  return { ok: true as const };
}

export async function isProfileComplete(userId: string) {
  const profile = await db.profile.findUnique({ where: { userId }, select: { completedAt: true } });
  return Boolean(profile?.completedAt);
}
