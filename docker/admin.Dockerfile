FROM node:22-alpine AS build
WORKDIR /app
ARG VITE_WEB_URL=http://localhost:8081
ENV VITE_WEB_URL=${VITE_WEB_URL}

COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY apps/admin/package.json apps/admin/package.json
COPY packages/schemas/package.json packages/schemas/package.json
COPY packages/types/package.json packages/types/package.json
COPY packages/api-client/package.json packages/api-client/package.json
COPY packages/ui/package.json packages/ui/package.json
RUN npm ci

COPY apps/web apps/web
COPY apps/admin apps/admin
COPY packages/schemas packages/schemas
COPY packages/types packages/types
COPY packages/api-client packages/api-client
COPY packages/ui packages/ui
RUN npm run build --workspace @luxxie/schemas \
  && npm run build --workspace @luxxie/types \
  && npm run build --workspace @luxxie/api-client \
  && npm run build --workspace @luxxie/admin

FROM nginx:alpine AS runtime
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/admin/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
