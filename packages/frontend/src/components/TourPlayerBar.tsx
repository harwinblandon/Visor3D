import { useViewerStore, TOUR_LEG_DURATION_SECONDS } from "../state/viewerStore";
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
  fontSize: 15,
  lineHeight: 1,
  padding: "4px 6px",
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
        bottom: 16,
        right: 16,
        zIndex: 20,
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "8px 12px",
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
        style={{ width: 140, accentColor: theme.color.accent }}
      />
      <span style={{ color: theme.color.textMuted, fontSize: 11, minWidth: 68, textAlign: "right", whiteSpace: "nowrap" }}>
        {formatTime(clampedTime)} / {formatTime(totalDuration)}
      </span>
    </div>
  );
}
