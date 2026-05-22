FROM mcr.microsoft.com/playwright:v1.59.1-noble

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

ENV PORT=3001
ENV POOL_SIZE=4

EXPOSE 3001

CMD ["node", "index.js"]
