FROM node:22-bookworm-slim AS deps

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 make g++ ca-certificates \
    && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-bookworm-slim AS builder

WORKDIR /app

ENV NEXT_TELEMETRY_DISABLED=1
ARG NEXT_PUBLIC_BASE_URL=https://yuzbilgisayar.stativera.store
ENV NEXT_PUBLIC_BASE_URL=${NEXT_PUBLIC_BASE_URL}

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npm run build
RUN npm prune --omit=dev

FROM node:22-bookworm-slim AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ARG NEXT_PUBLIC_BASE_URL=https://yuzbilgisayar.stativera.store
ENV NEXT_PUBLIC_BASE_URL=${NEXT_PUBLIC_BASE_URL}

COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/package-lock.json ./package-lock.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public

RUN mkdir -p /app/data /app/public/uploads

EXPOSE 3000

CMD ["npm", "run", "start"]
