FROM node:20-alpine

WORKDIR /app

COPY . .

RUN npm install

RUN npx tsc

EXPOSE 4900

CMD [ "node", "index.js" ]

