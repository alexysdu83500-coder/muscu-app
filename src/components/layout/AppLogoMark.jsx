export function AppLogoMark({ size = 40 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none">
      <defs>
        <linearGradient id="logoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FF5A36" />
          <stop offset="100%" stopColor="#FF9F1C" />
        </linearGradient>
      </defs>
      <rect x="1" y="1" width="38" height="38" rx="12" fill="url(#logoGrad)" />
      <path d="M22 6 L11 22h7l-2 12 13-17h-8l1-11z" fill="#fff" />
    </svg>
  );
}

/* ============================================================================
   GROUPES MUSCULAIRES — illustrations SVG minimalistes réutilisables
   ============================================================================
   Choix de design assumé : UN SEUL pictogramme humain, géométrique et épuré
   (formes arrondies simples, pas d'anatomie détaillée), réutilisé pour tous les
   groupes musculaires — seule la zone mise en évidence (remplissage clair très
   discret) change d'un groupe à l'autre. Ça garantit une cohérence visuelle
   parfaite entre toutes les cartes, contrairement à 13 dessins différents.
*/
