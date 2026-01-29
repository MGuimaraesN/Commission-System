# Etapa 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Copiar arquivos de dependências
COPY package*.json ./
COPY prisma ./prisma/

# Instalar dependências
RUN npm ci

# Copiar o resto do código fonte
COPY . .

# Gerar o cliente Prisma e fazer o build do TypeScript
RUN npx prisma generate
RUN npm run build

# Etapa 2: Runner (Imagem final mais leve)
FROM node:20-alpine

WORKDIR /app

# Instalar openssl para o Prisma funcionar no Alpine
RUN apk -U add --no-cache openssl

COPY package*.json ./
# Instalar apenas dependências de produção
RUN npm ci --omit=dev

# Copiar arquivos construídos da etapa anterior
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma

# Expor a porta definida no .env ou padrão
EXPOSE 3020

# Script de inicialização para rodar migrações e depois o servidor
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/server.js"]
