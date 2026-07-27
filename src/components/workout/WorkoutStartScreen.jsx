import {
  Home, Flame,
} from "lucide-react";
import { SessionDetail } from "../common/SessionDetail";
import { ProgramEditor } from "../exercises/ProgramEditor";
import { BigButton, Card } from "../ui/Card";

export function WorkoutStartScreen({ theme, onGoToDashboard }) {
  return (
    <div className="px-4 pt-10">
      <Card theme={theme} className="p-8 flex flex-col items-center text-center">
        <div className="rounded-full flex items-center justify-center mb-4" style={{ width: 72, height: 72, background: theme.card2 }}>
          <Flame size={30} color={theme.textFaint} />
        </div>
        <p style={{ color: theme.text }} className="font-bold text-[16px] mb-1.5">Aucune séance en cours</p>
        <p style={{ color: theme.textMuted }} className="text-[13px] mb-6 max-w-[260px]">Choisis une séance sur l'écran d'accueil pour commencer à t'entraîner.</p>
        <BigButton theme={theme} gradient onClick={onGoToDashboard}>
          <Home size={17} /> Choisir une séance
        </BigButton>
      </Card>
    </div>
  );
}

// Petit en-tête réutilisé par les sous-pages de Profil (celles qui n'ont pas déjà leur
// propre en-tête intégré comme ProgramEditor ou SessionDetail).
