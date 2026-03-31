# Стейдж 1: Збірка проєкту
FROM node:22-alpine as builder

WORKDIR /app
COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Стейдж 2: Caddy сервер
FROM caddy:2.8-alpine

# Копіюємо конфіг Caddy
COPY Caddyfile /etc/caddy/Caddyfile

# Копіюємо зібраний білд Vite з першого стейджу
COPY --from=builder /app/dist /usr/share/caddy

EXPOSE 80

CMD ["caddy", "run", "--config", "/etc/caddy/Caddyfile", "--adapter", "caddyfile"]