FROM node:24-alpine

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY source ./source

USER node
EXPOSE 8000
CMD ["npm", "run", "serve"]
