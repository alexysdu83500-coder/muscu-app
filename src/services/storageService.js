// `window.storage` (get/set/delete/list) est une API fournie automatiquement par
// l'environnement d'aperçu de Claude.ai — elle N'EXISTE PAS une fois le site déployé
// ailleurs (GitHub Pages, Vercel, ton propre hébergement...). Ce module ne s'active
// QUE si `window.storage` n'existe pas déjà : dans l'aperçu Claude, rien ne change ; sur
// un site déployé, il fournit une implémentation réelle basée sur `localStorage` (natif
// au navigateur, persiste réellement après un rafraîchissement de page).
//
// Importé une seule fois, pour effet de bord, depuis main.jsx — avant que quoi que ce
// soit d'autre (hooks/useLocalStorage.js notamment) n'essaie d'utiliser `window.storage`.
if (typeof window !== "undefined" && !window.storage) {
  window.storage = {
    async get(key) {
      const value = window.localStorage.getItem(key);
      if (value == null) throw new Error(`gt-storage: clé "${key}" introuvable`);
      return { key, value };
    },
    async set(key, value) {
      window.localStorage.setItem(key, value);
      return { key, value };
    },
    async delete(key) {
      window.localStorage.removeItem(key);
      return { key, deleted: true };
    },
    async list(prefix) {
      const keys = Object.keys(window.localStorage).filter((k) => !prefix || k.startsWith(prefix));
      return { keys };
    },
  };
}

// Petits wrappers exposés pour un futur usage direct depuis les services/hooks (les hooks
// actuels appellent encore `window.storage.*` directement pour rester strictement
// identiques au comportement précédent — voir le résumé du refactoring).
export const storageService = {
  get: (key) => window.storage.get(key, false),
  set: (key, value) => window.storage.set(key, value, false),
  delete: (key) => window.storage.delete(key, false),
  list: (prefix) => window.storage.list(prefix, false),
};
