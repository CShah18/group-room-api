module.exports = (sequelize, DataTypes) => {
  return sequelize.define('Participant', {
    id: {
      type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4
    },
    groupId: {
      type: DataTypes.UUID,
      allowNull: false
    },
    userId: {
      type: DataTypes.STRING, allowNull: false
    },
    joinedAt: {
      type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW
    }
  }, {
    tableName: 'participants',
    timestamps: true,
    indexes: [
      { unique: true, fields: ['groupId', 'userId'] }
    ]
  });
};
