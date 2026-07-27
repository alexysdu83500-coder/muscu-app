import { motion } from "framer-motion";
import {
  ChevronRight, Flame,
} from "lucide-react";
import { fmtClock } from "../../utils/formatters";

export function ActiveSessionBanner({ theme, status, onTap }) {
  return (
    <motion.button
      onClick={onTap}
      initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 50, opacity: 0 }}
      transition={{ type: "spring", damping: 26, stiffness: 300 }}
      className="fixed left-0 right-0 z-40 flex justify-center px-3 pointer-events-auto"
      style={{ maxWidth: 480, margin: "0 auto", bottom: "calc(92px + env(safe-area-inset-bottom))" }}
    >
      <div
        className="w-full flex items-center gap-3 rounded-2xl px-4 py-3 active:scale-[0.98] transition-transform"
        style={{ maxWidth: 448, background: `linear-gradient(135deg, ${theme.accent}, ${theme.accent2})`, boxShadow: `0 10px 30px -10px ${theme.accent}aa` }}
      >
        <motion.span animate={{ opacity: [1, 0.4, 1] }} transition={{ repeat: Infinity, duration: 1.3 }} className="shrink-0 flex items-center">
          <Flame size={17} color="#fff" fill="#fff" />
        </motion.span>
        <div className="flex-1 min-w-0 text-left">
          <p className="text-white font-bold text-[13px] truncate">
            Séance en cours{status?.exerciseName ? ` · ${status.exerciseName}` : ""}
          </p>
          <p className="text-white/85 text-[11px] tabular-nums">
            {fmtClock(status?.elapsedSec || 0)}
            {status?.phase === "rest" && status?.restRemaining != null ? ` · repos ${fmtClock(status.restRemaining)}` : ""}
          </p>
        </div>
        <ChevronRight size={17} color="#fff" className="shrink-0" />
      </div>
    </motion.button>
  );
}

// Écran affiché sur l'onglet "Séance" quand aucune séance n'est active : choisir un
// programme pour démarrer immédiatement (la gestion des programmes vit dans Profil).
// Onglet "Séance" quand AUCUNE séance n'est active : ne montre jamais de liste de
// programmes ici (ça, c'est le rôle d'Accueil). Juste un état vide qui renvoie choisir
// une séance sur Accueil.
