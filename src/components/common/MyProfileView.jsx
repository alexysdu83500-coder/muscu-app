import {
  User,
} from "lucide-react";
import { Card, Pill } from "../ui/Card";
import { LabeledInput } from "../ui/Inputs";
import { GOALS, LEVELS } from "../../utils/constants";
import { fmtWeight } from "../../utils/formatters";

export function MyProfileView({ theme, userProfile, setUserProfile, sessions, weightEntries, programs }) {
  const update = (patch) => setUserProfile((p) => ({ ...p, ...patch }));
  const totalTonnage = sessions.reduce((a, s) => a + (s.tonnage || 0), 0);
  const lastWeight = weightEntries.length ? [...weightEntries].sort((a, b) => b.date.localeCompare(a.date))[0] : null;
  const last30 = sessions.filter((s) => Date.now() - s.startedAt < 30 * 86400000).length;
  const initials = (userProfile.name || "").split(" ").map((w) => w[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();

  return (
    <div className="px-4 pt-2 space-y-4">
      <Card theme={theme} className="p-5 flex items-center gap-4">
        <div className="rounded-full flex items-center justify-center shrink-0 text-white font-extrabold" style={{ width: 60, height: 60, background: `linear-gradient(135deg, ${theme.accent}, ${theme.accent2})`, fontSize: 20 }}>
          {initials || <User size={22} />}
        </div>
        <div className="min-w-0">
          <p style={{ color: theme.text }} className="text-[18px] font-extrabold truncate">{userProfile.name || "Mon profil"}</p>
          <p style={{ color: theme.textMuted }} className="text-[12.5px]">Profil enregistré sur cet appareil</p>
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-2.5">
        <Card theme={theme} className="p-3.5"><p style={{ color: theme.textMuted }} className="text-[11px] font-semibold mb-1">Séances (30j)</p><p style={{ color: theme.text }} className="text-[19px] font-extrabold">{last30}</p></Card>
        <Card theme={theme} className="p-3.5"><p style={{ color: theme.textMuted }} className="text-[11px] font-semibold mb-1">Tonnage total</p><p style={{ color: theme.text }} className="text-[19px] font-extrabold">{Math.round(totalTonnage / 1000)}t</p></Card>
        <Card theme={theme} className="p-3.5"><p style={{ color: theme.textMuted }} className="text-[11px] font-semibold mb-1">Poids actuel</p><p style={{ color: theme.text }} className="text-[19px] font-extrabold">{lastWeight ? `${fmtWeight(lastWeight.weight)}kg` : "—"}</p></Card>
        <Card theme={theme} className="p-3.5"><p style={{ color: theme.textMuted }} className="text-[11px] font-semibold mb-1">Programmes</p><p style={{ color: theme.text }} className="text-[19px] font-extrabold">{programs.length}</p></Card>
      </div>

      <Card theme={theme} className="p-4 space-y-3">
        <p style={{ color: theme.text }} className="font-bold text-[14px]">Informations personnelles</p>
        <LabeledInput theme={theme} label="Nom / pseudo" value={userProfile.name} onChange={(v) => update({ name: v })} placeholder="Ex : Alex" />
        <div className="grid grid-cols-2 gap-2.5">
          <LabeledInput theme={theme} label="Âge" value={userProfile.age ?? ""} onChange={(v) => update({ age: v ? Number(v) : null })} placeholder="optionnel" />
          <LabeledInput theme={theme} label="Taille (cm)" value={userProfile.height ?? ""} onChange={(v) => update({ height: v ? Number(v) : null })} placeholder="optionnel" />
        </div>
      </Card>

      <Card theme={theme} className="p-4">
        <p style={{ color: theme.text }} className="font-bold text-[14px] mb-2.5">Objectif sportif</p>
        <div className="flex flex-wrap gap-2 mb-4">
          {GOALS.map((g) => <Pill key={g.id} theme={theme} active={userProfile.goal === g.id} onClick={() => update({ goal: g.id })}>{g.label}</Pill>)}
        </div>
        <p style={{ color: theme.text }} className="font-bold text-[14px] mb-2.5">Niveau d'entraînement</p>
        <div className="flex flex-wrap gap-2">
          {LEVELS.map((l) => <Pill key={l.id} theme={theme} active={userProfile.level === l.id} onClick={() => update({ level: l.id })}>{l.label}</Pill>)}
        </div>
      </Card>
    </div>
  );
}

// Réglages : ce qui n'avait pas encore de vrai réglage dans l'app (le repos par défaut
// existait déjà en state mais n'était modifiable nulle part) + rappel du thème.
