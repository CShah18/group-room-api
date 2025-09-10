const swaggerJSDoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: { title: 'Group Room API', version: '1.0.0' }
  },
  apis: ['./src/routes/*.js']
};

module.exports = swaggerJSDoc(options);
