import {
  Calendar, ArrowUp, Minus, Zap,
} from "lucide-react";
import { Card } from "../ui/Card";
import { IconBadge } from "../ui/Feedback";
import { fmtDate, fmtNum } from "../../utils/formatters";

export function compareToLast(currentSet, lastSet) {
  if (!lastSet || !lastSet.weight || !lastSet.reps) return null;
  const curW = Number(currentSet.weight) || 0;
  const curR = Number(currentSet.reps) || 0;
  if (!curW && !curR) return null; // rien saisi pour l'instant
  const lastW = Number(lastSet.weight) || 0;
  const lastR = Number(lastSet.reps) || 0;

  if (curW > lastW) return { type: "up", label: `+${fmtNum(curW - lastW)} kg de progression` };
  if (curW === lastW && curR > lastR) return { type: "up", label: `+${curR - lastR} rép. de progression` };
  if (curW === lastW && curR === lastR) return { type: "same", label: "Même performance" };
  return null; // en dessous de la dernière fois : on reste discret, pas de message négatif
}

// --- Carte "Dernière séance" : récap complet de la dernière fois + comparaison live ----
// Affichée juste au-dessus de la zone de saisie poids/reps pendant l'entraînement.

export function LastSessionCard({ theme, last, currentSet }) {
  if (!last) {
    return (
      <Card theme={theme} className="p-4 mb-4 flex items-center gap-2.5" style={{ background: `${theme.accent2}14`, border: `1px solid ${theme.accent2}33` }}>
        <IconBadge theme={theme} icon={Zap} size={32} iconSize={15} tone="accent" />
        <p style={{ color: theme.text }} className="text-[13.5px] font-semibold">Première fois sur cet exercice</p>
      </Card>
    );
  }

  const doneSets = last.log.sets.filter((s) => s.done && (s.weight || s.reps));
  // La comparaison porte sur la série de même numéro que celle en cours de saisie.
  const lastSetSameRound = last.log.sets[currentSet.round];
  const comparison = compareToLast(currentSet, lastSetSameRound);

  return (
    <Card theme={theme} className="p-4 mb-4" style={{ background: theme.card2, border: `1px solid ${theme.border}` }}>
      <div className="flex items-center gap-1.5 mb-2.5">
        <span style={{ color: theme.textFaint }} className="text-[10.5px] font-bold uppercase tracking-wide">Dernière séance</span>
        <span style={{ color: theme.textMuted }} className="text-[11.5px] flex items-center gap-1">
          <Calendar size={11} /> {fmtDate(last.session.date, { day: "numeric", month: "long", year: "numeric" })}
        </span>
      </div>
      <div className="space-y-1 mb-1">
        {doneSets.length === 0 ? (
          <p style={{ color: theme.textFaint }} className="text-[12.5px]">Aucune série enregistrée.</p>
        ) : (
          doneSets.map((s, i) => (
            <p key={i} style={{ color: theme.textMuted }} className="text-[13px]">
              Série {i + 1} : <span style={{ color: theme.text }} className="font-semibold">{s.reps || 0} reps à {fmtNum(s.weight)} kg</span>
            </p>
          ))
        )}
      </div>
      {comparison && (
        <div className="flex items-center gap-1.5 mt-2.5 pt-2.5" style={{ borderTop: `1px dashed ${theme.border}` }}>
          {comparison.type === "up" ? <ArrowUp size={13} color={theme.good} /> : <Minus size={13} color={theme.textMuted} />}
          <span className="text-[12.5px] font-bold" style={{ color: comparison.type === "up" ? theme.good : theme.textMuted }}>
            {comparison.label}
          </span>
        </div>
      )}
    </Card>
  );
}

// --- Carte "exercice verrouillé" : aperçu en lecture seule d'un exercice à venir --------
// Rien n'y est interactif : ni le poids, ni les reps, ni les séries, ni l'ordre. Un tap
// affiche un message explicatif au lieu d'ouvrir une édition.
