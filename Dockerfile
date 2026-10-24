# ---------- Tahap 1: build ----------
FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci --ignore-scripts
COPY . .
# URL backend dipakai saat build (di-embed ke bundle). Kosongkan bila /api di-proxy oleh reverse proxy yang sama.
ARG VITE_API_URL=
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

# ---------- Tahap 2: sajikan hasil build dengan nginx ----------
FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
