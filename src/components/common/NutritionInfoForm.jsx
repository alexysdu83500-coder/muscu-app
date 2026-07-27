import {
  Check,
} from "lucide-react";
import { BigButton, Card, Pill } from "../ui/Card";
import { FieldRow, LabeledInput, MiniStepper } from "../ui/Inputs";
import { ACTIVITY_LEVELS, NUTRITION_GOALS } from "../../utils/constants";
import { fmtWeight, parseLocaleNumber } from "../../utils/formatters";

export function NutritionInfoForm({ theme, profile, onUpdate, currentWeight, onDone, canClose }) {
  return (
    <div className="space-y-3">
      <Card theme={theme} className="p-4 space-y-3">
        <p style={{ color: theme.text }} className="font-bold text-[14px]">Informations personnelles</p>
        <FieldRow theme={theme} label="Sexe">
          <div className="flex gap-2">
            <Pill theme={theme} active={profile.sex === "M"} onClick={() => onUpdate({ sex: "M" })}>Homme</Pill>
            <Pill theme={theme} active={profile.sex === "F"} onClick={() => onUpdate({ sex: "F" })}>Femme</Pill>
          </div>
        </FieldRow>
        <FieldRow theme={theme} label="Date de naissance">
          <input type="date" value={profile.birthdate || ""} onChange={(e) => onUpdate({ birthdate: e.target.value })} className="bg-transparent outline-none text-right" style={{ color: theme.text }} />
        </FieldRow>
        <LabeledInput theme={theme} label="Taille (cm)" value={profile.height ?? ""} onChange={(v) => { const n = parseLocaleNumber(v); onUpdate({ height: v.trim() === "" ? null : (Number.isFinite(n) ? n : profile.height) }); }} placeholder="Ex : 178" />
        <FieldRow theme={theme} label="Poids actuel">
          <span style={{ color: theme.textMuted }} className="text-[13px]">{currentWeight ? `${fmtWeight(currentWeight)} kg (via Poids)` : "Non renseigné"}</span>
        </FieldRow>
        <LabeledInput theme={theme} label="Poids cible (kg)" value={profile.weightTarget ?? ""} onChange={(v) => { const n = parseLocaleNumber(v); onUpdate({ weightTarget: v.trim() === "" ? null : (Number.isFinite(n) ? n : profile.weightTarget) }); }} placeholder="Ex : 75" />
      </Card>

      <Card theme={theme} className="p-4 space-y-3">
        <p style={{ color: theme.text }} className="font-bold text-[14px]">Activité quotidienne</p>
        <div className="flex flex-wrap gap-2">
          {ACTIVITY_LEVELS.map((a) => <Pill key={a.id} theme={theme} active={profile.activityLevel === a.id} onClick={() => onUpdate({ activityLevel: a.id })}>{a.label}</Pill>)}
        </div>
        <LabeledInput theme={theme} label="Pas / jour (optionnel)" value={profile.stepsPerDay ?? ""} onChange={(v) => onUpdate({ stepsPerDay: v.trim() === "" ? null : Number(v.replace(/\D/g, "")) || null })} placeholder="Ex : 8000" />
        <LabeledInput theme={theme} label="Profession (optionnel)" value={profile.profession} onChange={(v) => onUpdate({ profession: v })} placeholder="Ex : bureau, chantier..." />
      </Card>

      <Card theme={theme} className="p-4 space-y-3">
        <p style={{ color: theme.text }} className="font-bold text-[14px]">Entraînement</p>
        <div className="grid grid-cols-2 gap-2.5">
          <MiniStepper theme={theme} label="Muscu / sem" value={profile.strengthSessionsPerWeek} onChange={(v) => onUpdate({ strengthSessionsPerWeek: v })} />
          <MiniStepper theme={theme} label="Durée muscu" value={profile.strengthSessionDuration} step={5} suffix="min" onChange={(v) => onUpdate({ strengthSessionDuration: v })} />
          <MiniStepper theme={theme} label="Cardio / sem" value={profile.cardioSessionsPerWeek} onChange={(v) => onUpdate({ cardioSessionsPerWeek: v })} />
          <MiniStepper theme={theme} label="Durée cardio" value={profile.cardioSessionDuration} step={5} suffix="min" onChange={(v) => onUpdate({ cardioSessionDuration: v })} />
        </div>
      </Card>

      <Card theme={theme} className="p-4">
        <p style={{ color: theme.text }} className="font-bold text-[14px] mb-2.5">Objectif</p>
        <div className="flex flex-wrap gap-2">
          {NUTRITION_GOALS.map((g) => <Pill key={g.id} theme={theme} active={profile.goal === g.id} onClick={() => onUpdate({ goal: g.id })}>{g.label}</Pill>)}
        </div>
      </Card>

      {canClose && <BigButton theme={theme} gradient onClick={onDone}><Check size={16} /> Voir le tableau de bord</BigButton>}
    </div>
  );
}
