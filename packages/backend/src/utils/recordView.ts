import type { Request } from "express";
import * as pageViewsService from "../services/pageViews.service.js";
import { isValidAdminKey } from "../middleware/auth.js";
import type { ViewSubjectType } from "../services/pageViews.service.js";

/**
 * Registra una visita a un modelo/ortofoto público (para el panel de estadísticas de uso del
 * admin). Se salta cuando la propia clave de admin está presente (el dueño revisando su
 * contenido no cuenta como "visita"), y nunca deja que un fallo de este registro rompa la
 * respuesta real al cliente -- es de mejor esfuerzo, no crítico.
 */
export function maybeRecordView(req: Request, subjectType: ViewSubjectType, subjectId: string): void {
  if (isValidAdminKey(req.header("x-admin-key"))) return;
  pageViewsService
    .recordView(subjectType, subjectId, req.ip ?? null, req.header("user-agent") ?? null)
    .catch((err) => console.error("No se pudo registrar la visita:", err));
}
