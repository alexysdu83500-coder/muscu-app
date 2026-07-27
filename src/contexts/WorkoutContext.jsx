import React, { createContext, useContext, useState } from "react";
import { usePersistentStateDebounced } from "../hooks/useLocalStorage";
import { makeWorkout } from "../services/workoutService";

const WorkoutContext = createContext(null);

// Ne gère QUE l'état global "séance active ou non" — la logique détaillée d'une séance
// en cours (étapes, minuteurs, validation des séries...) vit dans hooks/useWorkout.js,
// utilisé par WorkoutSessionView une fois qu'une séance est active.
export function WorkoutProvider({ children }) {
  const [activeWorkout, setActiveWorkout, activeWorkoutLoaded, flushActiveWorkout] =
    usePersistentStateDebounced("gt_active_workout_v1", null, 400);
  const [sessionStatus, setSessionStatus] = useState(null);

  const startWorkout = (program, onStarted) => {
    setActiveWorkout(makeWorkout(program));
    onStarted?.();
  };
  const endWorkout = () => { setActiveWorkout(null); setSessionStatus(null); };

  const value = {
    activeWorkout, setActiveWorkout, activeWorkoutLoaded, flushActiveWorkout,
    sessionStatus, setSessionStatus, startWorkout, endWorkout,
  };
  return <WorkoutContext.Provider value={value}>{children}</WorkoutContext.Provider>;
}

export function useWorkoutContext() {
  const ctx = useContext(WorkoutContext);
  if (!ctx) throw new Error("useWorkoutContext doit être utilisé à l'intérieur de <WorkoutProvider>");
  return ctx;
}
