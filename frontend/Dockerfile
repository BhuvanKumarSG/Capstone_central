# Build stage
FROM node:18 AS build

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm install
COPY . .
RUN npm run build

# Serve stage
FROM nginx:alpine

# Copy build files
COPY --from=build /app/build /usr/share/nginx/html

# Expose frontend port
EXPOSE 3000

# Run Nginx
CMD ["nginx", "-g", "daemon off;"]
