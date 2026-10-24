FROM mcr.microsoft.com/playwright:v1.64.1-jammy

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

ENTRYPOINT ["npx", "playwright", "test"]
