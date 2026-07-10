FROM node:20-slim AS build
WORKDIR /app
COPY apps/web/package.json apps/web/package-lock.json* ./
RUN npm install
COPY apps/web .
RUN npm run build

FROM nginx:1.27-alpine
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 8080
RUN sed -i 's/listen\s*80;/listen 8080;/' /etc/nginx/conf.d/default.conf
CMD ["nginx", "-g", "daemon off;"]
