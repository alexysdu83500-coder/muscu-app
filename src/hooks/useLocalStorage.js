import React, { useState, useEffect, useRef, useCallback } from "react";

export function usePersistentState(key, initial) {
  const [state, setState] = useState(initial);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    (async () => {
      try {
        const res = await window.storage.get(key, false);
        if (res && res.value != null) setState(JSON.parse(res.value));
      } catch (e) { /* not found, keep initial */ }
      setLoaded(true);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  useEffect(() => {
    if (!loaded) return;
    (async () => {
      try { await window.storage.set(key, JSON.stringify(state), false); }
      catch (e) { console.error("storage set failed", key, e); }
    })();
  }, [state, loaded, key]);
  return [state, setState, loaded];
}

// Variante "debounced" : sauvegarde automatiquement à chaque changement, mais regroupe les
// écritures très rapprochées (ex: taper un poids caractère par caractère) en une seule,
// quelques centaines de ms après la dernière frappe — au lieu d'un appel réseau par
// caractère. `flushNow()` force une sauvegarde immédiate (utilisé avant fermeture de page).

export function usePersistentStateDebounced(key, initial, delayMs = 500) {
  const [state, setState] = useState(initial);
  const [loaded, setLoaded] = useState(false);
  const timerRef = useRef(null);
  const latestRef = useRef(initial);

  useEffect(() => {
    (async () => {
      try {
        const res = await window.storage.get(key, false);
        if (res && res.value != null) { const v = JSON.parse(res.value); setState(v); latestRef.current = v; }
      } catch (e) { /* rien de sauvegardé, on garde la valeur initiale */ }
      setLoaded(true);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  useEffect(() => { latestRef.current = state; }, [state]);

  const flushNow = useCallback(() => {
    if (!loaded) return;
    clearTimeout(timerRef.current);
    window.storage.set(key, JSON.stringify(latestRef.current), false).catch(() => {});
  }, [key, loaded]);

  useEffect(() => {
    if (!loaded) return;
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      window.storage.set(key, JSON.stringify(state), false).catch((e) => console.error("storage set failed", key, e));
    }, delayMs);
    return () => clearTimeout(timerRef.current);
  }, [state, loaded, key, delayMs]);

  return [state, setState, loaded, flushNow];
}

/* ============================== DEFAULT DATA ============================== */

export function usePersistentState_simple(key, initial) {
  const [state, setState] = useState(initial);
  useEffect(() => {
    (async () => {
      try {
        const res = await window.storage.get(key, false);
        if (res && res.value != null) setState(JSON.parse(res.value));
      } catch (e) {}
    })();
  }, [key]);
  const setAndSave = useCallback((v) => {
    setState((prev) => {
      const next = typeof v === "function" ? v(prev) : v;
      window.storage.set(key, JSON.stringify(next), false).catch(() => {});
      return next;
    });
  }, [key]);
  return [state, setAndSave];
}
