export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

export const vibrate = (pattern) => {
  try { if (navigator.vibrate) navigator.vibrate(pattern); } catch (e) {}
};
