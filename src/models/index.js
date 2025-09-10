const { Sequelize, DataTypes } = require('sequelize');
require('dotenv').config();
const isDevelopment = process.env.NODE_ENV === 'development';
const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  logging: false,
  ...(!isDevelopment && {
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false, // use true with proper CA certs
      },
    },
  }),
});

const Group = require('./group')(sequelize, DataTypes);
const Participant = require('./participant')(sequelize, DataTypes);

Group.hasMany(Participant, { foreignKey: 'groupId' });
Participant.belongsTo(Group, { foreignKey: 'groupId' });

module.exports = { sequelize, Group, Participant };
