require('dotenv').config();
const app = require('./app');
const { sequelize } = require('./models');
const redisClient = require('./redisClient');

const PORT = process.env.PORT || 3000;

(async () => {
  try {
    // DB
    await sequelize.authenticate();
    await sequelize.sync();

    // Redis
    await redisClient.connect();

    app.listen(PORT, () => {
      console.log(`Server listening on port ${PORT}`);
      console.log(`Swagger: http://localhost:${PORT}/api-docs`);
    });
  } catch (err) {
    console.error('Startup error', err);
    process.exit(1);
  }
})();
