import { useEffect, useRef, useState, type ReactNode } from "react";
import { theme } from "../styles/theme";

interface DropdownProps {
  label: ReactNode;
  accentColor?: string;
  children: ReactNode;
}

export function Dropdown({ label, accentColor, children }: DropdownProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  return (
    <div ref={rootRef} style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{
          padding: "8px 16px",
          borderRadius: theme.radius,
          border: `1px solid ${open ? (accentColor ?? theme.color.accent) : theme.color.border}`,
          background: theme.color.panelAlt,
          color: theme.color.text,
          cursor: "pointer",
          fontSize: 13,
          fontWeight: 600,
          fontFamily: theme.font,
          whiteSpace: "nowrap",
          display: "flex",
          alignItems: "center",
          gap: 6,
        }}
      >
        {label}
        <span style={{ fontSize: 10, color: theme.color.textMuted }}>▾</span>
      </button>

      {open && (
        <div
          onClick={() => setOpen(false)}
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            right: 0,
            minWidth: 200,
            background: theme.color.panel,
            border: `1px solid ${theme.color.border}`,
            borderRadius: theme.radius,
            boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
            zIndex: 30,
            overflow: "hidden",
          }}
        >
          {children}
        </div>
      )}
    </div>
  );
}

export function DropdownItem({
  active,
  color,
  onClick,
  children,
}: {
  active?: boolean;
  color?: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        width: "100%",
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "9px 14px",
        border: "none",
        background: active ? theme.color.panelAlt : "transparent",
        color: theme.color.text,
        cursor: "pointer",
        fontSize: 13,
        fontFamily: theme.font,
        textAlign: "left",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = theme.color.panelAlt)}
      onMouseLeave={(e) => (e.currentTarget.style.background = active ? theme.color.panelAlt : "transparent")}
    >
      {color && (
        <span style={{ width: 8, height: 8, borderRadius: "50%", background: color, flexShrink: 0 }} />
      )}
      <span style={{ flex: 1 }}>{children}</span>
      {active && <span style={{ color: theme.color.accent, fontSize: 12 }}>✓</span>}
    </button>
  );
}

export function DropdownLinkItem({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a
      href={href}
      style={{
        display: "block",
        padding: "9px 14px",
        color: theme.color.text,
        cursor: "pointer",
        fontSize: 13,
        fontFamily: theme.font,
        textDecoration: "none",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = theme.color.panelAlt)}
      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
    >
      {children}
    </a>
  );
}

export function DropdownDivider() {
  return <div style={{ height: 1, background: theme.color.border }} />;
}
