FROM node:22-alpine AS build
WORKDIR /app
COPY apps/bot/package.json ./apps/bot/package.json
RUN npm install --prefix apps/bot
COPY apps/bot ./apps/bot
RUN npm run build --prefix apps/bot
FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/apps/bot/node_modules ./node_modules
COPY --from=build /app/apps/bot/dist ./dist
CMD ["node","dist/index.js"]
