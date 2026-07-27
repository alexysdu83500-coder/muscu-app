import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  Link2,
} from "lucide-react";
import { BigButton, Pill } from "../ui/Card";
import { MiniStepper } from "../ui/Inputs";
import { uid } from "../../utils/uid";

export function PairExerciseSheet({ theme, title, candidates, onClose, onPickExisting, onCreateNew }) {
  const [mode, setMode] = useState(candidates.length ? "pick" : "new");
  const [name, setName] = useState("");
  const [series, setSeries] = useState(4);
  const [reps, setReps] = useState(10);

  return (
    <motion.div className="fixed inset-0 flex items-end justify-center" style={{ zIndex: 200 }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.5)" }} onClick={onClose} />
      <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 30, stiffness: 300 }}
        className="relative w-full rounded-t-3xl p-5" style={{ maxWidth: 480, background: theme.card, borderTop: `1px solid ${theme.border}`, maxHeight: "85vh", overflowY: "auto", paddingBottom: "calc(2rem + env(safe-area-inset-bottom))" }}>
        <div className="w-10 h-1 rounded-full mx-auto mb-4" style={{ background: theme.border }} />
        <h3 style={{ color: theme.text }} className="text-[17px] font-bold mb-1 flex items-center gap-1.5"><Link2 size={16} color={theme.accent} /> {title}</h3>
        <p style={{ color: theme.textMuted }} className="text-[12.5px] mb-4">Choisis un exercice existant du programme ou crées-en un nouveau.</p>

        <div className="flex gap-2 mb-4">
          <Pill theme={theme} active={mode === "pick"} onClick={() => setMode("pick")}>Exercice existant</Pill>
          <Pill theme={theme} active={mode === "new"} onClick={() => setMode("new")}>Nouvel exercice</Pill>
        </div>

        {mode === "pick" ? (
          candidates.length === 0 ? (
            <p style={{ color: theme.textFaint }} className="text-[13px] text-center py-6">Aucun autre exercice disponible. Crée-en un nouveau.</p>
          ) : (
            <div className="space-y-2">
              {candidates.map((c) => (
                <button key={c.id} onClick={() => onPickExisting(c)} className="w-full flex items-center justify-between rounded-2xl p-3.5 text-left active:scale-[0.98] transition-transform"
                  style={{ background: theme.card2, border: `1px solid ${theme.border}` }}>
                  <div>
                    <p style={{ color: theme.text }} className="font-semibold text-[14px]">{c.name}</p>
                    <p style={{ color: theme.textMuted }} className="text-[11.5px]">{c.series} × {c.reps} reps</p>
                  </div>
                  <Link2 size={14} color={theme.accent} />
                </button>
              ))}
            </div>
          )
        ) : (
          <div className="space-y-3">
            <input autoFocus placeholder="Nom de l'exercice" value={name} onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl px-3 py-3 text-[14.5px] outline-none" style={{ background: theme.card2, color: theme.text, border: `1px solid ${theme.border}` }} />
            <div className="grid grid-cols-2 gap-2">
              <MiniStepper theme={theme} label="Séries" value={series} onChange={setSeries} />
              <MiniStepper theme={theme} label="Reps" value={reps} onChange={setReps} />
            </div>
            <BigButton theme={theme} gradient disabled={!name.trim()} onClick={() => onCreateNew({ id: uid(), name: name.trim(), series, reps, notes: "" })}>
              <Link2 size={16} /> Créer et associer
            </BigButton>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
