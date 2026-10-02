# --- ETAPA 1: Construcción de la SPA ---
FROM node:24-alpine AS builder

RUN npm i -g pnpm

WORKDIR /app

COPY package.json pnpm-lock.yaml* ./

RUN pnpm install --frozen-lockfile --ignore-scripts

ARG VITE_API_URL
ENV VITE_URL_API=$VITE_API_URL

COPY . .

RUN pnpm run build

# --- ETAPA 2: Servidor Web de Producción ---
FROM nginx:1.30-alpine

# Copiar la configuración personalizada de Nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copiar el build de React
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]