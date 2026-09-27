# Frontend — Flutter Web built inside the Flutter SDK image (no local SDK),
# served by nginx.
# Stage 1: build
FROM ghcr.io/cirruslabs/flutter:stable AS build

WORKDIR /app

# Resolve dependencies first so source-only changes reuse the cache layer.
COPY pubspec.yaml ./
RUN flutter pub get

COPY . .
RUN flutter build web --release

# Stage 2: static serve on port 80
FROM nginx:alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/build/web /usr/share/nginx/html

EXPOSE 80
