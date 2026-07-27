import {
  Moon, Sun,
} from "lucide-react";
import { IconBadge } from "../ui/Feedback";
import { TAB_ICONS, TAB_TITLES } from "../../utils/constants";

export function TopBar({ theme, tab, isDark, setIsDark }) {
  return (
    <div className="flex items-center justify-between px-5 pt-4 pb-2">
      <div className="flex items-center gap-2.5">
        <IconBadge theme={theme} icon={TAB_ICONS[tab]} size={34} iconSize={16} filled />
        <h1 style={{ color: theme.text }} className="text-[26px] font-extrabold tracking-tight">{TAB_TITLES[tab]}</h1>
      </div>
      <button onClick={() => setIsDark((d) => !d)} className="active:scale-90 transition-transform rounded-full flex items-center justify-center" style={{ width: 38, height: 38, background: theme.card2, border: `1px solid ${theme.border}` }}>
        {isDark ? <Sun size={17} color={theme.text} /> : <Moon size={17} color={theme.text} />}
      </button>
    </div>
  );
}

// Seulement 3 onglets, comme demandé. "Séance" reste en orange tant qu'une séance est
// active, même si un autre onglet est sélectionné (petit point qui pulse en plus du badge).
