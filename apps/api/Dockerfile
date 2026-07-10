FROM node:20-slim AS build
WORKDIR /app
COPY apps/api/package.json apps/api/package-lock.json* ./
RUN npm install
COPY apps/api .
RUN npm run build

FROM node:20-slim
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json
EXPOSE 8080
CMD ["node", "dist/index.js"]
