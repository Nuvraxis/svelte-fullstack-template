# syntax=docker/dockerfile:1.7
# VaultFlow — multi-stage build for the `dashboard` SvelteKit app.
# Uses pnpm workspaces. `pnpm deploy` flattens prod deps into a clean dir.

ARG NODE_VERSION=22.20.0
ARG PNPM_VERSION=11.1.1

# ---------- 1. base: pin a matching pnpm version ----------
# We install pnpm via npm rather than corepack to sidestep the corepack
# integrity-key churn in older Node 22 images.
FROM node:${NODE_VERSION}-alpine AS base
ARG PNPM_VERSION
RUN npm install -g pnpm@${PNPM_VERSION}
WORKDIR /repo

# ---------- 2. deps: install full workspace deps (cached layer) ----------
FROM base AS deps
COPY pnpm-workspace.yaml pnpm-lock.yaml .npmrc package.json ./
COPY apps/dashboard/package.json apps/dashboard/package.json
COPY packages/config/package.json packages/config/package.json
RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile

# ---------- 3. build: compile the SvelteKit app ----------
FROM base AS build
# Bring the resolved deps tree across, then layer source on top. Copying the
# whole /repo from deps preserves the workspace symlinks pnpm created.
COPY --from=deps /repo /repo
COPY . .
RUN pnpm --filter dashboard build

# ---------- 4. deploy: prune to runtime-only files ----------
FROM base AS deploy
COPY --from=build /repo /repo
# pnpm deploy copies the dashboard package + its production deps into /out,
# producing a self-contained runtime tree with no workspace symlinks.
RUN pnpm --filter dashboard deploy --prod --legacy /out
RUN cp -r /repo/apps/dashboard/build /out/build

# ---------- 5. runner: minimal production image ----------
FROM node:${NODE_VERSION}-alpine AS runner
RUN apk add --no-cache tini \
 && addgroup -S app && adduser -S app -G app
WORKDIR /app

COPY --from=deploy --chown=app:app /out/build ./build
COPY --from=deploy --chown=app:app /out/node_modules ./node_modules
COPY --from=deploy --chown=app:app /out/package.json ./package.json

ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0
ENV BODY_SIZE_LIMIT=5M

EXPOSE 3000
USER app

# tini ensures clean SIGTERM handling so container shutdown is graceful.
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "build/index.js"]
