FROM node:24-slim AS build
WORKDIR /app

COPY package.json package-lock.json tsconfig.base.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json

RUN npm ci --workspace @shengyu/web --include-workspace-root

COPY apps/web apps/web
RUN npm run build -w @shengyu/web

FROM node:24-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=8080
ENV API_ORIGIN=http://api:3001

COPY --from=build /app/apps/web/dist apps/web/dist
COPY apps/web/server.mjs apps/web/server.mjs

USER node
EXPOSE 8080
CMD ["node", "apps/web/server.mjs"]