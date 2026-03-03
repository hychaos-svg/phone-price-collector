FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY src ./src
COPY public ./public

RUN mkdir -p /app/data

ENV PORT=3000
ENV HOST=0.0.0.0
ENV STORAGE_TYPE=local

EXPOSE 3000

CMD ["node", "src/index.js"]
