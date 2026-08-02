FROM node:22

ENV NODE_ENV=production

RUN apt-get update && apt-get install -y --no-install-recommends dumb-init

WORKDIR /home/node/app

COPY --chown=node:node package*.json ./

RUN npm install

COPY --chown=node:node . .

RUN npx prisma generate

RUN npm run build

EXPOSE 4001

ENTRYPOINT [ "dumb-init", "--" ]

CMD [ "node", "dist/src/main.js" ]