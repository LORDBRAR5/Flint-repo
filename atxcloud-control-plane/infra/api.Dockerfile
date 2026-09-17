FROM node:22-alpine AS build
WORKDIR /app
COPY apps/api/package.json ./apps/api/package.json
RUN npm install --prefix apps/api
COPY apps/api ./apps/api
RUN npm run build --prefix apps/api
FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/apps/api/node_modules ./node_modules
COPY --from=build /app/apps/api/dist ./dist
CMD ["node","dist/index.js"]
