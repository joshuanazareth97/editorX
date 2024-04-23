# Stage 1: Build UI
FROM node:18 as build
WORKDIR /app
COPY client/package.json client/yarn.lock ./
RUN yarn install
COPY client/ .
RUN yarn build

# Stage 2: Serve UI and API Routes
FROM node:18
WORKDIR /app
COPY --from=build /app/build ./client/build
COPY ./server/package.json ./server/yarn.lock ./
RUN yarn install --production
COPY server/ .
EXPOSE 5000
CMD [ "node", "." ]