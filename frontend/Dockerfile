# syntax=docker/dockerfile:1

FROM node:24.17.0-bookworm AS builder

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN npm install --global pnpm@11.9.0 --no-audit --no-fund
RUN pnpm install --frozen-lockfile --reporter=append-only

COPY . .

ARG VITE_API_BASE
ARG VITE_API_MOCKING=false
ARG VITE_TRAQ_CLIENT_ID
ARG VITE_TRAQ_REDIRECT_URI
ENV VITE_API_BASE=$VITE_API_BASE \
	VITE_API_MOCKING=$VITE_API_MOCKING \
	VITE_TRAQ_CLIENT_ID=$VITE_TRAQ_CLIENT_ID \
	VITE_TRAQ_REDIRECT_URI=$VITE_TRAQ_REDIRECT_URI

RUN pnpm run build-only

FROM node:24.17.0-alpine

WORKDIR /app

COPY --from=builder /app/dist ./dist

FROM node:24.0-alpine

WORKDIR /app

COPY --from=builder /app/dist ./dist
COPY server.mjs ./server.mjs

RUN echo "=== RUNTIME DIST ===" && \
    find /app/dist -maxdepth 2 -type f -print

ENV PORT=8080
EXPOSE 8080

CMD ["node", "server.mjs"]

COPY server.mjs ./server.mjs

ENV PORT=8080
EXPOSE 8080

CMD ["node", "server.mjs"]