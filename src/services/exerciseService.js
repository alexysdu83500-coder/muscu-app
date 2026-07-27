// Les calculs eux-mêmes vivent dans utils/calculations.js (règle du refactoring : "les
// calculs vont dans utils/"). Ce service ne fait que les regrouper sous un point d'entrée
// "métier exercices/programmes", avec la normalisation de programme qui va de pair.
export { flattenExercises, groupLabel, computeGroupLetters, buildSessionSteps } from "../utils/calculations";
export { normalizeProgram } from "./workoutService";
