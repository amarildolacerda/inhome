# Backend — Node/Express API (FR-029: port 3001)
# sql.js is pure WASM (AD-001): no native build tools required on alpine.
FROM node:22-alpine

WORKDIR /app

# Install production dependencies only (devDeps: supertest, socket.io-client).
COPY package*.json ./
RUN npm ci --omit=dev

# Application source (tests included; they need devDeps to run — see docs/docker.md).
COPY src ./src

# Path roots (AD-002 storage, AD-005 uploads). Defaults in code resolve relative
# to __dirname and land outside /app in the container — pin them explicitly.
ENV NODE_ENV=production \
    DATA_DIR=/app/data \
    UPLOAD_DIR=/app/uploads

RUN mkdir -p /app/data /app/uploads

EXPOSE 3001

CMD ["npm", "start"]
