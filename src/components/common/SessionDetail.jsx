import React, { useState } from "react";
import { AnimatePresence } from "framer-motion";
import {
  ChevronLeft, Trash2, Edit2, Copy, Flame, Info,
} from "lucide-react";
import { ProgressPage } from "../statistics/ProgressPage";
import { StatsPage } from "../statistics/StatsPage";
import { BigButton, Card, IconButton } from "../ui/Card";
import { ConfirmSheet } from "../ui/Feedback";
import { computePRs } from "../../services/statisticsService";
import { computeGroupLetters, groupLabel } from "../../utils/calculations";
import { fmtDateFull, fmtDuration } from "../../utils/formatters";

export function SessionDetail({ theme, session, onBack, onDelete, onDuplicate, onEdit }) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  if (!session) return null;
  return (
    <div className="px-4 pt-1 space-y-4">
      <div className="flex items-center gap-2 -ml-1">
        <IconButton theme={theme} onClick={onBack}><ChevronLeft size={18} color={theme.text} /></IconButton>
        <div className="flex-1 min-w-0">
          <h1 style={{ color: theme.text }} className="text-[19px] font-extrabold truncate">{session.programName}</h1>
          <p style={{ color: theme.textMuted }} className="text-[12.5px] capitalize">{fmtDateFull(session.date)}</p>
        </div>
        <IconButton theme={theme} onClick={() => onEdit(session.id)} aria-label="Modifier la séance"><Edit2 size={16} color={theme.text} /></IconButton>
      </div>
      {session.notes && (
        <Card theme={theme} className="p-3.5 flex items-start gap-2.5" style={{ background: `${theme.accent}0f` }}>
          <Info size={14} color={theme.accent} className="mt-0.5 shrink-0" />
          <p style={{ color: theme.text }} className="text-[13px] leading-snug">{session.notes}</p>
        </Card>
      )}
      <div className="grid grid-cols-3 gap-2.5">
        <Card theme={theme} className="p-3 text-center"><p style={{ color: theme.text }} className="text-[16px] font-extrabold">{Math.round(session.tonnage).toLocaleString("fr-FR")}</p><p style={{ color: theme.textFaint }} className="text-[10px]">kg tonnage</p></Card>
        <Card theme={theme} className="p-3 text-center"><p style={{ color: theme.text }} className="text-[16px] font-extrabold">{session.totalSets}</p><p style={{ color: theme.textFaint }} className="text-[10px]">séries</p></Card>
        <Card theme={theme} className="p-3 text-center"><p style={{ color: theme.text }} className="text-[16px] font-extrabold">{fmtDuration(session.durationSec || 0)}</p><p style={{ color: theme.textFaint }} className="text-[10px]">durée</p></Card>
      </div>
      <div className="space-y-2.5">
        {(() => {
          const byId = Object.fromEntries(session.exerciseLogs.map((el) => [el.exerciseId, el]));
          const blocks = (session.blocks && session.blocks.length ? session.blocks : session.exerciseLogs.map((el) => ({ id: el.exerciseId, restSec: null, exerciseIds: [el.exerciseId] })));
          const letters = computeGroupLetters(blocks.map((b) => ({ id: b.id, exercises: b.exerciseIds })));
          return blocks.map((b) => {
            const logs = b.exerciseIds.map((id) => byId[id]).filter(Boolean);
            if (logs.length === 0) return null;
            const isGroup = logs.length > 1;
            return (
              <Card theme={theme} className="p-4" key={b.id} style={isGroup ? { border: `1.5px solid ${theme.accent}55` } : {}}>
                {isGroup && (
                  <span className="px-2.5 py-1 rounded-full text-[10.5px] font-extrabold inline-block mb-3" style={{ background: theme.accent, color: "#fff" }}>
                    {groupLabel(logs.length)}
                  </span>
                )}
                {b.isAbsBlock && (
                  <span className="px-2.5 py-1 rounded-full text-[10.5px] font-extrabold inline-flex items-center gap-1 mb-3" style={{ background: `${theme.accent}1f`, color: theme.accent }}>
                    <Flame size={11} /> Abdominaux
                  </span>
                )}
                <div className={isGroup ? "space-y-3" : ""}>
                  {logs.map((el, i) => (
                    <div key={el.exerciseId} className={isGroup && i > 0 ? "pt-3" : ""} style={isGroup && i > 0 ? { borderTop: `1px dashed ${theme.border}` } : {}}>
                      <p style={{ color: theme.text }} className="font-bold text-[14.5px] mb-2">
                        {isGroup && <span style={{ color: theme.accent }} className="mr-1.5">{letters[b.id]}{i + 1}</span>}
                        {el.name}
                      </p>
                      <div className="space-y-1">
                        {el.sets.map((s, si) => (
                          <div key={si} className="flex items-center justify-between text-[13px]" style={{ color: s.done ? theme.text : theme.textFaint }}>
                            <span>Série {si + 1}</span>
                            <span className="font-semibold">{s.weight || 0} kg × {s.reps || 0}{el.targetUnit === "sec" ? "s" : ""}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            );
          });
        })()}
      </div>
      <div className="grid grid-cols-2 gap-2.5 pt-2">
        <BigButton theme={theme} onClick={() => onDuplicate(session)}><Copy size={15} /> Dupliquer</BigButton>
        <BigButton theme={theme} onClick={() => setConfirmDelete(true)} style={{ color: theme.bad }}><Trash2 size={15} /> Supprimer</BigButton>
      </div>
      <AnimatePresence>
        {confirmDelete && <ConfirmSheet theme={theme} danger title="Supprimer cette séance ?" subtitle="Cette action est irréversible." confirmLabel="Supprimer" onConfirm={() => onDelete(session.id)} onCancel={() => setConfirmDelete(false)} />}
      </AnimatePresence>
    </div>
  );
}

/* ============================== EDIT PAST SESSION ============================== */
// Modifier une séance déjà réalisée. Les modifications ne touchent QUE cette séance :
// on travaille sur une copie locale (`draft`) et on ne remplace la séance d'origine dans
// `sessions` qu'au clic sur "Enregistrer" — tant que ce n'est pas fait, rien n'est perdu ni
// modifié ailleurs. Comme les records, la progression et les statistiques sont TOUJOURS
// recalculés à la volée à partir du tableau `sessions` (computePRs, ProgressPage, StatsPage
// ne font que le lire), il n'y a rien de spécial à faire pour les tenir à jour : remplacer
// la séance dans `sessions` suffit, tout le reste de l'app se remet à jour tout seul.
