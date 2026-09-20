import { syncProfile } from "./cloudState";
export type StudyJourneyType = "faculdade" | "concurso" | "vestibular" | "escola" | "certificacao" | "outro";

export type StudyProfile = {
  journeyType: StudyJourneyType;
  objective: string;
  targetDate?: string;
  availableMinutesPerDay: number;
  preferredStudyDays: number[];
};

const STORAGE_KEY = "nexo-study-profile";

export const defaultStudyProfile: StudyProfile = {
  journeyType: "faculdade",
  objective: "Organizar meus estudos",
  availableMinutesPerDay: 90,
  preferredStudyDays: [1, 2, 3, 4, 5],
};

export function loadStudyProfile(): StudyProfile {
  if (typeof window === "undefined") return defaultStudyProfile;
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    return saved ? { ...defaultStudyProfile, ...JSON.parse(saved) } : defaultStudyProfile;
  } catch {
    return defaultStudyProfile;
  }
}

export function saveStudyProfile(profile: StudyProfile) {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
    void syncProfile(profile);
  }
}
