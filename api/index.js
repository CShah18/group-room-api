const app = require('../src/app');

// Importing sequelize and redis ensures they are initialized per request
require('../src/models');          // sequelize
require('../src/redisClient');     // redis singleton

module.exports = app;
