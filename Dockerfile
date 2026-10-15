FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev

COPY server.js ./

RUN mkdir -p ./public
COPY index.html admin.html styles.css app.js admin.js ./public/

RUN mkdir -p /app/data

ENV NODE_ENV=production

EXPOSE 3000

CMD ["npm", "start"]
