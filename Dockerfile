# ---------- Tahap 1: build frontend ----------
FROM node:22-bookworm-slim AS frontend-build
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# ---------- Tahap 2: dependency backend (better-sqlite3 butuh toolchain bila tidak ada prebuilt) ----------
FROM node:22-bookworm-slim AS backend-deps
WORKDIR /app/backend
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ \
    && rm -rf /var/lib/apt/lists/*
COPY backend/package*.json backend/.npmrc ./
RUN npm ci --omit=dev

# ---------- Tahap 3: image runtime ----------
FROM node:22-bookworm-slim
ENV NODE_ENV=production \
    PORT=4000 \
    DB_PATH=/data/rental.db \
    SERVE_FRONTEND=true \
    FRONTEND_DIST=/app/frontend/dist \
    AUTO_SEED=true
WORKDIR /app/backend
COPY --from=backend-deps /app/backend/node_modules ./node_modules
COPY backend/package.json ./
COPY backend/src ./src
COPY backend/scripts ./scripts
COPY --from=frontend-build /app/frontend/dist /app/frontend/dist
RUN mkdir -p /data && chown -R node:node /data /app
USER node
VOLUME ["/data"]
EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://localhost:'+process.env.PORT+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "src/server.js"]
