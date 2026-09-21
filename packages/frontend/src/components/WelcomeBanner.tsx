import { useEffect, useState } from "react";
import { theme } from "../styles/theme";

const STORAGE_KEY = "visor3d_welcome_dismissed";

export function WelcomeBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(STORAGE_KEY)) setVisible(true);
    } catch {
      setVisible(true);
    }
  }, []);

  const dismiss = () => {
    setVisible(false);
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      // ignore: si localStorage no esta disponible, simplemente se repite en la siguiente visita.
    }
  };

  if (!visible) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.55)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 45,
        fontFamily: theme.font,
        padding: 16,
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          width: "min(420px, 100%)",
          maxHeight: "calc(100vh - 32px)",
          overflowY: "auto",
          background: theme.color.panel,
          border: `1px solid ${theme.color.border}`,
          borderRadius: 12,
          padding: 24,
          boxSizing: "border-box",
          boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
          display: "flex",
          flexDirection: "column",
          gap: 12,
          textAlign: "center",
        }}
      >
        <img src="/logo.png" alt="Logo" style={{ height: 56, width: "auto", alignSelf: "center" }} />
        <h3 style={{ color: theme.color.text, margin: 0, fontSize: 16, fontWeight: 600 }}>
          Bienvenido a Visor3D
        </h3>
        <p style={{ color: theme.color.textMuted, fontSize: 13, margin: 0, lineHeight: 1.5 }}>
          Visualiza modelos 3D a escala real directamente en el navegador: mide distancias y áreas,
          vectoriza elementos y registra anotaciones sobre el propio modelo. Una herramienta pensada
          para topografía, construcción, arquitectura e inspección técnica.
        </p>
        <button
          type="button"
          onClick={dismiss}
          style={{
            padding: "10px 16px",
            borderRadius: theme.radius,
            border: "none",
            background: theme.color.accent,
            color: "#0b0d10",
            cursor: "pointer",
            fontWeight: 600,
            fontSize: 13,
          }}
        >
          Entendido, comenzar
        </button>
      </div>
    </div>
  );
}
