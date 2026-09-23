import { AdminUnlockMenu } from "./Toolbar";
import { theme } from "../styles/theme";

interface ModelUnavailableProps {
  isAdmin: boolean;
  onUnlock: (password: string) => Promise<boolean>;
  title?: string;
  message?: string;
}

export function ModelUnavailable({
  isAdmin,
  onUnlock,
  title = "Modelo no disponible",
  message = "Este enlace no existe o el modelo no está disponible en este momento. Verifica el enlace o contacta a quien te lo compartió.",
}: ModelUnavailableProps) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 14,
        width: "100vw",
        height: "100vh",
        fontFamily: theme.font,
        background: theme.color.bg,
        padding: 24,
        boxSizing: "border-box",
        textAlign: "center",
      }}
    >
      <img src="/logo.png" alt="Logo" style={{ height: 72, width: "auto" }} />
      <h2 style={{ color: theme.color.text, margin: 0, fontSize: 16, fontWeight: 600 }}>{title}</h2>
      <p style={{ color: theme.color.textMuted, fontSize: 13, maxWidth: 340, margin: 0 }}>{message}</p>
      {!isAdmin && (
        <div style={{ marginTop: 8 }}>
          <AdminUnlockMenu onUnlock={onUnlock} />
        </div>
      )}
    </div>
  );
}
