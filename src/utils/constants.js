import {
  Home, Flame,
} from "lucide-react";

export const ACTIVITY_LEVELS = [
  { id: "sedentary", label: "Sédentaire" },
  { id: "light", label: "Léger" },
  { id: "moderate", label: "Modéré" },
  { id: "high", label: "Élevé" },
  { id: "very_high", label: "Très élevé" },
];

export const GOALS = [
  { id: "hypertrophy", label: "Prise de muscle" },
  { id: "weightloss", label: "Perte de poids" },
  { id: "performance", label: "Performance" },
  { id: "hyrox", label: "Hyrox" },
  { id: "strength", label: "Force" },
];

export const LEVELS = [
  { id: "beginner", label: "Débutant" },
  { id: "intermediate", label: "Intermédiaire" },
  { id: "advanced", label: "Avancé" },
];

export const NUTRITION_GOALS = [
  { id: "cut", label: "Sèche" },
  { id: "maintain", label: "Maintien" },
  { id: "bulk", label: "Prise de masse" },
];

// --- Formulaire "Informations" du coach nutritionnel : toujours modifiable -------------

export const PERIODS = [
  { id: "1w", label: "1 sem.", days: 7 }, { id: "1m", label: "1 mois", days: 30 },
  { id: "3m", label: "3 mois", days: 90 }, { id: "6m", label: "6 mois", days: 180 },
  { id: "1y", label: "1 an", days: 365 }, { id: "all", label: "Tout", days: null },
];

export const TAB_TITLES = {
  dashboard: "Aujourd'hui", workout: "Séance en cours",
};

export const TAB_ICONS = {
  dashboard: Home, workout: Flame,
};
