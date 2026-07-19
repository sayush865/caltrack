// The earnable badge set (v2). Every badge here is computable from real data —
// no dead/unearnable trophies. Ids are stable strings stored in user_achievements.

import {
  Camera,
  CalendarCheck,
  Dumbbell,
  Flame,
  Scale,
  Sparkles,
  Trophy,
  UtensilsCrossed,
  type LucideIcon,
} from "lucide-react";

export interface BadgeInputs {
  mealsLogged: number;
  photosLogged: number;
  longestStreak: number;
  /** Most distinct logged days within any Monday-start week. */
  bestWeekDays: number;
  weightLogCount: number;
  /** Distinct days where protein total met the daily target. */
  proteinHitDays: number;
}

export interface BadgeDef {
  id: string;
  name: string;
  /** Locked-state caption: how to earn it. */
  criteria: string;
  icon: LucideIcon;
  /** Identity-hue token classes for the earned tile. */
  iconClass: string;
  tileClass: string;
  earnedBy: (i: BadgeInputs) => boolean;
}

export const BADGES: BadgeDef[] = [
  {
    id: "first_log",
    name: "First Bite",
    criteria: "Log your first meal",
    icon: Sparkles,
    iconClass: "text-primary",
    tileClass: "bg-primary-soft",
    earnedBy: (i) => i.mealsLogged >= 1,
  },
  {
    id: "streak_7",
    name: "One Full Week",
    criteria: "Log 7 days in a row",
    icon: Flame,
    iconClass: "text-streak",
    tileClass: "bg-streak-soft",
    earnedBy: (i) => i.longestStreak >= 7,
  },
  {
    id: "streak_30",
    name: "Thirty Straight",
    criteria: "Log 30 days in a row",
    icon: Trophy,
    iconClass: "text-carbs",
    tileClass: "bg-carbs-soft",
    earnedBy: (i) => i.longestStreak >= 30,
  },
  {
    id: "photos_10",
    name: "Plate Paparazzi",
    criteria: "Log 10 meals by photo",
    icon: Camera,
    iconClass: "text-water",
    tileClass: "bg-water-soft",
    earnedBy: (i) => i.photosLogged >= 10,
  },
  {
    id: "week_4days",
    name: "Solid Week",
    criteria: "Log 4+ days in one week",
    icon: CalendarCheck,
    iconClass: "text-success",
    tileClass: "bg-success-soft",
    earnedBy: (i) => i.bestWeekDays >= 4,
  },
  {
    id: "weight_5",
    name: "Trend Setter",
    criteria: "Weigh in 5 times",
    icon: Scale,
    iconClass: "text-fat",
    tileClass: "bg-fat-soft",
    earnedBy: (i) => i.weightLogCount >= 5,
  },
  {
    id: "meals_100",
    name: "Century Club",
    criteria: "Log 100 meals",
    icon: UtensilsCrossed,
    iconClass: "text-fiber",
    tileClass: "bg-fiber-soft",
    earnedBy: (i) => i.mealsLogged >= 100,
  },
  {
    id: "protein_7",
    name: "Protein Power",
    criteria: "Hit your protein target on 7 days",
    icon: Dumbbell,
    iconClass: "text-protein",
    tileClass: "bg-protein-soft",
    earnedBy: (i) => i.proteinHitDays >= 7,
  },
];

export function computeEarnedBadges(inputs: BadgeInputs): string[] {
  return BADGES.filter((b) => b.earnedBy(inputs)).map((b) => b.id);
}

export function badgeById(id: string): BadgeDef | undefined {
  return BADGES.find((b) => b.id === id);
}
