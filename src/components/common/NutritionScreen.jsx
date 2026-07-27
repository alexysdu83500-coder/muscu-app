import React, { useState, useEffect, useMemo } from "react";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
} from "recharts";
import {
  Beef, Wheat, Droplet, Bell, Edit3,
} from "lucide-react";
import { MyProfileView } from "./MyProfileView";
import { NutritionInfoForm } from "./NutritionInfoForm";
import { NutritionNotificationBanner } from "./NutritionNotificationBanner";
import { ChartCard } from "../statistics/ChartCard";
import { BigButton, Card } from "../ui/Card";
import { EnergyCalculator, GoalManager, NutritionCalculator, WeeklyAdaptiveAlgorithm, WorkoutCalorieEstimator } from "../../services/nutritionService";
import { NUTRITION_GOALS } from "../../utils/constants";
import { fmtDate, fmtWeight, parseLocaleNumber, todayISO } from "../../utils/formatters";

export function NutritionScreen({ theme, weightEntries, sessions, nutritionProfile, setNutritionProfile, caloriesLog, setCaloriesLog, nutritionAdjustments, setNutritionAdjustments }) {
  const sortedWeights = useMemo(() => [...weightEntries].sort((a, b) => a.date.localeCompare(b.date)), [weightEntries]);
  const currentWeight = sortedWeights.length ? sortedWeights[sortedWeights.length - 1].weight : null;
  const daysSinceLastWeight = sortedWeights.length
    ? Math.floor((Date.now() - new Date(sortedWeights[sortedWeights.length - 1].date).getTime()) / 86400000)
    : null;

  const update = (patch) => setNutritionProfile((p) => ({ ...p, ...patch }));
  const missingEssentials = !nutritionProfile.birthdate || !nutritionProfile.height || !currentWeight;
  const [editingInfo, setEditingInfo] = useState(missingEssentials);

  const age = EnergyCalculator.computeAge(nutritionProfile.birthdate);
  const bmr = EnergyCalculator.computeBMR({ sex: nutritionProfile.sex, weightKg: currentWeight, heightCm: nutritionProfile.height, age });

  const last7Sessions = useMemo(() => sessions.filter((s) => Date.now() - s.startedAt < 7 * 86400000), [sessions]);
  const avgStrengthKcal7d = useMemo(() => {
    if (!currentWeight || !last7Sessions.length) return 0;
    const total = last7Sessions.reduce((a, s) => a + WorkoutCalorieEstimator.estimateStrengthSessionKcal({ tonnage: s.tonnage, durationSec: s.durationSec, bodyWeightKg: currentWeight }), 0);
    return total / 7;
  }, [last7Sessions, currentWeight]);
  const avgCardioKcal = WorkoutCalorieEstimator.estimateAvgDailyCardioKcal({
    cardioSessionsPerWeek: nutritionProfile.cardioSessionsPerWeek, cardioDurationMin: nutritionProfile.cardioSessionDuration, bodyWeightKg: currentWeight,
  });

  const tdee = EnergyCalculator.computeTDEE({ bmr, activityLevel: nutritionProfile.activityLevel, avgDailyWorkoutKcal: avgStrengthKcal7d + avgCardioKcal });

  const totalAdjustmentKcal = useMemo(() => nutritionAdjustments.filter((a) => a.reason === "weekly_adjustment").reduce((a, x) => a + x.delta, 0), [nutritionAdjustments]);
  const calorieTarget = tdee ? GoalManager.computeCalorieTarget({ tdee, goal: nutritionProfile.goal, adjustmentKcal: totalAdjustmentKcal }) : null;
  const macros = calorieTarget && currentWeight ? NutritionCalculator.computeMacros({ calories: calorieTarget, weightKg: currentWeight, goal: nutritionProfile.goal }) : null;

  const todayStr = todayISO();
  const todaySession = sessions.find((s) => s.date === todayStr);
  const todayStrengthKcal = todaySession ? WorkoutCalorieEstimator.estimateStrengthSessionKcal({ tonnage: todaySession.tonnage, durationSec: todaySession.durationSec, bodyWeightKg: currentWeight }) : 0;
  const todayTotalBurn = Math.round((bmr || 0) + todayStrengthKcal + avgCardioKcal);

  const todayCalorieEntry = caloriesLog.find((c) => c.date === todayStr);
  const [calInput, setCalInput] = useState(todayCalorieEntry ? String(todayCalorieEntry.calories) : "");
  useEffect(() => { setCalInput(todayCalorieEntry ? String(todayCalorieEntry.calories) : ""); }, [todayCalorieEntry?.calories]);
  const saveCalories = () => {
    const parsed = parseLocaleNumber(calInput);
    if (!Number.isFinite(parsed) || parsed < 0) return;
    setCaloriesLog((log) => (log.some((c) => c.date === todayStr) ? log.map((c) => (c.date === todayStr ? { ...c, calories: parsed } : c)) : [...log, { date: todayStr, calories: parsed }]));
  };

  // Un instantané par jour maximum (pas à chaque rendu) : sert de base à l'historique/graphique.
  useEffect(() => {
    if (!calorieTarget) return;
    setNutritionAdjustments((list) => (
      list.some((a) => a.date === todayStr && a.reason === "auto")
        ? list
        : [...list, { date: todayStr, calorieTarget, bmr, tdee, delta: 0, reason: "auto" }]
    ));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [calorieTarget, bmr, tdee]);

  const weeklyAnalysis = useMemo(() => WeeklyAdaptiveAlgorithm.analyze({ weightEntries: sortedWeights, goal: nutritionProfile.goal }), [sortedWeights, nutritionProfile.goal]);
  const applySuggestion = () => {
    if (!weeklyAnalysis.suggestionKcal) return;
    setNutritionAdjustments((list) => [...list, { date: todayStr, delta: weeklyAnalysis.suggestionKcal, reason: "weekly_adjustment", calorieTarget: (calorieTarget || 0) + weeklyAnalysis.suggestionKcal }]);
  };

  const notifications = useMemo(() => {
    const list = [];
    if (daysSinceLastWeight != null && daysSinceLastWeight >= 4) list.push({ type: "warning", message: `Tu n'as pas noté ton poids depuis ${daysSinceLastWeight} jours — pense à te peser pour garder des calculs fiables.` });
    if (nutritionProfile.weightTarget && currentWeight && Math.abs(currentWeight - nutritionProfile.weightTarget) <= 0.3) list.push({ type: "success", message: "Objectif de poids atteint !" });
    if (tdee && calorieTarget && calorieTarget < tdee * (1 - GoalManager.MAX_CUT_DEFICIT_PCT - 0.02)) list.push({ type: "warning", message: "Le déficit calorique actuel est important — reste vigilant sur la récupération." });
    if (tdee && calorieTarget && calorieTarget > tdee * (1 + GoalManager.MAX_BULK_SURPLUS_PCT + 0.02)) list.push({ type: "warning", message: "Le surplus calorique actuel est important — la prise de gras risque de s'accélérer." });
    return list;
  }, [daysSinceLastWeight, nutritionProfile.weightTarget, currentWeight, tdee, calorieTarget]);

  const chartData = useMemo(() => [...nutritionAdjustments].sort((a, b) => a.date.localeCompare(b.date)).map((a) => ({ date: a.date, dateLabel: fmtDate(a.date), calories: a.calorieTarget })), [nutritionAdjustments]);

  if (editingInfo) {
    return (
      <div className="px-4 pt-2 pb-6">
        <NutritionInfoForm theme={theme} profile={nutritionProfile} onUpdate={update} currentWeight={currentWeight} canClose={!missingEssentials} onDone={() => setEditingInfo(false)} />
        {missingEssentials && (
          <p style={{ color: theme.textFaint }} className="text-[12px] text-center mt-3">
            Renseigne au moins la date de naissance, la taille, et une pesée (dans "Poids") pour calculer tes besoins.
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="px-4 pt-2 space-y-4 pb-6">
      {notifications.map((n, i) => <NutritionNotificationBanner key={i} theme={theme} notif={n} />)}

      <Card theme={theme} className="p-5" style={{ background: `linear-gradient(135deg, ${theme.accent}14, ${theme.accent2}0a)` }}>
        <div className="flex items-center justify-between mb-1">
          <p style={{ color: theme.textMuted }} className="text-[12px] font-medium">Calories recommandées</p>
          <button onClick={() => setEditingInfo(true)} className="flex items-center gap-1 text-[11.5px] font-bold" style={{ color: theme.accent }}><Edit3 size={12} /> Infos</button>
        </div>
        <p style={{ color: theme.text }} className="text-[32px] font-extrabold leading-none">{calorieTarget ? calorieTarget.toLocaleString("fr-FR") : "—"} <span className="text-[15px] font-semibold" style={{ color: theme.textMuted }}>kcal / jour</span></p>
        <div className="flex items-center gap-2 mt-2">
          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold" style={{ background: theme.card2, color: theme.text }}>{NUTRITION_GOALS.find((g) => g.id === nutritionProfile.goal)?.label}</span>
          <span style={{ color: theme.textFaint }} className="text-[11.5px]">Métabolisme {bmr || "—"} kcal · Dépense totale {tdee || "—"} kcal</span>
        </div>
      </Card>

      <Card theme={theme} className="p-4">
        <div className="flex items-center justify-between mb-2">
          <p style={{ color: theme.text }} className="font-bold text-[14px]">Calories consommées</p>
          <p style={{ color: theme.textMuted }} className="text-[12.5px]">{todayCalorieEntry ? todayCalorieEntry.calories.toLocaleString("fr-FR") : 0} / {calorieTarget ? calorieTarget.toLocaleString("fr-FR") : "—"} kcal</p>
        </div>
        <div className="rounded-full overflow-hidden mb-3" style={{ height: 10, background: theme.card2 }}>
          <div style={{ height: "100%", width: `${calorieTarget ? Math.min(100, ((todayCalorieEntry?.calories || 0) / calorieTarget) * 100) : 0}%`, background: `linear-gradient(90deg, ${theme.accent}, ${theme.accent2})`, transition: "width 0.4s" }} />
        </div>
        <div className="flex items-center gap-2">
          <input inputMode="decimal" placeholder="Ex : 1800" value={calInput} onChange={(e) => setCalInput(e.target.value)}
            className="flex-1 rounded-xl px-3 py-2.5 text-[14px] font-semibold outline-none" style={{ background: theme.card2, color: theme.text, border: `1px solid ${theme.border}` }} />
          <button onClick={saveCalories} className="px-4 py-2.5 rounded-xl font-bold text-[13px] text-white active:scale-95 transition-transform" style={{ background: `linear-gradient(135deg, ${theme.accent}, ${theme.accent2})` }}>OK</button>
        </div>
        <p style={{ color: theme.textFaint }} className="text-[11px] mt-2">Saisie manuelle quotidienne (pas de journal alimentaire détaillé dans cette version).</p>
      </Card>

      <Card theme={theme} className="p-4">
        <p style={{ color: theme.text }} className="font-bold text-[14px] mb-2.5">Dépense du jour</p>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[13px]"><span style={{ color: theme.textMuted }}>Métabolisme de base</span><span style={{ color: theme.text }} className="font-semibold">{bmr || 0} kcal</span></div>
          <div className="flex items-center justify-between text-[13px]"><span style={{ color: theme.textMuted }}>Séance de musculation</span><span style={{ color: theme.text }} className="font-semibold">{todayStrengthKcal} kcal</span></div>
          <div className="flex items-center justify-between text-[13px]"><span style={{ color: theme.textMuted }}>Cardio (moyenne)</span><span style={{ color: theme.text }} className="font-semibold">{avgCardioKcal} kcal</span></div>
          <div className="flex items-center justify-between text-[13.5px] pt-1.5" style={{ borderTop: `1px solid ${theme.border}` }}><span style={{ color: theme.text }} className="font-bold">Total</span><span style={{ color: theme.accent }} className="font-extrabold">{todayTotalBurn} kcal</span></div>
        </div>
      </Card>

      <div className="grid grid-cols-3 gap-2.5">
        <Card theme={theme} className="p-3.5"><p style={{ color: theme.textMuted }} className="text-[10.5px] font-semibold mb-1">Poids actuel</p><p style={{ color: theme.text }} className="text-[16px] font-extrabold">{currentWeight ? fmtWeight(currentWeight) : "—"}</p></Card>
        <Card theme={theme} className="p-3.5"><p style={{ color: theme.textMuted }} className="text-[10.5px] font-semibold mb-1">Poids cible</p><p style={{ color: theme.text }} className="text-[16px] font-extrabold">{nutritionProfile.weightTarget ? fmtWeight(nutritionProfile.weightTarget) : "—"}</p></Card>
        <Card theme={theme} className="p-3.5"><p style={{ color: theme.textMuted }} className="text-[10.5px] font-semibold mb-1">Variation</p><p style={{ color: theme.text }} className="text-[16px] font-extrabold">{currentWeight && nutritionProfile.weightTarget ? `${(currentWeight - nutritionProfile.weightTarget) > 0 ? "+" : ""}${fmtWeight(currentWeight - nutritionProfile.weightTarget)}` : "—"}</p></Card>
      </div>

      {macros && (
        <Card theme={theme} className="p-4">
          <p style={{ color: theme.text }} className="font-bold text-[14px] mb-3">Macronutriments recommandés</p>
          <div className="grid grid-cols-3 gap-2.5">
            <div className="rounded-2xl p-3 text-center" style={{ background: theme.card2 }}>
              <Beef size={16} color={theme.accent} className="mx-auto mb-1.5" />
              <p style={{ color: theme.text }} className="text-[15px] font-extrabold">{macros.proteinG}g</p>
              <p style={{ color: theme.textFaint }} className="text-[10px]">Protéines</p>
            </div>
            <div className="rounded-2xl p-3 text-center" style={{ background: theme.card2 }}>
              <Droplet size={16} color={theme.accent2} className="mx-auto mb-1.5" />
              <p style={{ color: theme.text }} className="text-[15px] font-extrabold">{macros.fatG}g</p>
              <p style={{ color: theme.textFaint }} className="text-[10px]">Lipides</p>
            </div>
            <div className="rounded-2xl p-3 text-center" style={{ background: theme.card2 }}>
              <Wheat size={16} color={theme.good} className="mx-auto mb-1.5" />
              <p style={{ color: theme.text }} className="text-[15px] font-extrabold">{macros.carbsG}g</p>
              <p style={{ color: theme.textFaint }} className="text-[10px]">Glucides</p>
            </div>
          </div>
        </Card>
      )}

      {(weeklyAnalysis.status === "too_slow" || weeklyAnalysis.status === "too_fast") && (
        <Card theme={theme} className="p-4" style={{ border: `1.5px solid ${theme.accent}55` }}>
          <div className="flex items-center gap-2 mb-2"><Bell size={15} color={theme.accent} /><p style={{ color: theme.text }} className="font-bold text-[14px]">Ajustement suggéré</p></div>
          <p style={{ color: theme.textMuted }} className="text-[13px] mb-3">{weeklyAnalysis.message}</p>
          <BigButton theme={theme} gradient onClick={applySuggestion}>
            {weeklyAnalysis.suggestionKcal > 0 ? "+" : ""}{weeklyAnalysis.suggestionKcal} kcal/jour — Appliquer
          </BigButton>
        </Card>
      )}

      {chartData.length > 1 && (
        <ChartCard theme={theme} title="Évolution des calories recommandées">
          <ResponsiveContainer width="100%" height={160}>
            <LineChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={theme.border} vertical={false} />
              <XAxis dataKey="dateLabel" tick={{ fontSize: 10, fill: theme.textFaint }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: theme.textFaint }} axisLine={false} tickLine={false} width={30} />
              <Tooltip contentStyle={{ background: theme.card, border: `1px solid ${theme.border}`, borderRadius: 12, fontSize: 12 }} labelStyle={{ color: theme.text }} />
              <Line type="monotone" dataKey="calories" stroke={theme.accent} strokeWidth={2.5} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      )}

      <button onClick={() => setEditingInfo(true)} className="w-full text-center text-[12.5px] font-semibold py-2 flex items-center justify-center gap-1.5" style={{ color: theme.textMuted }}>
        <Edit3 size={13} /> Modifier mes informations
      </button>
    </div>
  );
}

// --- "Mon profil" : identité + aperçu rapide de l'activité (voir MyProfileView) --------

/* ============================================================================
   MOTEUR NUTRITIONNEL — services dédiés, séparés de l'UI et du stockage
   ============================================================================
   Toutes les constantes ci-dessous sont des choix documentés (formules reconnues
   quand elles existent, hypothèses raisonnables sinon) — regroupées ici pour être
   facilement modifiables sans toucher au reste du fichier.
*/

// --- EnergyCalculator : métabolisme de base et dépense journalière ----------------------
