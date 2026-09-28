# Imagen unica: backend (Express) + frontend (build estatico de Vite) + migraciones.
# Pensada para plataformas gestionadas tipo Railway/Render (un solo servicio web).

FROM node:20-alpine AS builder
WORKDIR /app

# python3/make/g++: requeridos por node-gyp para compilar el binding nativo de
# better-sqlite3 (no hay binario prebuild para linux-musl en esta version).
RUN apk add --no-cache python3 make g++

COPY package.json package-lock.json ./
COPY packages/shared/package.json packages/shared/package.json
COPY packages/backend/package.json packages/backend/package.json
COPY packages/frontend/package.json packages/frontend/package.json
RUN npm ci

COPY packages/shared packages/shared
COPY packages/backend packages/backend
COPY packages/frontend packages/frontend

RUN npm run build --workspace=@h-geovisor/shared
RUN npm run build --workspace=backend
RUN cp -r packages/backend/src/db/migrations packages/backend/dist/db/migrations
RUN npm run build --workspace=frontend

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV FRONTEND_DIST_PATH=/app/packages/frontend/dist

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/packages/shared ./packages/shared
COPY --from=builder /app/packages/backend/dist ./packages/backend/dist
COPY --from=builder /app/packages/backend/package.json ./packages/backend/package.json
# better-sqlite3 no queda hoisted a la raiz en este workspace (npm lo deja anidado
# aqui), asi que hay que copiarlo aparte o el runtime no lo encuentra.
COPY --from=builder /app/packages/backend/node_modules ./packages/backend/node_modules
COPY --from=builder /app/packages/frontend/dist ./packages/frontend/dist

RUN mkdir -p /app/packages/backend/uploads/models /app/packages/backend/uploads/photos /app/packages/backend/uploads/orthophotos

EXPOSE 4000
CMD ["sh", "-c", "node packages/backend/dist/db/migrate.js && node packages/backend/dist/server.js"]
