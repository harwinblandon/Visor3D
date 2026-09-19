import { useViewerStore, TOUR_LEG_DURATION_SECONDS } from "../state/viewerStore";
import { useIsMobile } from "../hooks/useIsMobile";
import { theme } from "../styles/theme";

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

const iconButtonStyle: React.CSSProperties = {
  border: "none",
  background: "transparent",
  color: theme.color.text,
  cursor: "pointer",
  fontSize: 16,
  lineHeight: 1,
  padding: "6px",
  flexShrink: 0,
};

export function TourPlayerBar() {
  const tourStops = useViewerStore((s) => s.tourStops);
  const tourStatus = useViewerStore((s) => s.tourStatus);
  const tourTime = useViewerStore((s) => s.tourTime);
  const startTour = useViewerStore((s) => s.startTour);
  const pauseTour = useViewerStore((s) => s.pauseTour);
  const resumeTour = useViewerStore((s) => s.resumeTour);
  const stopTour = useViewerStore((s) => s.stopTour);
  const seekTour = useViewerStore((s) => s.seekTour);
  const isMobile = useIsMobile();

  if (tourStops.length === 0) return null;

  const totalDuration = Math.max(tourStops.length - 1, 0) * TOUR_LEG_DURATION_SECONDS;
  const clampedTime = Math.min(tourTime, totalDuration);

  const handlePlayPause = () => {
    if (tourStatus === "playing") pauseTour();
    else if (tourStatus === "paused") resumeTour();
    else startTour();
  };

  return (
    <div
      style={{
        position: "fixed",
        bottom: isMobile ? 8 : 16,
        right: isMobile ? 8 : 16,
        maxWidth: "calc(100vw - 16px)",
        zIndex: 20,
        display: "flex",
        alignItems: "center",
        gap: isMobile ? 4 : 8,
        padding: isMobile ? "6px 8px" : "8px 12px",
        background: theme.color.panel,
        border: `1px solid ${theme.color.border}`,
        borderRadius: theme.radius,
        fontFamily: theme.font,
        boxShadow: "0 4px 16px rgba(0,0,0,0.4)",
      }}
    >
      <button type="button" onClick={handlePlayPause} title={tourStatus === "playing" ? "Pausar" : "Reproducir"} style={iconButtonStyle}>
        {tourStatus === "playing" ? "⏸" : "▶"}
      </button>
      <button
        type="button"
        onClick={stopTour}
        disabled={tourStatus === "idle"}
        title="Detener"
        style={{ ...iconButtonStyle, color: tourStatus === "idle" ? theme.color.border : theme.color.text }}
      >
        ⏹
      </button>
      <input
        type="range"
        min={0}
        max={totalDuration}
        step={0.05}
        value={clampedTime}
        onChange={(e) => seekTour(Number(e.target.value))}
        disabled={totalDuration === 0}
        style={{ width: isMobile ? 80 : 140, accentColor: theme.color.accent }}
      />
      <span
        style={{
          color: theme.color.textMuted,
          fontSize: 11,
          minWidth: isMobile ? 56 : 68,
          textAlign: "right",
          whiteSpace: "nowrap",
          flexShrink: 0,
        }}
      >
        {formatTime(clampedTime)} / {formatTime(totalDuration)}
      </span>
    </div>
  );
}
