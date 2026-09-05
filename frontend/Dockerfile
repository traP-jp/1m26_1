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

FROM nginx:1.29-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80