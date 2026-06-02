# Stage 1: Build stage
FROM node:20-alpine AS build

WORKDIR /app

# Copia os arquivos de definição de dependências
COPY package*.json ./

# Instala as dependências de forma limpa e rápida
RUN npm ci

# Copia o restante dos arquivos do projeto frontend
COPY . .

# Argumento de build para definir a URL da API
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

# Executa o build de produção
RUN npm run build

# Stage 2: Production stage using Nginx
FROM nginx:1.25-alpine AS production

# Copia a configuração customizada do Nginx para suportar roteamento SPA
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copia os arquivos estáticos compilados do estágio anterior
COPY --from=build /app/dist /usr/share/nginx/html

# Expõe a porta padrão do servidor web
EXPOSE 80

# Inicia o Nginx em primeiro plano (foreground)
CMD ["nginx", "-g", "daemon off;"]
