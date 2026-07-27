import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  Plus, Search,
} from "lucide-react";
import { BigButton, Pill } from "../ui/Card";
import { MiniStepper } from "../ui/Inputs";
import { COMMON_EXERCISES } from "../../data/exercises";
import { MUSCLE_GROUPS } from "../../utils/muscleGroups";
import { uid } from "../../utils/uid";

export function AddExerciseSheet({ theme, onClose, onAdd, allowDuration = false, title = "Ajouter un exercice", showMuscle = true, defaultPrimaryMuscle = null }) {
  const [name, setName] = useState("");
  const [series, setSeries] = useState(4);
  const [unit, setUnit] = useState("reps"); // 'reps' | 'sec' (uniquement pertinent si allowDuration)
  const [reps, setReps] = useState(10);
  const [rest, setRest] = useState(90);
  const [primaryMuscle, setPrimaryMuscle] = useState(defaultPrimaryMuscle);
  const [secondaryMuscles, setSecondaryMuscles] = useState([]);
  const filtered = name ? COMMON_EXERCISES.filter((e) => e.toLowerCase().includes(name.toLowerCase())) : COMMON_EXERCISES.slice(0, 5);

  const switchUnit = (u) => { setUnit(u); setReps(u === "sec" ? 30 : 10); };
  const toggleSecondary = (id) => setSecondaryMuscles((cur) => (cur.includes(id) ? cur.filter((m) => m !== id) : [...cur, id]));

  return (
    <motion.div className="fixed inset-0 flex items-end justify-center" style={{ zIndex: 200 }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.5)" }} onClick={onClose} />
      <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 30, stiffness: 300 }}
        className="relative w-full rounded-t-3xl p-5" style={{ maxWidth: 480, background: theme.card, borderTop: `1px solid ${theme.border}`, paddingBottom: "calc(2rem + env(safe-area-inset-bottom))", maxHeight: "85vh", overflowY: "auto" }}>
        <div className="w-10 h-1 rounded-full mx-auto mb-4" style={{ background: theme.border }} />
        <h3 style={{ color: theme.text }} className="text-[17px] font-bold mb-4">{title}</h3>
        <div className="relative mb-2">
          <Search size={14} color={theme.textFaint} className="absolute left-3 top-1/2 -translate-y-1/2" />
          <input autoFocus placeholder="Nom de l'exercice" value={name} onChange={(e) => setName(e.target.value)}
            className="w-full rounded-xl pl-9 pr-3 py-3 text-[14.5px] outline-none" style={{ background: theme.card2, color: theme.text, border: `1px solid ${theme.border}` }} />
        </div>
        {filtered.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {filtered.map((e) => (
              <button key={e} onClick={() => setName(e)} className="px-3 py-1.5 rounded-full text-[12px] font-medium" style={{ background: theme.card2, color: theme.textMuted, border: `1px solid ${theme.border}` }}>{e}</button>
            ))}
          </div>
        )}
        {allowDuration && (
          <div className="flex gap-2 mb-4">
            <Pill theme={theme} active={unit === "reps"} onClick={() => switchUnit("reps")}>Répétitions</Pill>
            <Pill theme={theme} active={unit === "sec"} onClick={() => switchUnit("sec")}>Durée (secondes)</Pill>
          </div>
        )}
        {showMuscle && (
          <div className="mb-4">
            <p style={{ color: theme.textMuted }} className="text-[12px] font-semibold mb-1.5">Muscle principal</p>
            <div className="flex flex-wrap gap-1.5 mb-3">
              {MUSCLE_GROUPS.map((m) => (
                <Pill key={m.id} theme={theme} active={primaryMuscle === m.id} onClick={() => setPrimaryMuscle(primaryMuscle === m.id ? null : m.id)}>{m.label}</Pill>
              ))}
            </div>
            {primaryMuscle && (
              <>
                <p style={{ color: theme.textMuted }} className="text-[12px] font-semibold mb-1.5">Muscles secondaires (optionnel)</p>
                <div className="flex flex-wrap gap-1.5">
                  {MUSCLE_GROUPS.filter((m) => m.id !== primaryMuscle).map((m) => (
                    <Pill key={m.id} theme={theme} active={secondaryMuscles.includes(m.id)} onClick={() => toggleSecondary(m.id)}>{m.label}</Pill>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
        <div className="grid grid-cols-3 gap-2 mb-5">
          <MiniStepper theme={theme} label="Séries" value={series} onChange={setSeries} />
          <MiniStepper theme={theme} label={unit === "sec" ? "Secondes" : "Reps"} value={reps} step={unit === "sec" ? 10 : 1} onChange={setReps} />
          <MiniStepper theme={theme} label="Repos" value={rest} step={15} onChange={setRest} suffix="s" />
        </div>
        <BigButton theme={theme} gradient disabled={!name.trim()} onClick={() => onAdd({ id: uid(), name: name.trim(), series, reps, rest, restSec: rest, unit, notes: "", primaryMuscle, secondaryMuscles })}>
          <Plus size={17} /> Ajouter
        </BigButton>
      </motion.div>
    </motion.div>
  );
}

/* ============================== WORKOUT SESSION ============================== */

/* ============================== MODE ENTRAÎNEMENT (séance en temps réel) ============================== */
// Cette section gère le déroulé pas-à-pas d'une séance : un chrono global qui ne s'arrête
// jamais, un minuteur de récupération indépendant (pause/reprise), et une navigation
// automatique série par série / exercice par exercice.

// Formate un nombre de secondes en horloge "MM:SS" (ou "H:MM:SS" au-delà d'une heure).
// Utilisé à la fois pour le gros chrono de séance et pour le minuteur de récupération.
