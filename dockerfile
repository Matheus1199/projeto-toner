# ==============================
# BarsottiStock - Dockerfile
# Build otimizado para produção
# ==============================

# Imagem base
FROM node:20-alpine

# Diretório da aplicação
WORKDIR /usr/src/app

# Copia apenas arquivos de dependências para aproveitar cache
COPY package*.json ./

# Instala dependências somente de produção
RUN npm ci --only=production

# Copia o restante do projeto
COPY . .

# Define o ambiente como produção
ENV NODE_ENV=production

# Porta interna da aplicação
EXPOSE 3000

# Comando de inicialização
CMD ["node", "server.js"]
