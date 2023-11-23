FROM node:20-alpine

WORKDIR /app

COPY . .

RUN npm install

EXPOSE 9090

RUN npx tsc

CMD [ "node", "index.js" ]

