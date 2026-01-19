FROM node:22.20.0-slim

# Installer OpenSSL (requis par Prisma)
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

WORKDIR /usr/src/app

COPY package.json package-lock.json ./
RUN npm install --legacy-peer-deps

COPY prisma ./prisma
COPY . .

CMD ["sh","-c","npx prisma migrate deploy && npx prisma generate && npm run start:dev"]
