import React, { useState } from "react";
import { Search } from "lucide-react";
import { Card } from "../components/ui/Card";
import { COMMON_EXERCISES } from "../data/exercises";

// Page "Bibliothèque d'exercices" — PAS ENCORE branchée dans la navigation (ne change
// rien au fonctionnement actuel de l'app). C'est un emplacement prêt pour une future
// évolution : une vraie page de recherche/parcours des exercices, réutilisant les mêmes
// données que le sélecteur déjà utilisé dans AddExerciseSheet.
export function ExerciseLibrary({ theme }) {
  const [query, setQuery] = useState("");
  const filtered = query
    ? COMMON_EXERCISES.filter((e) => e.toLowerCase().includes(query.toLowerCase()))
    : COMMON_EXERCISES;

  return (
    <div className="px-4 pt-2 space-y-3">
      <div className="relative">
        <Search size={14} color={theme.textFaint} className="absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          placeholder="Rechercher un exercice" value={query} onChange={(e) => setQuery(e.target.value)}
          className="w-full rounded-xl pl-9 pr-3 py-2.5 text-[14px] outline-none"
          style={{ background: theme.card2, color: theme.text, border: `1px solid ${theme.border}` }}
        />
      </div>
      <Card theme={theme}>
        {filtered.map((name, i) => (
          <div key={name} className="px-4 py-3" style={{ borderTop: i ? `1px solid ${theme.border}` : "none" }}>
            <p style={{ color: theme.text }} className="text-[14px] font-semibold">{name}</p>
          </div>
        ))}
      </Card>
    </div>
  );
}
