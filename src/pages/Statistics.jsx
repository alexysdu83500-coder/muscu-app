// Page "Statistiques". Dans la navigation actuelle (3 onglets : Accueil / Séance / Profil),
// Progression, Records et Statistiques détaillées sont des sous-écrans de Profil, pas des
// routes de premier niveau — voir components/common/ProfileHub.jsx. Ce fichier régroupe
// les trois en un seul point d'import, prêt à être utilisé comme une vraie page dédiée si
// la navigation évolue un jour vers plus d'onglets.
export { ProgressPage } from "../components/statistics/ProgressPage";
export { StatsPage } from "../components/statistics/StatsPage";
export { RecordsPage } from "../components/statistics/RecordsPage";
