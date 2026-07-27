import { uid } from "../utils/uid";

export const singleBlock = (name, series, reps, rest, notes = "", primaryMuscle = null, secondaryMuscles = []) => ({
  id: uid(), restSec: rest, exercises: [{ id: uid(), name, series, reps, notes, primaryMuscle, secondaryMuscles }],
});

// Bloc abdos par défaut, ajouté à la fin de chaque programme d'exemple. `unit: "sec"`
// signifie que la valeur saisie pendant la séance est une DURÉE (secondes), pas des reps —
// utilisé ici pour le gainage.

export const defaultAbsExercises = () => ([
  { id: uid(), name: "Crunch poulie", series: 4, reps: 15, unit: "reps", restSec: 45, primaryMuscle: "abdominaux", secondaryMuscles: [] },
  { id: uid(), name: "Relevé de jambes", series: 3, reps: 12, unit: "reps", restSec: 45, primaryMuscle: "abdominaux", secondaryMuscles: [] },
  { id: uid(), name: "Gainage", series: 3, reps: 60, unit: "sec", restSec: 45, primaryMuscle: "abdominaux", secondaryMuscles: ["lombaires"] },
]);

export const DEFAULT_PROGRAMS = [
  {
    id: uid(), name: "Pecs", color: "#FF5A36", muscleGroups: ["pectoraux", "epaules", "triceps"],
    blocks: [
      singleBlock("Développé couché barre", 4, 8, 120, "", "pectoraux", ["triceps", "epaules"]),
      {
        id: uid(), restSec: 90,
        exercises: [
          { id: uid(), name: "Développé incliné haltères", series: 3, reps: 10, notes: "", primaryMuscle: "pectoraux", secondaryMuscles: ["epaules"] },
          { id: uid(), name: "Écarté poulie vis-à-vis", series: 3, reps: 12, notes: "", primaryMuscle: "pectoraux", secondaryMuscles: [] },
        ],
      },
      singleBlock("Dips lestés", 3, 10, 90, "", "pectoraux", ["triceps"]),
    ],
    absExercises: defaultAbsExercises(),
  },
  {
    id: uid(), name: "Épaules / Bras", color: "#FF9F1C", muscleGroups: ["epaules", "biceps", "triceps"],
    blocks: [
      singleBlock("Développé militaire", 4, 8, 120, "", "epaules", ["triceps"]),
      singleBlock("Élévations latérales", 4, 12, 60, "", "epaules", []),
      {
        id: uid(), restSec: 75,
        exercises: [
          { id: uid(), name: "Curl barre EZ", series: 3, reps: 10, notes: "", primaryMuscle: "biceps", secondaryMuscles: ["avant_bras"] },
          { id: uid(), name: "Extension triceps poulie", series: 3, reps: 12, notes: "", primaryMuscle: "triceps", secondaryMuscles: [] },
        ],
      },
    ],
    absExercises: defaultAbsExercises(),
  },
  {
    id: uid(), name: "Dos", color: "#30D5A6", muscleGroups: ["dos", "biceps"],
    blocks: [
      singleBlock("Tractions lestées", 4, 8, 120, "", "dos", ["biceps", "avant_bras"]),
      singleBlock("Rowing barre", 4, 8, 100, "", "dos", ["biceps"]),
      singleBlock("Tirage horizontal poulie", 3, 12, 75, "", "dos", []),
      singleBlock("Soulevé de terre", 3, 6, 150, "", "dos", ["ischios", "fessiers", "lombaires"]),
    ],
    absExercises: defaultAbsExercises(),
  },
  {
    id: uid(), name: "Jambes", color: "#5E5CE6", muscleGroups: ["quadriceps", "ischios", "fessiers", "mollets"],
    blocks: [
      singleBlock("Squat barre", 4, 8, 150, "", "quadriceps", ["fessiers"]),
      singleBlock("Presse à cuisses", 4, 10, 100, "", "quadriceps", ["fessiers"]),
      singleBlock("Leg curl", 3, 12, 60, "", "ischios", []),
      singleBlock("Mollets debout", 4, 15, 45, "", "mollets", []),
    ],
    absExercises: [],
  },
];

/* ============================== SMALL UI PRIMITIVES ============================== */
