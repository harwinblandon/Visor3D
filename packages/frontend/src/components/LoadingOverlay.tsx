import { useProgress } from "@react-three/drei";
import { theme } from "../styles/theme";

export function LoadingOverlay() {
  const { active, progress } = useProgress();
  if (!active) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 12,
        background: theme.color.bg,
        zIndex: 30,
        fontFamily: theme.font,
      }}
    >
      <img src="/logo.png" alt="Logo" style={{ height: 96, opacity: 0.9 }} />
      <div
        style={{
          width: 220,
          height: 4,
          borderRadius: 2,
          background: theme.color.panelAlt,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${progress}%`,
            background: theme.color.accent,
            transition: "width 0.15s",
          }}
        />
      </div>
      <span style={{ color: theme.color.textMuted, fontSize: 13 }}>Cargando modelo... {progress.toFixed(0)}%</span>
    </div>
  );
}
