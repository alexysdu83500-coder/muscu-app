export const fmtNum = (n) => {
  const num = Number(n) || 0;
  return Number.isInteger(num) ? String(num) : String(Math.round(num * 10) / 10);
};

// Convertit une saisie utilisateur en nombre, en acceptant le format français (virgule)
// ET le format international (point) : "92,6" et "92.6" donnent tous les deux 92.6.
// C'était la cause exacte du bug "NaN kg" : `Number("92,6")` (sans remplacement de la
// virgule) renvoie NaN, car Number()/parseFloat() ne comprennent que le point décimal.

export function fmtWeight(n) {
  const num = Number(n);
  if (!Number.isFinite(num)) return "—";
  return num.toLocaleString("fr-FR", { maximumFractionDigits: 1 });
}

export const fmtDate = (iso, opts) => {
  const d = new Date(iso + (iso.length === 10 ? "T12:00:00" : ""));
  return d.toLocaleDateString("fr-FR", opts || { day: "numeric", month: "short" });
};

export const fmtDateFull = (iso) =>
  new Date(iso + (iso.length === 10 ? "T12:00:00" : "")).toLocaleDateString("fr-FR", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

export const fmtDuration = (sec) => {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  if (m >= 60) {
    const h = Math.floor(m / 60);
    return `${h}h${String(m % 60).padStart(2, "0")}`;
  }
  return `${m}min ${s}s`;
};

export function fmtClock(sec) {
  const total = Math.max(0, Math.floor(sec));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

// Construit la liste ORDONNÉE des étapes d'une séance à partir des blocks du programme.
// Une étape = une série précise d'un exercice précis, dans l'ordre exact d'exécution :
//   - Exercice seul            -> Série 1, Série 2, Série 3...
//   - Biset/Triset/Circuit     -> pour chaque tour : A1 puis A2 (puis A3...) AVANT le repos.
// `isLastOfRound` indique si cette étape est la dernière du tour : c'est UNIQUEMENT à ce
// moment-là que le minuteur de récupération doit se déclencher (jamais entre A1 et A2).

export function parseLocaleNumber(str) {
  if (str == null) return NaN;
  const normalized = String(str).trim().replace(",", ".");
  if (normalized === "") return NaN;
  return Number(normalized);
}

// Affichage d'un poids au format français : virgule décimale, une seule décimale
// maximum, jamais de zéro inutile (92 -> "92", 92.6 -> "92,6", 85.25 -> "85,3").

export const todayISO = () => new Date().toISOString().slice(0, 10);

export const QUOTES = [
  "La discipline surpasse la motivation.",
  "Chaque série compte, même la dernière.",
  "Le corps accomplit ce que l'esprit croit possible.",
  "La progression est lente, la régularité est reine.",
  "Aujourd'hui tu deviens plus fort qu'hier.",
  "Le seul mauvais entraînement est celui qu'on ne fait pas.",
  "La constance bat l'intensité sur la durée.",
  "Ton seul adversaire, c'est toi d'hier.",
  "Petit à petit, la charge devient légère.",
  "Transpire maintenant, brille plus tard.",
];

export function quoteOfTheDay() {
  const d = new Date();
  const idx = (d.getFullYear() * 1000 + d.getMonth() * 31 + d.getDate()) % QUOTES.length;
  return QUOTES[idx];
}
