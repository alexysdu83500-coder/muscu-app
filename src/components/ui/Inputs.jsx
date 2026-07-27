import {
  Plus, Minus,
} from "lucide-react";

export function FieldRow({ theme, label, children }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span style={{ color: theme.textMuted }} className="text-[12.5px] font-medium shrink-0">{label}</span>
      {children}
    </div>
  );
}

export function MiniStepper({ theme, label, value, onChange, step = 1, suffix = "" }) {
  return (
    <div className="rounded-xl p-2 flex flex-col items-center" style={{ background: theme.card2, border: `1px solid ${theme.border}` }}>
      <span style={{ color: theme.textFaint }} className="text-[9.5px] font-semibold uppercase mb-1">{label}</span>
      <div className="flex items-center gap-1.5">
        <button onClick={() => onChange(Math.max(0, value - step))} className="w-5 h-5 rounded-md flex items-center justify-center active:scale-90" style={{ background: theme.bg }}>
          <Minus size={10} color={theme.text} />
        </button>
        <span style={{ color: theme.text }} className="text-[13px] font-bold w-8 text-center">{value}{suffix}</span>
        <button onClick={() => onChange(value + step)} className="w-5 h-5 rounded-md flex items-center justify-center active:scale-90" style={{ background: theme.bg }}>
          <Plus size={10} color={theme.text} />
        </button>
      </div>
    </div>
  );
}

export function BigNumberStepper({ theme, label, value, onChange, step = 1 }) {
  const num = Number(value) || 0;
  return (
    <div className="rounded-2xl p-3 flex flex-col w-full" style={{ background: theme.card2, border: `1px solid ${theme.border}` }}>
      {/* Hauteur de ligne fixe (au lieu d'un simple margin-bottom) : garantit que le libellé
          occupe TOUJOURS la même hauteur, qu'il tienne sur une ligne ("Répétitions") ou
          risque de passer à la ligne sur un petit écran ("Charge (kg)"). Sans ça, la ligne
          -/valeur/+ ne démarre pas à la même hauteur d'une carte à l'autre : c'était la
          cause exacte du décalage entre le champ Poids et le champ Répétitions. */}
      <p
        style={{ color: theme.textFaint, height: 14, lineHeight: "14px" }}
        className="text-[10px] font-bold uppercase tracking-wide mb-2 text-center whitespace-nowrap overflow-hidden"
      >
        {label}
      </p>
      <div className="flex items-center justify-between gap-1.5 w-full">
        <button
          onClick={() => onChange(String(Math.max(0, num - step)))}
          className="rounded-xl flex items-center justify-center active:scale-90 transition-transform shrink-0"
          style={{ width: 42, height: 42, background: theme.bg }}
        >
          <Minus size={16} color={theme.text} />
        </button>
        {/* min-w-0 : par défaut, un <input> dans une rangée flex refuse de rétrécir sous sa
            largeur de contenu (min-width: auto). Sur un petit écran, ça pouvait pousser le
            bouton "+" hors de la carte ou faire chevaucher les chiffres. flex-1 + min-w-0
            laisse l'input occuper exactement l'espace restant, jamais plus. */}
        <input
          inputMode="decimal" value={value} onChange={(e) => onChange(e.target.value)}
          className="flex-1 min-w-0 text-center bg-transparent outline-none font-extrabold text-[22px]"
          style={{ color: theme.text }}
        />
        <button
          onClick={() => onChange(String(num + step))}
          className="rounded-xl flex items-center justify-center active:scale-90 transition-transform shrink-0"
          style={{ width: 42, height: 42, background: theme.bg }}
        >
          <Plus size={16} color={theme.text} />
        </button>
      </div>
    </div>
  );
}

// --- Carte "exercice en cours" : nom, infos (séries/reps/charge), consignes, saisie -----
// Compare la série en cours de saisie à la série équivalente (même numéro) de la dernière
// séance sur cet exercice. Ne renvoie une indication QUE en cas de progression ou d'égalité
// stricte — jamais d'indication négative/décourageante pendant l'entraînement.

export function LabeledInput({ theme, label, value, onChange, placeholder = "", secure = false, keyboard }) {
  return (
    <div>
      <p style={{ color: theme.textMuted }} className="text-[12px] font-semibold mb-1.5 px-1">{label}</p>
      <input
        type={secure ? "password" : "text"} inputMode={keyboard === "email" ? "email" : "text"}
        value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        className="w-full rounded-xl px-3.5 py-3 text-[14.5px] outline-none"
        style={{ background: theme.card2, color: theme.text, border: `1px solid ${theme.border}` }}
      />
    </div>
  );
}

// En-tête affiché tout en haut du menu Profil : avatar + nom si renseigné, sinon un
// avatar neutre — tape dessus pour aller renseigner tes infos dans "Mon profil".
