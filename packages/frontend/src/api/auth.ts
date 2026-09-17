const STORAGE_KEY = "visor3d_admin_key";

export function getStoredAdminKey(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setStoredAdminKey(key: string | null) {
  try {
    if (key) localStorage.setItem(STORAGE_KEY, key);
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    // localStorage no disponible (modo privado, etc.) — el desbloqueo no persiste entre recargas.
  }
}

export async function verifyAdminKey(password: string): Promise<boolean> {
  const res = await fetch("/api/auth/verify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password }),
  });
  if (!res.ok) return false;
  const data = await res.json();
  return data.valid === true;
}
