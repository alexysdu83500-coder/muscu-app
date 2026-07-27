export const MUSCLE_GROUPS = [
  { id: "pectoraux", label: "Pectoraux" },
  { id: "dos", label: "Dos" },
  { id: "epaules", label: "Épaules" },
  { id: "biceps", label: "Biceps" },
  { id: "triceps", label: "Triceps" },
  { id: "avant_bras", label: "Avant-bras" },
  { id: "quadriceps", label: "Quadriceps" },
  { id: "ischios", label: "Ischio-jambiers" },
  { id: "fessiers", label: "Fessiers" },
  { id: "mollets", label: "Mollets" },
  { id: "abdominaux", label: "Abdominaux" },
  { id: "lombaires", label: "Lombaires" },
  { id: "full_body", label: "Corps complet" },
];

export const muscleLabel = (id) => MUSCLE_GROUPS.find((m) => m.id === id)?.label || id;

// Le pictogramme de base : tête, tronc, deux bras, deux jambes — uniquement des
// formes simples (cercle + rectangles arrondis), contour fin, aucun remplissage.
