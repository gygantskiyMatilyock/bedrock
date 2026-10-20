FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY index.html tsconfig.json vite.config.ts ./
COPY src ./src
COPY public ./public
RUN npm run build

FROM oven/bun:1.3
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV DB_PATH=/data/bedrock.sqlite
COPY server.ts ./server.ts
COPY --from=build /app/dist ./dist
RUN mkdir -p /data
EXPOSE 3000
CMD ["bun", "server.ts"]
