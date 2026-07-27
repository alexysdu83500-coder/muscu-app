import React, { useState } from "react";
import {
  Moon, Sun, User,
} from "lucide-react";
import { EditSessionScreen } from "./EditSessionScreen";
import { HistoryList } from "./HistoryList";
import { MyProfileView } from "./MyProfileView";
import { NutritionScreen } from "./NutritionScreen";
import { ProfileMenu } from "./ProfileMenu";
import { SessionDetail } from "./SessionDetail";
import { SettingsPage } from "./SettingsPage";
import { WeightPage } from "./WeightPage";
import { ProgramEditor } from "../exercises/ProgramEditor";
import { ProgramsList } from "../exercises/ProgramsList";
import { ProgressPage } from "../statistics/ProgressPage";
import { RecordsPage } from "../statistics/RecordsPage";
import { StatsPage } from "../statistics/StatsPage";
import { IconBadge, SubPageHeader } from "../ui/Feedback";
import { programFromSession } from "../../services/workoutService";

export function ProfileHub({
  theme, isDark, setIsDark, programs, setPrograms, sessions, setSessions,
  weightEntries, setWeightEntries, settings, setSettings, onStartProgram, onExport, onImport,
  userProfile, setUserProfile, onResetData,
  nutritionProfile, setNutritionProfile, caloriesLog, setCaloriesLog, nutritionAdjustments, setNutritionAdjustments,
}) {
  const [view, setView] = useState(null); // null = menu racine
  const [programId, setProgramId] = useState(null);
  const [sessionId, setSessionId] = useState(null);

  if (!view) {
    return (
      <div>
        <div className="flex items-center justify-between px-5 pt-4 pb-2">
          <div className="flex items-center gap-2.5">
            <IconBadge theme={theme} icon={User} size={34} iconSize={16} filled />
            <h1 style={{ color: theme.text }} className="text-[26px] font-extrabold tracking-tight">Profil</h1>
          </div>
          <button onClick={() => setIsDark((d) => !d)} className="active:scale-90 transition-transform rounded-full flex items-center justify-center" style={{ width: 38, height: 38, background: theme.card2, border: `1px solid ${theme.border}` }}>
            {isDark ? <Sun size={17} color={theme.text} /> : <Moon size={17} color={theme.text} />}
          </button>
        </div>
        <ProfileMenu theme={theme} userProfile={userProfile} onSelect={setView} onOpenProfile={() => setView("myprofile")} />
      </div>
    );
  }

  if (view === "myprofile") {
    return (
      <div>
        <SubPageHeader theme={theme} title="Mon profil" onBack={() => setView(null)} />
        <MyProfileView
          theme={theme} userProfile={userProfile} setUserProfile={setUserProfile}
          sessions={sessions} weightEntries={weightEntries} programs={programs}
        />
      </div>
    );
  }

  if (view === "programs") {
    return (
      <div>
        <SubPageHeader theme={theme} title="Mes programmes" onBack={() => setView(null)} />
        <ProgramsList
          theme={theme} programs={programs} setPrograms={setPrograms}
          onOpen={(id) => { setProgramId(id); setView("programEditor"); }}
          onStart={onStartProgram}
        />
      </div>
    );
  }

  if (view === "programEditor") {
    return (
      <ProgramEditor
        theme={theme} program={programs.find((p) => p.id === programId)}
        setPrograms={setPrograms} onBack={() => setView("programs")} onStart={onStartProgram}
      />
    );
  }

  if (view === "history") {
    return (
      <div>
        <SubPageHeader theme={theme} title="Historique séances" onBack={() => setView(null)} />
        <HistoryList
          theme={theme} sessions={sessions}
          onOpen={(id) => { setSessionId(id); setView("sessionDetail"); }}
          onEdit={(id) => { setSessionId(id); setView("sessionEdit"); }}
        />
      </div>
    );
  }

  if (view === "sessionDetail") {
    return (
      <SessionDetail
        theme={theme} session={sessions.find((s) => s.id === sessionId)}
        onBack={() => setView("history")}
        onDelete={(id) => { setSessions((s) => s.filter((x) => x.id !== id)); setView("history"); }}
        onDuplicate={(session) => onStartProgram(programFromSession(session))}
        onEdit={(id) => { setSessionId(id); setView("sessionEdit"); }}
      />
    );
  }

  if (view === "sessionEdit") {
    const session = sessions.find((s) => s.id === sessionId);
    if (!session) { setView("history"); return null; }
    return (
      <EditSessionScreen
        theme={theme} session={session}
        onCancel={() => setView("sessionDetail")}
        onSave={(updated) => {
          // Ne remplace QUE la séance modifiée — le tableau `sessions` garde toutes les
          // autres inchangées. Records, progression et statistiques se recalculent tout
          // seuls au rendu suivant puisqu'ils lisent toujours `sessions` directement.
          setSessions((all) => all.map((s) => (s.id === updated.id ? updated : s)));
          setView("sessionDetail");
        }}
      />
    );
  }

  if (view === "weight") {
    return (
      <div>
        <SubPageHeader theme={theme} title="Évolution du poids" onBack={() => setView(null)} />
        <WeightPage theme={theme} entries={weightEntries} setEntries={setWeightEntries} settings={settings} setSettings={setSettings} />
      </div>
    );
  }

  if (view === "nutrition") {
    return (
      <div>
        <SubPageHeader theme={theme} title="Objectifs nutritionnels" onBack={() => setView(null)} />
        <NutritionScreen
          theme={theme} weightEntries={weightEntries} sessions={sessions}
          nutritionProfile={nutritionProfile} setNutritionProfile={setNutritionProfile}
          caloriesLog={caloriesLog} setCaloriesLog={setCaloriesLog}
          nutritionAdjustments={nutritionAdjustments} setNutritionAdjustments={setNutritionAdjustments}
        />
      </div>
    );
  }

  if (view === "stats") {
    return (
      <div>
        <SubPageHeader theme={theme} title="Statistiques détaillées" onBack={() => setView(null)} />
        <StatsPage theme={theme} sessions={sessions} programs={programs} onExport={onExport} onImport={onImport} />
      </div>
    );
  }

  if (view === "progress") {
    return (
      <div>
        <SubPageHeader theme={theme} title="Progression" onBack={() => setView(null)} />
        <ProgressPage theme={theme} sessions={sessions} programs={programs} />
      </div>
    );
  }

  if (view === "records") {
    return (
      <div>
        <SubPageHeader theme={theme} title="Records" onBack={() => setView(null)} />
        <RecordsPage theme={theme} sessions={sessions} />
      </div>
    );
  }

  if (view === "settings") {
    return (
      <div>
        <SubPageHeader theme={theme} title="Paramètres" onBack={() => setView(null)} />
        <SettingsPage theme={theme} isDark={isDark} setIsDark={setIsDark} settings={settings} setSettings={setSettings} onResetData={onResetData} />
      </div>
    );
  }

  return null;
}

// --- "Records" : tous les records personnels, triés par charge --------------------------
