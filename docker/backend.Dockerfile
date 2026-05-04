# syntax=docker/dockerfile:1

FROM node:20-slim AS deps
WORKDIR /usr/src/app
RUN apt-get update && apt-get install -y openssl postgresql-client && rm -rf /var/lib/apt/lists/*
COPY backend/core/backend/package.json backend/core/backend/package-lock.json ./
RUN npm ci

FROM node:20-slim AS build
WORKDIR /usr/src/app
RUN apt-get update && apt-get install -y openssl postgresql-client && rm -rf /var/lib/apt/lists/*
COPY --from=deps /usr/src/app/node_modules ./node_modules
COPY backend/core/backend/package.json backend/core/backend/package-lock.json ./
COPY backend/core/backend/tsconfig.json backend/core/backend/tsconfig.build.json backend/core/backend/nest-cli.json ./
COPY backend/core/backend/prisma ./prisma
COPY backend/core/backend/src ./src
ENV DATABASE_URL="postgresql://user:pass@localhost:5432/erp?schema=public"
RUN npx prisma generate
RUN npm run build
RUN npx tsc prisma/seed/seed-institucional.ts --module nodenext --moduleResolution nodenext --target ES2023 --esModuleInterop --outDir /usr/src/app/seed-dist
RUN npx tsc prisma/seed/seed-patrimonio-demo.ts --module nodenext --moduleResolution nodenext --target ES2023 --esModuleInterop --outDir /usr/src/app/seed-dist

FROM node:20-slim AS runner
WORKDIR /usr/src/app
RUN apt-get update && apt-get install -y openssl postgresql-client && rm -rf /var/lib/apt/lists/*
ENV NODE_ENV=production
COPY --from=build /usr/src/app/node_modules ./node_modules
COPY --from=build /usr/src/app/package.json ./package.json
COPY --from=build /usr/src/app/dist ./dist
COPY --from=build /usr/src/app/prisma ./prisma
COPY --from=build /usr/src/app/seed-dist ./seed-dist
COPY backend/docs /workspace/docs
COPY backend/docs /workspace/backend/docs
COPY scripts /workspace/scripts
RUN addgroup --system app && adduser --system --ingroup app app
USER app
EXPOSE 3000
CMD ["npm", "run", "start:prod"]
