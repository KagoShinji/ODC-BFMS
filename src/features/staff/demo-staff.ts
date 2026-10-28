"use client";

import { useCallback, useEffect, useState } from "react";
import { useFinance } from "@/data/demo/finance-provider";
import {
  canManageRole,
  isMemberRole,
  roleLabel,
  validateNewStaff,
  type AccessLevel,
  type NewStaff,
  type StaffMember,
} from "@/lib/auth/roles";

const STORAGE_KEY = "odc-bfms-demo-staff-v1";

const seedStaff: StaffMember[] = [
  {
    userId: "s1",
    fullName: "Teresa Navarro",
    email: "teresa.navarro@sanisidro.example",
    role: "admin",
    active: true,
    createdAt: "2026-01-05",
  },
  {
    userId: "s2",
    fullName: "Ramon Villanueva",
    email: "ramon.villanueva@sanisidro.example",
    role: "treasurer",
    active: true,
    createdAt: "2026-01-05",
  },
  {
    userId: "s3",
    fullName: "Ana Dela Cruz",
    email: "ana.delacruz@sanisidro.example",
    role: "budget",
    active: true,
    createdAt: "2026-01-12",
  },
  {
    userId: "s4",
    fullName: "Paolo Garcia",
    email: "paolo.garcia@sanisidro.example",
    role: "approver",
    active: true,
    createdAt: "2026-02-02",
  },
  {
    userId: "s5",
    fullName: "Liza Mercado",
    email: "liza.mercado@sanisidro.example",
    role: "collector",
    active: true,
    createdAt: "2026-03-09",
  },
  {
    userId: "s6",
    fullName: "Carlo Reyes",
    email: "carlo.reyes@sanisidro.example",
    role: "encoder",
    active: false,
    createdAt: "2026-04-21",
  },
];

function stored(): StaffMember[] | null {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null");
    if (
      Array.isArray(parsed) &&
      parsed.every(
        (item) =>
          typeof item?.userId === "string" &&
          typeof item.fullName === "string" &&
          typeof item.email === "string" &&
          isMemberRole(item.role) &&
          typeof item.active === "boolean",
      )
    )
      return parsed;
  } catch {
    localStorage.removeItem(STORAGE_KEY);
  }
  return null;
}

/** Browser-only staff directory for the demo. Entries cannot sign in. */
export function useDemoStaff(level: AccessLevel) {
  const { recordActivity } = useFinance();
  const [members, setMembers] = useState<StaffMember[]>(seedStaff);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const saved = stored();
    if (saved) setMembers(saved);
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (loaded) localStorage.setItem(STORAGE_KEY, JSON.stringify(members));
  }, [members, loaded]);

  const add = useCallback(
    async (input: NewStaff) => {
      const error = validateNewStaff(input, level, { requirePassword: false });
      if (error) return error;
      const email = input.email.trim().toLowerCase();
      const existing = members.find((member) => member.email === email);
      if (members.some((member) => member.email === email && member.role === input.role))
        return "This person already has that role. Reactivate it from the list instead.";
      const member: StaffMember = {
        userId: existing?.userId ?? crypto.randomUUID(),
        fullName: existing?.fullName ?? input.fullName.trim(),
        email,
        role: input.role,
        active: true,
        createdAt: new Date().toISOString().slice(0, 10),
      };
      setMembers((current) => [member, ...current]);
      recordActivity(
        "Staff role granted",
        member.fullName,
        `${roleLabel[member.role]} · ${member.email}`,
      );
      return null;
    },
    [level, members, recordActivity],
  );

  const setActive = useCallback(
    async (target: StaffMember, active: boolean) => {
      if (!canManageRole(level, target.role))
        return "Only a super admin can change administrator access.";
      setMembers((current) =>
        current.map((member) =>
          member.userId === target.userId && member.role === target.role
            ? { ...member, active }
            : member,
        ),
      );
      recordActivity(
        active ? "Staff access restored" : "Staff access deactivated",
        target.fullName,
        roleLabel[target.role],
      );
      return null;
    },
    [level, recordActivity],
  );

  return { members, loaded, add, setActive };
}
