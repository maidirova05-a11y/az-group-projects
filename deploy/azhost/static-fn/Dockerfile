# Образ для сайтов «статика + функции api/» (раньше Vercel): см. server.js. Собирается из каталога проекта,
# куда azhost копирует этот файл и server.js в .azhost/. Своих зависимостей у функций нет (только Node).
ARG NODE_VERSION=22
FROM node:${NODE_VERSION}-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production PORT=3000 ROOT=/app
COPY --chown=node:node . /app
COPY --chown=node:node .azhost/server.cjs /azhost/server.cjs
USER node
EXPOSE 3000
HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=5 \
  CMD node -e "fetch('http://127.0.0.1:3000/__health').then(r=>process.exit(r.ok?0:1),()=>process.exit(1))"
CMD ["node", "/azhost/server.cjs"]
