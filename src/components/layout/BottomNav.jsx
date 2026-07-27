import { motion } from "framer-motion";
import {
  Home, Flame, User,
} from "lucide-react";
import { IconBadge } from "../ui/Feedback";

export function BottomNav({ theme, tab, setTab, activeWorkout }) {
  const items = [
    { id: "dashboard", icon: Home, label: "Accueil" },
    { id: "workout", icon: Flame, label: "Séance" },
    { id: "profile", icon: User, label: "Profil" },
  ];
  return (
    <div className="fixed bottom-0 left-0 right-0 flex justify-center pointer-events-none z-50">
      <div className="w-full pointer-events-auto" style={{ maxWidth: 480 }}>
        <div
          className="mx-3 rounded-3xl flex items-stretch justify-between px-1 py-1.5 backdrop-blur-xl"
          style={{ background: theme.tabBg, border: `1px solid ${theme.border}`, boxShadow: "0 10px 30px -10px rgba(0,0,0,0.3)", marginBottom: "calc(12px + env(safe-area-inset-bottom))" }}
        >
          {items.map((it) => {
            const selected = tab === it.id;
            const isWorkoutBtn = it.id === "workout";
            const highlighted = selected || (isWorkoutBtn && activeWorkout);
            return (
              <button key={it.id} onClick={() => setTab(it.id)} className="relative flex-1 flex flex-col items-center justify-center gap-1 py-1.5 rounded-2xl transition-all active:scale-90">
                {highlighted ? (
                  <IconBadge theme={theme} icon={it.icon} size={26} iconSize={14} filled />
                ) : (
                  <it.icon size={19} color={theme.textMuted} strokeWidth={2} />
                )}
                {isWorkoutBtn && activeWorkout && !selected && (
                  <motion.span
                    animate={{ opacity: [1, 0.35, 1] }} transition={{ repeat: Infinity, duration: 1.3 }}
                    className="absolute rounded-full" style={{ top: 2, right: "26%", width: 7, height: 7, background: theme.accent, boxShadow: `0 0 0 2px ${theme.tabBg}` }}
                  />
                )}
                <span style={{ color: highlighted ? theme.accent : theme.textMuted, fontSize: 9.5 }} className="font-semibold">{it.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// Bannière persistante affichée sur les AUTRES onglets tant qu'une séance est active :
// nom de l'exercice en cours + chrono en direct, tap pour revenir directement dessus.
