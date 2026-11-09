FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* ./
COPY apps/web/package.json apps/web/
COPY apps/bot/package.json apps/bot/
COPY packages/db/package.json packages/db/
COPY packages/core/package.json packages/core/
COPY packages/telegram/package.json packages/telegram/
COPY packages/invoice-pdf/package.json packages/invoice-pdf/
RUN pnpm install --frozen-lockfile || pnpm install

FROM base AS runner
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/web/node_modules ./apps/web/node_modules
COPY . .
WORKDIR /app
ENV NODE_ENV=production
EXPOSE 3000
CMD ["pnpm", "--filter", "@eth/web", "dev"]
