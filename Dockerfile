# https://hub.docker.com/_/node/tags?page=1&name=alpine
FROM node:20.18-bookworm
WORKDIR /app
COPY package*.json config.json ./
# https://docs.npmjs.com/cli/v9/commands/npm-install#synopsis
RUN npm i --save-prod
COPY --chown=node:node . ./
USER node
CMD ["node", "app.js"]
