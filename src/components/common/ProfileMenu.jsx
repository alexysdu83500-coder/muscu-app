import {
  Dumbbell, HistoryIcon, TrendingUp, Scale, BarChart3, ChevronRight, Settings, Trophy, Utensils,
} from "lucide-react";
import { ProfileAccountHeader } from "./ProfileAccountHeader";
import { Card } from "../ui/Card";
import { IconBadge } from "../ui/Feedback";

export const PROFILE_MENU_ITEMS = [
  { id: "weight", view: "weight", icon: Scale, label: "Poids", desc: "Poids actuel, évolution, ajout, historique" },
  { id: "nutrition", view: "nutrition", icon: Utensils, label: "Objectifs nutritionnels", desc: "Calories, macros, coach adaptatif" },
  { id: "progress", view: "progress", icon: TrendingUp, label: "Progression", desc: "Graphiques, charges, évolution des performances" },
  { id: "history", view: "history", icon: HistoryIcon, label: "Historique séances", desc: "Revoir toutes tes séances passées" },
  { id: "records", view: "records", icon: Trophy, label: "Records", desc: "Tes meilleures charges par exercice" },
  { id: "settings", view: "settings", icon: Settings, label: "Paramètres", desc: "Thème, repos par défaut" },
  { id: "stats", view: "stats", icon: BarChart3, label: "Statistiques détaillées", desc: "Totaux, fréquence, heatmap, sauvegarde" },
  { id: "programs", view: "programs", icon: Dumbbell, label: "Mes programmes", desc: "Créer, modifier, organiser tes séances" },
];

export function ProfileMenu({ theme, userProfile, onSelect, onOpenProfile }) {
  return (
    <div className="px-4 pt-2 space-y-2.5">
      <ProfileAccountHeader theme={theme} userProfile={userProfile} onOpenProfile={onOpenProfile} />
      {PROFILE_MENU_ITEMS.map((it) => (
        <button key={it.id} onClick={() => onSelect(it.view)} className="w-full text-left active:scale-[0.98] transition-transform">
          <Card theme={theme} className="p-4 flex items-center gap-3">
            <IconBadge theme={theme} icon={it.icon} size={40} iconSize={18} filled />
            <div className="flex-1 min-w-0">
              <p style={{ color: theme.text }} className="font-bold text-[15px]">{it.label}</p>
              <p style={{ color: theme.textMuted }} className="text-[12px] mt-0.5">{it.desc}</p>
            </div>
            <ChevronRight size={16} color={theme.textFaint} className="shrink-0" />
          </Card>
        </button>
      ))}
    </div>
  );
}

// --- "Mon profil" : identité modifiable + aperçu rapide de l'activité ------------------
// Profil local à cet appareil (pas de compte, pas de mot de passe, pas de connexion —
// simplement tes infos personnelles pour personnaliser l'app).
