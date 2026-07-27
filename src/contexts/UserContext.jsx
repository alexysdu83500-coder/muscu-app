import React, { createContext, useContext } from "react";
import { usePersistentState } from "../hooks/useLocalStorage";

const UserContext = createContext(null);

const DEFAULT_PROFILE = { name: "", age: null, height: null, goal: "", level: "" };

// Ne gère QUE l'état global (profil local à l'appareil) — aucune logique de rendu.
// Actuellement peuplé au niveau App.jsx et transmis en props aux composants (comme
// avant le refactoring) ; les composants pourront migrer vers `useUser()` progressivement
// sans risque, puisque la source de vérité (ce provider) ne change pas.
export function UserProvider({ children }) {
  const [userProfile, setUserProfile, userProfileLoaded] = usePersistentState("gt_profile_v1", DEFAULT_PROFILE);
  return (
    <UserContext.Provider value={{ userProfile, setUserProfile, userProfileLoaded }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error("useUser doit être utilisé à l'intérieur de <UserProvider>");
  return ctx;
}
