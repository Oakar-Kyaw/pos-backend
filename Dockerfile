# ---------- Build stage ----------
FROM node:22 AS builder

WORKDIR /home/node/app

COPY package*.json ./
# Install ALL deps (including devDependencies like @nestjs/cli, prisma)
RUN npm install

COPY . .

RUN npx prisma generate
RUN npm run build

# ---------- Production stage ----------
FROM node:22

ENV NODE_ENV=production

RUN apt-get update && apt-get install -y --no-install-recommends dumb-init \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /home/node/app

COPY --chown=node:node package*.json ./
# Now NODE_ENV=production is safe here — build is already done, we only need runtime deps
RUN npm install --omit=dev

# Bring in compiled output + the generated Prisma client (npm install alone won't regenerate it)
COPY --chown=node:node --from=builder /home/node/app/dist ./dist
COPY --chown=node:node --from=builder /home/node/app/node_modules/.prisma ./node_modules/.prisma
COPY --chown=node:node --from=builder /home/node/app/prisma ./prisma

EXPOSE 4001

USER node

ENTRYPOINT [ "dumb-init", "--" ]

CMD [ "node", "dist/src/main.js" ]