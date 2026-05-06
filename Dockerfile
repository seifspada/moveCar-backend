FROM node:22.20.0-slim

RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

WORKDIR /usr/src/app

COPY package.json package-lock.json ./
RUN npm install --legacy-peer-deps

COPY prisma ./prisma
COPY . .

RUN npx prisma generate
RUN npm run build

ENV PORT=10000

EXPOSE 10000

CMD ["sh", "-c", "node dist/main.js & npx prisma migrate deploy && wait"]