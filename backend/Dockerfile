# Stage 1: Build stage
FROM node:20-alpine AS build

WORKDIR /app

# Pula o download do Chromium do Puppeteer no build para acelerar e economizar espaço
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true

# Copia os arquivos de definição de dependências
COPY package*.json ./

# Instala todas as dependências (incluindo as de desenvolvimento para a transpilação TS)
RUN npm ci

# Copia o esquema do Prisma para gerar as tipagens e o cliente do banco de dados
COPY prisma ./prisma/

# Gera o Prisma Client
RUN npx prisma generate

# Copia o restante dos arquivos do projeto
COPY . .

# Compila o TypeScript para JavaScript nativo (gerando a pasta dist/)
RUN npm run build

# Stage 2: Production stage
FROM node:20-alpine AS production

WORKDIR /app

# Define a variável de ambiente para produção
ENV NODE_ENV=production

# Instala o Chromium e fontes necessárias para renderização perfeita do PDF no Alpine
RUN apk add --no-cache \
      chromium \
      nss \
      freetype \
      harfbuzz \
      ca-certificates \
      ttf-freefont

# Configura o Puppeteer para usar o Chromium instalado do sistema
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# Copia as definições de dependências
COPY package*.json ./

# Instala apenas as dependências necessárias para a execução em produção
RUN npm ci --only=production && npm cache clean --force

# Copia a pasta do Prisma para permitir geração do client e execução de migrações em produção
COPY prisma ./prisma/

# Gera o Prisma Client para o ambiente de produção
RUN npx prisma generate

# Copia o código transpilado do estágio de build
COPY --from=build /app/dist ./dist/

# Expõe a porta padrão do Fastify
EXPOSE 3333

# Comando para iniciar a aplicação diretamente com o Node (permite tratamento correto de sinais do Docker)
CMD ["node", "dist/src/server.js"]
