const { Sequelize, DataTypes } = require('sequelize');
require('dotenv').config();
const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  logging: false
});

const Group = require('./group')(sequelize, DataTypes);
const Participant = require('./participant')(sequelize, DataTypes);

Group.hasMany(Participant, { foreignKey: 'groupId' });
Participant.belongsTo(Group, { foreignKey: 'groupId' });

module.exports = { sequelize, Group, Participant };
