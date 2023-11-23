FROM node:20-alpine

WORKDIR /app

COPY package*.json ./

# RUN npm install

COPY . .

EXPOSE 4900
# compile ts files and then run index.js
RUN npx tsc
CMD [ "node", "index.js" ]

