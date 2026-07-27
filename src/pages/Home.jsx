import React from "react";
import { Dashboard } from "../components/common/Dashboard";

// Page "Accueil". Fine couche de composition au-dessus de <Dashboard/> — permet d'ajouter
// plus tard des préoccupations propres à la page (analytics, garde de route, etc.) sans
// toucher au composant lui-même.
export function Home(props) {
  return <Dashboard {...props} />;
}
