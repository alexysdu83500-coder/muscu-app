import {
  Check,
} from "lucide-react";
import { MUSCLE_GROUPS } from "../../utils/muscleGroups";

export function BodySilhouette({ stroke, children }) {
  return (
    <>
      <circle cx="60" cy="18" r="14" fill="none" stroke={stroke} strokeWidth="2" />
      <rect x="54" y="30" width="12" height="10" rx="3" fill="none" stroke={stroke} strokeWidth="2" />
      <rect x="35" y="40" width="50" height="68" rx="20" fill="none" stroke={stroke} strokeWidth="2" />
      <rect x="10" y="44" width="15" height="64" rx="7.5" fill="none" stroke={stroke} strokeWidth="2" transform="rotate(10 17.5 44)" />
      <rect x="95" y="44" width="15" height="64" rx="7.5" fill="none" stroke={stroke} strokeWidth="2" transform="rotate(-10 102.5 44)" />
      <rect x="40" y="106" width="17" height="92" rx="8.5" fill="none" stroke={stroke} strokeWidth="2" />
      <rect x="63" y="106" width="17" height="92" rx="8.5" fill="none" stroke={stroke} strokeWidth="2" />
      {children}
    </>
  );
}

// Zone à surligner pour chaque groupe musculaire, positionnée sur le pictogramme
// ci-dessus. Simplification assumée : un seul pictogramme "de face" sert de support
// à tous les groupes (y compris ceux normalement vus de dos, comme le Dos ou les
// Fessiers) — le but est un repère visuel rapide et cohérent, pas une planche
// anatomique. Facilement remplaçable par des tracés plus élaborés plus tard.

export const MUSCLE_HIGHLIGHTS = {
  pectoraux: (c) => (<>
    <ellipse cx="48" cy="54" rx="11" ry="9" fill={c} opacity="0.35" />
    <ellipse cx="72" cy="54" rx="11" ry="9" fill={c} opacity="0.35" />
  </>),
  epaules: (c) => (<>
    <circle cx="30" cy="46" r="9" fill={c} opacity="0.35" />
    <circle cx="90" cy="46" r="9" fill={c} opacity="0.35" />
  </>),
  biceps: (c) => (<>
    <ellipse cx="17" cy="62" rx="6.5" ry="12" fill={c} opacity="0.35" transform="rotate(10 17 62)" />
    <ellipse cx="103" cy="62" rx="6.5" ry="12" fill={c} opacity="0.35" transform="rotate(-10 103 62)" />
  </>),
  triceps: (c) => (<>
    <ellipse cx="14" cy="82" rx="6" ry="13" fill={c} opacity="0.3" transform="rotate(10 14 82)" />
    <ellipse cx="106" cy="82" rx="6" ry="13" fill={c} opacity="0.3" transform="rotate(-10 106 82)" />
  </>),
  avant_bras: (c) => (<>
    <ellipse cx="21" cy="100" rx="6" ry="10" fill={c} opacity="0.35" transform="rotate(10 21 100)" />
    <ellipse cx="99" cy="100" rx="6" ry="10" fill={c} opacity="0.35" transform="rotate(-10 99 100)" />
  </>),
  abdominaux: (c) => (<>
    <rect x="46" y="70" width="28" height="34" rx="6" fill={c} opacity="0.3" />
    <line x1="60" y1="70" x2="60" y2="104" stroke={c} strokeWidth="1" opacity="0.6" />
    <line x1="46" y1="80" x2="74" y2="80" stroke={c} strokeWidth="1" opacity="0.5" />
    <line x1="46" y1="91" x2="74" y2="91" stroke={c} strokeWidth="1" opacity="0.5" />
  </>),
  dos: (c) => (<>
    <rect x="38" y="42" width="44" height="62" rx="18" fill={c} opacity="0.28" />
    <line x1="60" y1="46" x2="60" y2="100" stroke={c} strokeWidth="1" opacity="0.5" />
  </>),
  lombaires: (c) => (<rect x="46" y="96" width="28" height="14" rx="5" fill={c} opacity="0.35" />),
  quadriceps: (c) => (<>
    <rect x="42" y="110" width="13" height="42" rx="6" fill={c} opacity="0.32" />
    <rect x="65" y="110" width="13" height="42" rx="6" fill={c} opacity="0.32" />
  </>),
  ischios: (c) => (<>
    <rect x="42" y="140" width="13" height="38" rx="6" fill={c} opacity="0.3" />
    <rect x="65" y="140" width="13" height="38" rx="6" fill={c} opacity="0.3" />
  </>),
  fessiers: (c) => (<ellipse cx="60" cy="108" rx="20" ry="10" fill={c} opacity="0.32" />),
  mollets: (c) => (<>
    <ellipse cx="48.5" cy="175" rx="7" ry="16" fill={c} opacity="0.32" />
    <ellipse cx="71.5" cy="175" rx="7" ry="16" fill={c} opacity="0.32" />
  </>),
  full_body: (c) => (<rect x="8" y="4" width="104" height="200" rx="30" fill={c} opacity="0.12" />),
};

// Illustration réutilisable : un ou plusieurs groupes musculaires surlignés sur le
// même pictogramme de base. `muscles` accepte un id unique ou un tableau.

export function MuscleIllustration({ theme, muscles, size = 56 }) {
  const list = (Array.isArray(muscles) ? muscles : [muscles]).filter(Boolean);
  return (
    <svg width={size} height={size} viewBox="0 0 120 220" preserveAspectRatio="xMidYMid meet">
      <BodySilhouette stroke={theme.textFaint}>
        {list.map((m) => {
          const fn = MUSCLE_HIGHLIGHTS[m];
          return fn ? <g key={m}>{fn(theme.text)}</g> : null;
        })}
      </BodySilhouette>
    </svg>
  );
}

// Grille de sélection multiple des groupes musculaires (création/édition de programme).

export function MuscleGroupPicker({ theme, selected, onToggle }) {
  return (
    <div className="grid grid-cols-3 gap-2.5">
      {MUSCLE_GROUPS.filter((m) => m.id !== "full_body").map((m) => {
        const active = selected.includes(m.id);
        return (
          <button
            key={m.id} onClick={() => onToggle(m.id)}
            className="rounded-2xl p-2.5 flex flex-col items-center gap-1.5 active:scale-95 transition-transform relative"
            style={{ background: active ? `${theme.accent}14` : theme.card2, border: `1.5px solid ${active ? theme.accent : theme.border}` }}
          >
            {active && (
              <div className="absolute top-1.5 right-1.5 rounded-full flex items-center justify-center" style={{ width: 16, height: 16, background: theme.accent }}>
                <Check size={10} color="#fff" strokeWidth={3} />
              </div>
            )}
            <MuscleIllustration theme={theme} muscles={m.id} size={44} />
            <span style={{ color: active ? theme.text : theme.textMuted }} className="text-[11px] font-semibold text-center leading-tight">{m.label}</span>
          </button>
        );
      })}
      <button
        onClick={() => onToggle("full_body")}
        className="rounded-2xl p-2.5 flex flex-col items-center gap-1.5 active:scale-95 transition-transform relative col-span-3"
        style={{ background: selected.includes("full_body") ? `${theme.accent}14` : theme.card2, border: `1.5px solid ${selected.includes("full_body") ? theme.accent : theme.border}` }}
      >
        {selected.includes("full_body") && (
          <div className="absolute top-1.5 right-1.5 rounded-full flex items-center justify-center" style={{ width: 16, height: 16, background: theme.accent }}>
            <Check size={10} color="#fff" strokeWidth={3} />
          </div>
        )}
        <div className="flex items-center gap-2">
          <MuscleIllustration theme={theme} muscles="full_body" size={32} />
          <span style={{ color: selected.includes("full_body") ? theme.text : theme.textMuted }} className="text-[12px] font-semibold">Corps complet</span>
        </div>
      </button>
    </div>
  );
}

/* ============================== APP ROOT ============================== */
