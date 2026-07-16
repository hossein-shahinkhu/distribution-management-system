FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
# توجه: sequelize-cli در devDependencies است ولی چون migration ها هنگام
# استارت کانتینر (نه در زمان build) اجرا می‌شوند، باید در ایمیج نهایی هم موجود باشد.
RUN npm ci

COPY . .

RUN chmod +x docker-entrypoint.sh

ENV NODE_ENV=production
EXPOSE 5000

ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["node", "src/index.js"]
