FROM node:24-slim AS build
WORKDIR /app

COPY package.json package-lock.json tsconfig.base.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json

RUN npm ci --workspace @shengyu/api --include-workspace-root

COPY apps/api apps/api
RUN npm run build -w @shengyu/api

FROM node:24-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json

RUN npm ci --omit=dev --workspace @shengyu/api --include-workspace-root && npm cache clean --force

COPY --from=build /app/apps/api/dist apps/api/dist
COPY apps/api/db apps/api/db
COPY apps/api/media apps/api/media

WORKDIR /app/apps/api
USER node
EXPOSE 3001
CMD ["node", "dist/server.js"]