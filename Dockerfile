FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

RUN npx vite build
RUN npx esbuild server.ts --bundle --platform=node --format=cjs --outfile=dist/server.cjs --external:better-sqlite3

RUN npm prune --production

EXPOSE 3000

ENV NODE_ENV=production

CMD ["node", "dist/server.cjs"]