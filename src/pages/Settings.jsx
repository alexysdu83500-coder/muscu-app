import React from "react";
import { ProfileHub } from "../components/common/ProfileHub";

// Page "Profil" — nommée Settings.jsx pour suivre la structure demandée, mais couvre en
// réalité tout le hub Profil (poids, progression, historique, records, paramètres...),
// pas seulement les réglages. <ProfileHub/> gère sa propre navigation interne.
export function Settings(props) {
  return <ProfileHub {...props} />;
}
