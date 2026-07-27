import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  Save,
} from "lucide-react";
import { BigButton } from "../ui/Card";
import { FieldRow } from "../ui/Inputs";
import { todayISO } from "../../utils/formatters";
import { uid } from "../../utils/uid";
import { validateWeightEntry } from "../../utils/validators";

export function AddWeightSheet({ theme, onClose, onAdd }) {
  const [date, setDate] = useState(todayISO());
  const [weight, setWeight] = useState("");
  const [waist, setWaist] = useState("");
  const [bodyfat, setBodyfat] = useState("");
  const [comment, setComment] = useState("");
  const [error, setError] = useState("");

  const handleSave = () => {
    const result = validateWeightEntry({ weight, waist, bodyfat });
    if (!result.valid) { setError(result.error); return; }
    setError("");
    onAdd({ id: uid(), date, weight: result.weight, waist: result.waist, bodyfat: result.bodyfat, comment });
  };

  return (
    <motion.div className="fixed inset-0 flex items-end justify-center" style={{ zIndex: 200 }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.5)" }} onClick={onClose} />
      <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 30, stiffness: 300 }}
        className="relative w-full rounded-t-3xl p-5" style={{ maxWidth: 480, background: theme.card, borderTop: `1px solid ${theme.border}`, paddingBottom: "calc(2rem + env(safe-area-inset-bottom))" }}>
        <div className="w-10 h-1 rounded-full mx-auto mb-4" style={{ background: theme.border }} />
        <h3 style={{ color: theme.text }} className="text-[17px] font-bold mb-4">Ajouter une pesée</h3>
        <div className="space-y-2.5">
          <FieldRow theme={theme} label="Date"><input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="bg-transparent outline-none text-right" style={{ color: theme.text }} /></FieldRow>
          <FieldRow theme={theme} label="Poids (kg)"><input autoFocus inputMode="decimal" placeholder="0" value={weight} onChange={(e) => { setWeight(e.target.value); setError(""); }} className="bg-transparent outline-none text-right w-24 font-bold text-[16px]" style={{ color: theme.text }} /></FieldRow>
          <FieldRow theme={theme} label="Tour de taille (cm)"><input inputMode="decimal" placeholder="optionnel" value={waist} onChange={(e) => { setWaist(e.target.value); setError(""); }} className="bg-transparent outline-none text-right w-24" style={{ color: theme.text }} /></FieldRow>
          <FieldRow theme={theme} label="Masse grasse (%)"><input inputMode="decimal" placeholder="optionnel" value={bodyfat} onChange={(e) => { setBodyfat(e.target.value); setError(""); }} className="bg-transparent outline-none text-right w-24" style={{ color: theme.text }} /></FieldRow>
          <textarea placeholder="Commentaire (optionnel)" value={comment} onChange={(e) => setComment(e.target.value)} rows={2}
            className="w-full rounded-xl p-2.5 text-[13px] outline-none resize-none" style={{ background: theme.card2, color: theme.text, border: `1px solid ${theme.border}` }} />
        </div>
        {error && <p style={{ color: theme.bad }} className="text-[12.5px] font-semibold mt-3 px-1">{error}</p>}
        <div className="mt-5">
          <BigButton theme={theme} gradient onClick={handleSave}>
            <Save size={16} /> Enregistrer
          </BigButton>
        </div>
      </motion.div>
    </motion.div>
  );
}

