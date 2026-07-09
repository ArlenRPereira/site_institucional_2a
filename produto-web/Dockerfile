# syntax=docker/dockerfile:1

# Dockerfile do produto-web (Next.js 15) para deploy no EasyPanel.
# Build context = pasta produto-web (definir "Build Path = /produto-web" no EasyPanel).
# Requer output: "standalone" no next.config.ts.

# ---- deps: instala todas as dependências (inclui devDeps, necessárias no build) ----
FROM node:20-alpine AS deps
RUN corepack enable
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# ---- build: compila o Next em modo standalone ----
FROM node:20-alpine AS build
RUN corepack enable
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# NEXT_PUBLIC_* é embutido no bundle em tempo de build — deve chegar como build arg.
# No EasyPanel: Build > Build Args > NEXT_PUBLIC_APP_URL=https://seu-dominio
ARG NEXT_PUBLIC_APP_URL=http://localhost:3000
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL
ENV NEXT_TELEMETRY_DISABLED=1

RUN pnpm build

# ---- runner: imagem final mínima, apenas o servidor standalone ----
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Executa como usuário não-root
RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

# .next/standalone já traz server.js + node_modules mínimos necessários em runtime.
COPY --from=build --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=build --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=build --chown=nextjs:nodejs /app/public ./public

USER nextjs
EXPOSE 3000

CMD ["node", "server.js"]
