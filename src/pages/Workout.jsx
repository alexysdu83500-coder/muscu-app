import React from "react";
import { WorkoutStartScreen } from "../components/workout/WorkoutStartScreen";

// Page "Séance". N'expose QUE l'écran "aucune séance en cours" (WorkoutStartScreen).
//
// ATTENTION — pourquoi <WorkoutSession/> (composants/workout/WorkoutSessionView.jsx)
// n'est PAS rendu ici : la séance active doit rester montée en permanence, y compris
// quand l'utilisateur change d'onglet (chrono/minuteur qui continuent en arrière-plan).
// Ce montage persistant vit donc directement dans App.jsx (en dehors du routage par
// page), avec sa visibilité gérée en CSS plutôt que par montage/démontage React. Ne pas
// "nettoyer" cette logique en la déplaçant ici sans réintroduire le bug corrigé
// précédemment (perte du chrono/minuteur en changeant d'onglet).
export function Workout(props) {
  return <WorkoutStartScreen {...props} />;
}
