FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./

RUN npm ci --legacy-peer-deps

COPY . .

# Accept build-time environment variables from Coolify/Docker
ARG VITE_API_URL
ARG VITE_API_BASE_URL
ARG VITE_APP_NAME
ARG VITE_APP_VERSION

# Use provided build argument if given, otherwise fallback to staging backend
ENV VITE_API_URL=${VITE_API_URL:-https://staging-api.finonest.org/api}
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL:-https://staging-api.finonest.org}
ENV VITE_APP_NAME=${VITE_APP_NAME:-"Finonest Admin Portal"}
ENV VITE_APP_VERSION=${VITE_APP_VERSION:-1.0.0}

RUN npm run build

FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html

COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 3000

CMD ["nginx", "-g", "daemon off;"]
