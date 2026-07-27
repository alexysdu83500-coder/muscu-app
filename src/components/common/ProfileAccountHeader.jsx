import {
  ChevronRight, User,
} from "lucide-react";
import { Card } from "../ui/Card";
import { GOALS } from "../../utils/constants";

export function ProfileAccountHeader({ theme, userProfile, onOpenProfile }) {
  const initials = (userProfile?.name || "").split(" ").map((w) => w[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();
  return (
    <button onClick={onOpenProfile} className="w-full text-left active:scale-[0.98] transition-transform mb-1">
      <Card theme={theme} className="p-4 flex items-center gap-3">
        <div className="rounded-full flex items-center justify-center shrink-0 text-white font-extrabold" style={{ width: 48, height: 48, background: `linear-gradient(135deg, ${theme.accent}, ${theme.accent2})`, fontSize: 16 }}>
          {initials || <User size={20} />}
        </div>
        <div className="flex-1 min-w-0">
          <p style={{ color: theme.text }} className="font-bold text-[15px] truncate">{userProfile?.name || "Mon profil"}</p>
          <p style={{ color: theme.textMuted }} className="text-[12px] truncate">{userProfile?.goal ? (GOALS.find((g) => g.id === userProfile.goal)?.label || "") : "Renseigne tes infos personnelles"}</p>
        </div>
        <ChevronRight size={16} color={theme.textFaint} className="shrink-0" />
      </Card>
    </button>
  );
}
