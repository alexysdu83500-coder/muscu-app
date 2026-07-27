import React, { useMemo, useRef } from "react";
import {
  Dumbbell, BarChart3, Timer, Flame, Calendar, Info, FileDown, FileUp, Trophy,
} from "lucide-react";
import { ActivityHeatmap } from "./ActivityHeatmap";
import { BigButton, Card } from "../ui/Card";
import { IconBadge, SectionTitle } from "../ui/Feedback";

export function StatsPage({ theme, sessions, programs, onExport, onImport }) {
  const fileInputRef = useRef(null);
  const totalSessions = sessions.length;
  const totalHours = sessions.reduce((a, s) => a + (s.durationSec || 0), 0) / 3600;
  const totalTonnage = sessions.reduce((a, s) => a + (s.tonnage || 0), 0);
  const totalReps = sessions.reduce((a, s) => a + s.exerciseLogs.reduce((b, el) => b + el.sets.reduce((c, s2) => c + (s2.done ? Number(s2.reps) || 0 : 0), 0), 0), 0);

  const heaviestSet = useMemo(() => {
    let best = null;
    sessions.forEach((s) => s.exerciseLogs.forEach((el) => el.sets.forEach((set) => {
      if (set.done && set.weight && (!best || Number(set.weight) > best.weight)) best = { weight: Number(set.weight), reps: set.reps, name: el.name, date: s.date };
    })));
    return best;
  }, [sessions]);

  const favoriteExercise = useMemo(() => {
    const counts = {};
    sessions.forEach((s) => s.exerciseLogs.forEach((el) => { counts[el.name] = (counts[el.name] || 0) + 1; }));
    const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    return entries[0]?.[0] || null;
  }, [sessions]);

  const frequency = totalSessions >= 2 ? (() => {
    const dates = sessions.map((s) => new Date(s.date).getTime()).sort((a, b) => a - b);
    const spanDays = (dates[dates.length - 1] - dates[0]) / 86400000 || 1;
    return (totalSessions / (spanDays / 7)).toFixed(1);
  })() : null;

  const sessionDates = useMemo(() => new Set(sessions.map((s) => s.date)), [sessions]);

  return (
    <div className="px-4 pt-2 space-y-5">
      <div className="grid grid-cols-2 gap-2.5">
        <StatBox theme={theme} icon={Dumbbell} label="Séances totales" value={totalSessions} />
        <StatBox theme={theme} icon={Timer} label="Heures d'entraînement" value={totalHours.toFixed(1) + "h"} />
        <StatBox theme={theme} icon={Flame} label="Tonnage total" value={Math.round(totalTonnage).toLocaleString("fr-FR") + " kg"} />
        <StatBox theme={theme} icon={BarChart3} label="Répétitions totales" value={totalReps.toLocaleString("fr-FR")} />
        <StatBox theme={theme} icon={Calendar} label="Fréquence" value={frequency ? `${frequency}/sem` : "—"} />
        <StatBox theme={theme} icon={Trophy} label="Série la plus lourde" value={heaviestSet ? `${heaviestSet.weight}kg` : "—"} />
      </div>

      {favoriteExercise && (
        <Card theme={theme} className="p-4 flex items-center gap-3">
          <div className="rounded-2xl flex items-center justify-center shrink-0" style={{ width: 44, height: 44, background: `linear-gradient(135deg, ${theme.accent}, ${theme.accent2})` }}><Dumbbell size={18} color="#fff" /></div>
          <div><p style={{ color: theme.textMuted }} className="text-[11.5px] font-semibold">Exercice favori</p><p style={{ color: theme.text }} className="font-bold text-[15px]">{favoriteExercise}</p></div>
        </Card>
      )}

      <div>
        <SectionTitle theme={theme}>Activité annuelle</SectionTitle>
        <Card theme={theme} className="p-4">
          <ActivityHeatmap theme={theme} sessionDates={sessionDates} />
        </Card>
      </div>

      <div>
        <SectionTitle theme={theme}>Sauvegarde & données</SectionTitle>
        <Card theme={theme} className="p-4 space-y-2.5">
          <p style={{ color: theme.textMuted }} className="text-[12.5px] leading-snug">Tes données sont stockées localement sur cet appareil et fonctionnent hors connexion. Exporte régulièrement une sauvegarde.</p>
          <div className="grid grid-cols-2 gap-2.5 pt-1">
            <BigButton theme={theme} onClick={onExport}><FileDown size={15} /> Exporter</BigButton>
            <BigButton theme={theme} onClick={() => fileInputRef.current?.click()}><FileUp size={15} /> Importer</BigButton>
          </div>
          <input ref={fileInputRef} type="file" accept="application/json" className="hidden" onChange={(e) => {
            const file = e.target.files?.[0]; if (!file) return;
            const reader = new FileReader();
            reader.onload = () => { try { const data = JSON.parse(reader.result); onImport(data); } catch (err) { alert("Fichier invalide"); } };
            reader.readAsText(file);
            e.target.value = "";
          }} />
        </Card>
      </div>

      <Card theme={theme} className="p-4 flex items-start gap-3" style={{ background: `${theme.textMuted}0d` }}>
        <Info size={15} color={theme.textMuted} className="mt-0.5 shrink-0" />
        <p style={{ color: theme.textMuted }} className="text-[12px] leading-snug">Installe cette app sur ton écran d'accueil iPhone via Safari (icône Partager → « Sur l'écran d'accueil ») pour un accès en plein écran, hors connexion, comme une app native.</p>
      </Card>
    </div>
  );
}

export function StatBox({ theme, icon: Icon, label, value }) {
  return (
    <Card theme={theme} className="p-3.5">
      <IconBadge theme={theme} icon={Icon} size={30} iconSize={15} tone="accent" className="mb-1.5" />
      <p style={{ color: theme.text }} className="text-[16px] font-extrabold leading-tight mt-1.5">{value}</p>
      <p style={{ color: theme.textMuted }} className="text-[10.5px] mt-0.5">{label}</p>
    </Card>
  );
}
