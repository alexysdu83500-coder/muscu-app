export function Card({ theme, children, className = "", style = {}, onClick }) {
  return (
    <div
      onClick={onClick}
      className={`rounded-3xl ${className}`}
      style={{ background: theme.card, border: `1px solid ${theme.border}`, ...style }}
    >
      {children}
    </div>
  );
}

export function Pill({ theme, children, active, onClick, style = {} }) {
  return (
    <button
      onClick={onClick}
      className="px-4 py-2 rounded-full text-[13px] font-semibold whitespace-nowrap transition-all active:scale-95"
      style={{
        background: active ? theme.text : theme.card2,
        color: active ? theme.bg : theme.textMuted,
        border: `1px solid ${active ? "transparent" : theme.border}`,
        ...style,
      }}
    >
      {children}
    </button>
  );
}

export function IconButton({ theme, children, onClick, style = {}, className = "" }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center justify-center rounded-full active:scale-90 transition-transform ${className}`}
      style={{ width: 38, height: 38, background: theme.card2, color: theme.text, border: `1px solid ${theme.border}`, ...style }}
    >
      {children}
    </button>
  );
}

export function BigButton({ theme, children, onClick, gradient, style = {}, disabled }) {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className="w-full rounded-2xl py-4 font-bold text-[16px] active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
      style={{
        background: gradient ? `linear-gradient(135deg, ${theme.accent}, ${theme.accent2})` : theme.card2,
        color: gradient ? "#fff" : theme.text,
        opacity: disabled ? 0.4 : 1,
        boxShadow: gradient ? `0 8px 24px -8px ${theme.accent}88` : "none",
        border: gradient ? "none" : `1px solid ${theme.border}`,
        ...style,
      }}
    >
      {children}
    </button>
  );
}
