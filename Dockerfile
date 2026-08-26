FROM node:22-alpine

WORKDIR /app

COPY apps/backend/package.json apps/backend/package-lock.json ./apps/backend/
RUN cd apps/backend && npm ci --omit=dev

COPY . .

ENV NODE_ENV=production
EXPOSE 8080

CMD ["node", "apps/backend/src/server.js"]
