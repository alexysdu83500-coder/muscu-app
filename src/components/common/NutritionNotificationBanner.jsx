import {
  Trophy, AlertTriangle,
} from "lucide-react";
import { EnergyCalculator, GoalManager, NutritionCalculator, WeeklyAdaptiveAlgorithm, WorkoutCalorieEstimator } from "../../services/nutritionService";

export function NutritionNotificationBanner({ theme, notif }) {
  const isWarning = notif.type === "warning";
  const isSuccess = notif.type === "success";
  const color = isSuccess ? theme.good : isWarning ? theme.accent2 : theme.accent;
  return (
    <div className="rounded-2xl p-3.5 flex items-start gap-2.5" style={{ background: `${color}14`, border: `1px solid ${color}33` }}>
      {isSuccess ? <Trophy size={15} color={color} className="mt-0.5 shrink-0" /> : <AlertTriangle size={15} color={color} className="mt-0.5 shrink-0" />}
      <p style={{ color: theme.text }} className="text-[13px] leading-snug">{notif.message}</p>
    </div>
  );
}

// --- Coach nutritionnel : écran principal -----------------------------------------------
// Architecture : tout le calcul (BMR/TDEE/calories/macros/analyse hebdomadaire) vit dans
// les "services" définis plus haut (EnergyCalculator, WorkoutCalorieEstimator, GoalManager,
// NutritionCalculator, WeeklyAdaptiveAlgorithm) — ce composant ne fait que les appeler et
// afficher le résultat, il ne contient aucune formule lui-même.
