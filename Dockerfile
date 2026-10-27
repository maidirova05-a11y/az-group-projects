# AZ Group на своём сервере (вне Vercel): сайт + API + своя база — compose.yaml,
# как развернуть — docs/SERVER.md.

ARG NODE_VERSION=22

FROM node:${NODE_VERSION}-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
RUN npm run build && npm run build:server \
 && cp -r server/db/migrations dist-server/server/db-migrations

FROM node:${NODE_VERSION}-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production \
    PORT=3000 \
    MIGRATIONS_DIR=/app/dist-server/server/db-migrations
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund && npm cache clean --force
COPY vercel.json ./
COPY --from=build /app/dist ./dist
COPY --from=build /app/dist-server ./dist-server
USER node
EXPOSE 3000
HEALTHCHECK --interval=10s --timeout=5s --start-period=20s --retries=5 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1),()=>process.exit(1))"
CMD ["node", "dist-server/server/node.mjs"]
