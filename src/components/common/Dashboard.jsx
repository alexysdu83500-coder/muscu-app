import React, { useState, useMemo } from "react";
import {
  Dumbbell, Scale, Play, Flame, Trophy, Sparkles,
} from "lucide-react";
import { ProgramSelectCard } from "../exercises/ProgramSelectCard";
import { BigButton, Card } from "../ui/Card";
import { EffortRing, EmptyState, SectionTitle } from "../ui/Feedback";
import { computePRs } from "../../services/statisticsService";
import { fmtDate, fmtDuration, fmtWeight, quoteOfTheDay } from "../../utils/formatters";

export function Dashboard({ theme, programs, sessions, weightEntries, settings, setSettings, onStart }) {
  const prs = useMemo(() => computePRs(sessions), [sessions]);
  const lastWeight = weightEntries.length ? [...weightEntries].sort((a, b) => b.date.localeCompare(a.date))[0] : null;
  const suggestedIndex = programs.length ? (settings.lastProgramIndex + 1) % programs.length : -1;
  const suggested = programs[suggestedIndex] || programs[0] || null;

  // Séances disponibles (les programmes) vs. sélection en cours de constitution : ceci
  // n'est PAS la séance active, juste "quel programme l'utilisateur s'apprête à démarrer".
  // Tant qu'on n'a pas tapé "Commencer la séance", rien n'est démarré nulle part.
  const [selectedId, setSelectedId] = useState(null);
  const selectedProgram = programs.find((p) => p.id === selectedId) || suggested;

  const last7 = sessions.filter((s) => Date.now() - s.startedAt < 7 * 86400000);
  const tonnage7 = last7.reduce((a, s) => a + (s.tonnage || 0), 0);
  const avgTonnage = sessions.length ? sessions.slice(0, 6).reduce((a, s) => a + (s.tonnage || 0), 0) / Math.max(1, Math.min(6, sessions.length)) : 0;
  const ringProgress = avgTonnage ? Math.min(1, tonnage7 / (avgTonnage * 3)) : (last7.length ? 0.3 : 0);

  const recentSessions = sessions.slice(0, 3);
  const topPRs = Object.entries(prs).sort((a, b) => b[1].maxWeight - a[1].maxWeight).slice(0, 3);

  const handleStart = () => {
    if (!selectedProgram) return;
    const idx = programs.findIndex((p) => p.id === selectedProgram.id);
    if (idx !== -1) setSettings((s) => ({ ...s, lastProgramIndex: idx }));
    onStart(selectedProgram);
  };

  return (
    <div className="px-4 pt-2 space-y-5">
      <Card theme={theme} className="p-5 relative overflow-hidden">
        <div style={{ position: "absolute", top: -40, right: -40, width: 160, height: 160, borderRadius: 999, background: `radial-gradient(circle, ${theme.accent}22, transparent 70%)` }} />
        <div className="flex items-center justify-between relative">
          <div>
            <p style={{ color: theme.textMuted }} className="text-[12px] font-medium">Activité de la semaine</p>
            <p style={{ color: theme.text }} className="text-[22px] font-extrabold mt-0.5">{last7.length} séance{last7.length !== 1 ? "s" : ""}</p>
            <p style={{ color: theme.textMuted }} className="text-[12px] mt-0.5">{Math.round(tonnage7).toLocaleString("fr-FR")} kg soulevés</p>
          </div>
          <EffortRing theme={theme} progress={ringProgress} value={`${Math.round(tonnage7 / 1000) || 0}t`} label="7 jours" />
        </div>
      </Card>

      <div>
        <SectionTitle theme={theme}>Mes séances</SectionTitle>
        {programs.length === 0 ? (
          <Card theme={theme}><EmptyState theme={theme} icon={Dumbbell} title="Aucun programme" subtitle="Crée un programme dans Profil pour pouvoir démarrer une séance." /></Card>
        ) : (
          <div className="space-y-2.5">
            {programs.map((p) => (
              <ProgramSelectCard key={p.id} theme={theme} program={p} selected={selectedProgram?.id === p.id} onSelect={() => setSelectedId(p.id)} />
            ))}
          </div>
        )}
      </div>

      {programs.length > 0 && (
        <BigButton theme={theme} gradient disabled={!selectedProgram} onClick={handleStart}>
          <Play size={18} fill="#fff" /> Commencer la séance
        </BigButton>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Card theme={theme} className="p-4">
          <div className="flex items-center gap-1.5 mb-1"><Scale size={13} color={theme.textMuted} /><p style={{ color: theme.textMuted }} className="text-[11px] font-semibold">Poids actuel</p></div>
          <p style={{ color: theme.text }} className="text-[22px] font-extrabold">{lastWeight ? `${fmtWeight(lastWeight.weight)} kg` : "—"}</p>
          {lastWeight && <p style={{ color: theme.textFaint }} className="text-[11px] mt-0.5">{fmtDate(lastWeight.date)}</p>}
        </Card>
        <Card theme={theme} className="p-4">
          <div className="flex items-center gap-1.5 mb-1"><Flame size={13} color={theme.accent} /><p style={{ color: theme.textMuted }} className="text-[11px] font-semibold">Séances (7j)</p></div>
          <p style={{ color: theme.text }} className="text-[22px] font-extrabold">{last7.length}</p>
          <p style={{ color: theme.textFaint }} className="text-[11px] mt-0.5">{Math.round(tonnage7).toLocaleString("fr-FR")} kg soulevés</p>
        </Card>
      </div>

      <div>
        <SectionTitle theme={theme}>Dernières performances</SectionTitle>
        {recentSessions.length === 0 ? (
          <Card theme={theme}><EmptyState theme={theme} icon={Dumbbell} title="Aucune séance enregistrée" subtitle="Lance ta première séance pour voir ton historique ici." /></Card>
        ) : (
          <Card theme={theme} className="divide-y" style={{ borderColor: theme.border }}>
            {recentSessions.map((s) => (
              <div key={s.id} className="px-4 py-3.5 flex items-center justify-between" style={{ borderTop: `1px solid ${theme.border}` }}>
                <div>
                  <p style={{ color: theme.text }} className="font-semibold text-[14px]">{s.programName}</p>
                  <p style={{ color: theme.textMuted }} className="text-[12px]">{fmtDate(s.date)} · {fmtDuration(s.durationSec || 0)}</p>
                </div>
                <p style={{ color: theme.accent }} className="text-[13px] font-bold">{Math.round(s.tonnage).toLocaleString("fr-FR")} kg</p>
              </div>
            ))}
          </Card>
        )}
      </div>

      <div>
        <SectionTitle theme={theme}>Records personnels</SectionTitle>
        {topPRs.length === 0 ? (
          <Card theme={theme}><EmptyState theme={theme} icon={Trophy} title="Pas encore de records" /></Card>
        ) : (
          <div className="grid grid-cols-3 gap-2.5">
            {topPRs.map(([name, pr]) => (
              <Card theme={theme} className="p-3" key={name}>
                <Trophy size={14} color={theme.accent2} className="mb-1.5" />
                <p style={{ color: theme.text }} className="text-[13px] font-bold leading-tight">{pr.maxWeight}kg</p>
                <p style={{ color: theme.textMuted }} className="text-[10.5px] leading-tight mt-0.5 line-clamp-2">{name}</p>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Card theme={theme} className="p-4 flex items-start gap-3" style={{ background: `linear-gradient(135deg, ${theme.accent}14, ${theme.accent2}0a)` }}>
        <Sparkles size={16} color={theme.accent} className="mt-0.5 shrink-0" />
        <p style={{ color: theme.text }} className="text-[13px] italic leading-snug">{quoteOfTheDay()}</p>
      </Card>
    </div>
  );
}

/* ============================== PROGRAMS ============================== */
