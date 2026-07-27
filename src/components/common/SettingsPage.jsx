import React, { useState } from "react";
import { AnimatePresence } from "framer-motion";
import {
  Timer, Trash2, Moon, Sun,
} from "lucide-react";
import { HistoryList } from "./HistoryList";
import { SessionDetail } from "./SessionDetail";
import { WeightPage } from "./WeightPage";
import { ProgramEditor } from "../exercises/ProgramEditor";
import { ProgramsList } from "../exercises/ProgramsList";
import { StatsPage } from "../statistics/StatsPage";
import { Card } from "../ui/Card";
import { ConfirmSheet, IconBadge } from "../ui/Feedback";
import { MiniStepper } from "../ui/Inputs";

export function SettingsPage({ theme, isDark, setIsDark, settings, setSettings, onResetData }) {
  const [confirmReset, setConfirmReset] = useState(false);
  return (
    <div className="px-4 pt-2 space-y-3">
      <Card theme={theme} className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <IconBadge theme={theme} icon={isDark ? Moon : Sun} size={36} iconSize={16} filled />
          <div>
            <p style={{ color: theme.text }} className="font-semibold text-[14.5px]">Thème</p>
            <p style={{ color: theme.textMuted }} className="text-[12px]">{isDark ? "Sombre" : "Clair"}</p>
          </div>
        </div>
        <button onClick={() => setIsDark((d) => !d)} className="px-3.5 py-2 rounded-xl font-bold text-[12.5px] active:scale-95 transition-transform" style={{ background: theme.card2, color: theme.accent, border: `1px solid ${theme.border}` }}>
          Changer
        </button>
      </Card>
      <Card theme={theme} className="p-4">
        <div className="flex items-center gap-2.5 mb-3.5">
          <IconBadge theme={theme} icon={Timer} size={36} iconSize={16} filled />
          <div>
            <p style={{ color: theme.text }} className="font-semibold text-[14.5px]">Repos par défaut</p>
            <p style={{ color: theme.textMuted }} className="text-[12px]">Utilisé quand un exercice n'a pas de repos défini</p>
          </div>
        </div>
        <MiniStepper theme={theme} label="Secondes" value={settings.restDefault} step={15} onChange={(v) => setSettings((s) => ({ ...s, restDefault: v }))} suffix="s" />
      </Card>
      <Card theme={theme} className="p-4">
        <p style={{ color: theme.text }} className="font-semibold text-[14.5px] mb-1">Zone de danger</p>
        <p style={{ color: theme.textMuted }} className="text-[12px] mb-3">Efface définitivement toutes les données sur cet appareil (programmes, historique, poids, profil).</p>
        <button onClick={() => setConfirmReset(true)} className="w-full rounded-xl py-3 font-bold text-[13px] flex items-center justify-center gap-2" style={{ background: `${theme.bad}18`, color: theme.bad }}>
          <Trash2 size={14} /> Réinitialiser mes données
        </button>
      </Card>
      <AnimatePresence>
        {confirmReset && (
          <ConfirmSheet theme={theme} danger title="Réinitialiser les données ?" subtitle="Toutes tes données sur cet appareil seront définitivement effacées. Cette action est irréversible."
            confirmLabel="Réinitialiser" onConfirm={onResetData} onCancel={() => setConfirmReset(false)} />
        )}
      </AnimatePresence>
    </div>
  );
}

// Centre de gestion "Profil" : regroupe tout ce qui n'est pas la navigation quotidienne
// (Accueil / Séance / Progression). Reprend telles quelles les pages déjà existantes
// (ProgramsList, ProgramEditor, HistoryList, SessionDetail, WeightPage, StatsPage) —
// seule leur navigation change : elle est maintenant locale à Profil au lieu de vivre
// au niveau App.
