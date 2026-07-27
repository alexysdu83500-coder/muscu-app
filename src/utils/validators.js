import { parseLocaleNumber } from "./formatters";

// Validation d'une pesée avant sauvegarde (poids obligatoire et > 0 ; tour de taille et
// masse grasse optionnels mais doivent être des nombres valides s'ils sont renseignés).
// Retourne { valid: true } ou { valid: false, error: "message pour l'utilisateur" }.
export function validateWeightEntry({ weight, waist, bodyfat }) {
  if (weight == null || String(weight).trim() === "") {
    return { valid: false, error: "Indique un poids avant d'enregistrer." };
  }
  const parsedWeight = parseLocaleNumber(weight);
  if (!Number.isFinite(parsedWeight)) {
    return { valid: false, error: "Poids invalide — utilise uniquement des chiffres (ex : 92,6 ou 92.6)." };
  }
  if (parsedWeight <= 0) {
    return { valid: false, error: "Le poids doit être supérieur à 0." };
  }

  let parsedWaist = null;
  if (waist != null && String(waist).trim() !== "") {
    parsedWaist = parseLocaleNumber(waist);
    if (!Number.isFinite(parsedWaist)) return { valid: false, error: "Tour de taille invalide." };
  }

  let parsedBodyfat = null;
  if (bodyfat != null && String(bodyfat).trim() !== "") {
    parsedBodyfat = parseLocaleNumber(bodyfat);
    if (!Number.isFinite(parsedBodyfat)) return { valid: false, error: "Masse grasse invalide." };
  }

  return { valid: true, weight: parsedWeight, waist: parsedWaist, bodyfat: parsedBodyfat };
}

// Un nombre saisi par l'utilisateur (poids, objectif...) est valide s'il est fini et > 0.
export function isPositiveNumber(value) {
  const n = parseLocaleNumber(value);
  return Number.isFinite(n) && n > 0;
}
