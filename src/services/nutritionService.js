import { NutritionScreen } from "../components/common/NutritionScreen";

export const EnergyCalculator = {
  // Âge exact calculé à partir de la date de naissance (nécessaire pour Mifflin-St Jeor).
  computeAge(birthdate) {
    if (!birthdate) return null;
    const b = new Date(birthdate);
    const now = new Date();
    let age = now.getFullYear() - b.getFullYear();
    const m = now.getMonth() - b.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < b.getDate())) age--;
    return age;
  },

  // BMR — formule de Mifflin-St Jeor (1990), la plus fiable et la plus utilisée
  // aujourd'hui en pratique clinique (plus précise que Harris-Benedict sur des
  // populations modernes). Homme : +5, Femme : -161.
  computeBMR({ sex, weightKg, heightCm, age }) {
    if (!weightKg || !heightCm || age == null) return null;
    const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
    return Math.round(sex === "F" ? base - 161 : base + 5);
  },

  // Coefficients d'activité (PAL — Physical Activity Level), échelle Harris-Benedict
  // standard. NE COUVRE QUE l'activité quotidienne "hors entraînement structuré" (travail,
  // marche, pas quotidiens) — les séances de musculation/cardio sont ajoutées à part par
  // WorkoutCalorieEstimator, pour éviter de compter deux fois le même effort.
  ACTIVITY_MULTIPLIERS: {
    sedentary: 1.2,   // Sédentaire — travail de bureau, peu de marche
    light: 1.375,     // Léger — debout une partie de la journée, marche occasionnelle
    moderate: 1.55,   // Modéré — travail physique léger ou marche régulière
    high: 1.725,      // Élevé — travail physique
    very_high: 1.9,   // Très élevé — travail physique intense
  },

  // TDEE = BMR × multiplicateur d'activité quotidienne + dépense moyenne des
  // entraînements (calculée séparément par WorkoutCalorieEstimator et lissée sur 7 jours).
  computeTDEE({ bmr, activityLevel, avgDailyWorkoutKcal }) {
    if (!bmr) return null;
    const mult = EnergyCalculator.ACTIVITY_MULTIPLIERS[activityLevel] || EnergyCalculator.ACTIVITY_MULTIPLIERS.sedentary;
    return Math.round(bmr * mult + (avgDailyWorkoutKcal || 0));
  },
};

// --- WorkoutCalorieEstimator : calories dépensées pendant une séance --------------------
// Basé sur des valeurs MET (Metabolic Equivalent of Task) issues du Compendium of
// Physical Activities (Ainsworth et al.) — référence scientifique standard.
// Formule générale : kcal = MET × poids(kg) × durée(heures).

export const WorkoutCalorieEstimator = {
  // MET musculation selon l'intensité estimée (tonnage soulevé par minute de séance,
  // repos inclus — une séance dense/lourde a un MET plus élevé qu'une séance légère).
  // Hypothèse documentée et ajustable : ces seuils sont une approximation raisonnable,
  // pas une mesure directe de la dépense énergétique réelle.
  STRENGTH_MET_BY_INTENSITY: { light: 3.5, moderate: 5.0, vigorous: 6.0 },
  CARDIO_MET_MODERATE: 7.0, // course/vélo modéré — Compendium ≈ 6-8 MET

  estimateIntensity(tonnageKg, durationSec) {
    if (!durationSec) return "light";
    const perMinute = tonnageKg / (durationSec / 60);
    if (perMinute >= 50) return "vigorous";
    if (perMinute >= 20) return "moderate";
    return "light";
  },

  // Séance de musculation réellement enregistrée dans l'app (tonnage + durée connus).
  estimateStrengthSessionKcal({ tonnage, durationSec, bodyWeightKg }) {
    if (!durationSec || !bodyWeightKg) return 0;
    const intensity = WorkoutCalorieEstimator.estimateIntensity(tonnage || 0, durationSec);
    const met = WorkoutCalorieEstimator.STRENGTH_MET_BY_INTENSITY[intensity];
    const hours = durationSec / 3600;
    return Math.round(met * bodyWeightKg * hours);
  },

  // Cardio : l'app ne journalise pas de séances cardio dédiées, donc on estime une
  // moyenne à partir de ce que l'utilisateur a déclaré dans son profil (fréquence ×
  // durée par semaine), lissée sur 7 jours pour le calcul du TDEE quotidien.
  estimateAvgDailyCardioKcal({ cardioSessionsPerWeek, cardioDurationMin, bodyWeightKg }) {
    if (!cardioSessionsPerWeek || !cardioDurationMin || !bodyWeightKg) return 0;
    const hoursPerWeek = (cardioSessionsPerWeek * cardioDurationMin) / 60;
    const weeklyKcal = WorkoutCalorieEstimator.CARDIO_MET_MODERATE * bodyWeightKg * hoursPerWeek;
    return Math.round(weeklyKcal / 7);
  },
};

// --- GoalManager : calories cibles selon l'objectif (Sèche / Maintien / Prise de masse) -

export const GoalManager = {
  // Déficit/surplus par défaut, DANS la plage demandée (15-20% en sèche, 5-15% en prise
  // de masse). Valeurs médianes choisies comme point de départ raisonnable, modifiables.
  DEFAULT_CUT_DEFICIT_PCT: 0.175,
  MIN_CUT_DEFICIT_PCT: 0.15,
  MAX_CUT_DEFICIT_PCT: 0.20,
  DEFAULT_BULK_SURPLUS_PCT: 0.10,
  MIN_BULK_SURPLUS_PCT: 0.05,
  MAX_BULK_SURPLUS_PCT: 0.15,

  // `adjustmentKcal` = ajustement cumulé proposé par l'algorithme hebdomadaire (section 6),
  // appliqué par-dessus le calcul de base une fois que l'utilisateur l'a validé.
  computeCalorieTarget({ tdee, goal, adjustmentKcal = 0 }) {
    if (!tdee) return null;
    let base;
    if (goal === "cut") {
      const pct = Math.min(GoalManager.MAX_CUT_DEFICIT_PCT, Math.max(GoalManager.MIN_CUT_DEFICIT_PCT, GoalManager.DEFAULT_CUT_DEFICIT_PCT));
      base = tdee * (1 - pct);
    } else if (goal === "bulk") {
      const pct = Math.min(GoalManager.MAX_BULK_SURPLUS_PCT, Math.max(GoalManager.MIN_BULK_SURPLUS_PCT, GoalManager.DEFAULT_BULK_SURPLUS_PCT));
      base = tdee * (1 + pct);
    } else {
      base = tdee;
    }
    const target = base + adjustmentKcal;
    // Garde-fou de sécurité : jamais en dessous du métabolisme de base, quel que soit
    // l'ajustement cumulé (évite un déficit dangereux au fil des semaines).
    return Math.round(target);
  },
};

// --- NutritionCalculator : répartition des macronutriments ------------------------------

export const NutritionCalculator = {
  // g/kg de poids corporel par objectif — fourchettes usuelles en nutrition sportive.
  MACRO_RANGES: {
    cut: { proteinPerKg: 2.1, fatPerKg: 0.9 },      // 2-2.2 g/kg protéines, 0.8-1 g/kg lipides
    maintain: { proteinPerKg: 1.8, fatPerKg: 1.0 },
    bulk: { proteinPerKg: 1.9, fatPerKg: 1.0 },
  },
  computeMacros({ calories, weightKg, goal }) {
    if (!calories || !weightKg) return null;
    const { proteinPerKg, fatPerKg } = NutritionCalculator.MACRO_RANGES[goal] || NutritionCalculator.MACRO_RANGES.maintain;
    const proteinG = Math.round(proteinPerKg * weightKg);
    const fatG = Math.round(fatPerKg * weightKg);
    const proteinKcal = proteinG * 4;
    const fatKcal = fatG * 9;
    const carbsKcal = Math.max(0, calories - proteinKcal - fatKcal);
    const carbsG = Math.round(carbsKcal / 4);
    return { proteinG, fatG, carbsG, proteinKcal, fatKcal, carbsKcal };
  },
};

// --- WeeklyAdaptiveAlgorithm : ajuste progressivement les calories selon les résultats --

export const WeeklyAdaptiveAlgorithm = {
  // Objectifs de variation hebdomadaire raisonnables (grammes/semaine), documentés.
  WEEKLY_TARGET_G: { cut: -500, maintain: 0, bulk: 300 },
  ADJUSTMENT_STEP_KCAL: 125, // "100 à 150 kcal" demandé -> valeur médiane

  // Moyenne du poids sur les 7 derniers jours d'une fenêtre donnée (jamais une seule
  // pesée isolée, comme demandé).
  weeklyAverage(entries, fromTs, toTs) {
    const inWindow = entries.filter((e) => {
      const t = new Date(e.date).getTime();
      return t >= fromTs && t < toTs;
    });
    if (!inWindow.length) return null;
    return inWindow.reduce((a, e) => a + e.weight, 0) / inWindow.length;
  },

  // Compare les deux dernières semaines pleines à l'objectif, et propose un ajustement
  // (jamais appliqué automatiquement sans confirmation — voir NutritionScreen).
  analyze({ weightEntries, goal }) {
    const now = Date.now();
    const week1Start = now - 14 * 86400000, week1End = now - 7 * 86400000;
    const week2Start = now - 7 * 86400000, week2End = now;
    const avgWeek1 = WeeklyAdaptiveAlgorithm.weeklyAverage(weightEntries, week1Start, week1End);
    const avgWeek2 = WeeklyAdaptiveAlgorithm.weeklyAverage(weightEntries, week2Start, week2End);
    if (avgWeek1 == null || avgWeek2 == null) return { status: "insufficient_data" };

    const deltaG = (avgWeek2 - avgWeek1) * 1000;
    const targetG = WeeklyAdaptiveAlgorithm.WEEKLY_TARGET_G[goal] ?? 0;
    const step = WeeklyAdaptiveAlgorithm.ADJUSTMENT_STEP_KCAL;

    if (goal === "cut") {
      if (deltaG > targetG + 150) return { status: "too_slow", suggestionKcal: -step, message: `Perte plus lente que prévu (${Math.round(deltaG)} g cette semaine, objectif ${targetG} g). Réduire légèrement les calories ?` };
      if (deltaG < targetG - 300) return { status: "too_fast", suggestionKcal: step, message: `Perte plus rapide que prévu (${Math.round(deltaG)} g). Remonter un peu les calories pour préserver la masse musculaire ?` };
    } else if (goal === "bulk") {
      if (deltaG < targetG - 150) return { status: "too_slow", suggestionKcal: step, message: `Prise de poids plus lente que prévu (${Math.round(deltaG)} g). Augmenter légèrement les calories ?` };
      if (deltaG > targetG + 300) return { status: "too_fast", suggestionKcal: -step, message: `Prise de poids plus rapide que prévu (${Math.round(deltaG)} g). Réduire un peu le surplus ?` };
    }
    return { status: "on_track", deltaG: Math.round(deltaG) };
  },
};

/* ============================== DASHBOARD ============================== */
