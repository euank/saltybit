FROM node

COPY package.json app.js LICENSE ./
RUN npm install
CMD ["node", "app.js"]
