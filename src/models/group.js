module.exports = (sequelize, DataTypes) => {
  return sequelize.define('Group', {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4
    },
    maxParticipants: { type: DataTypes.INTEGER, allowNull: false },
    participantsCount: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    isComplete: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    isExpired: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    expiresAt: { type: DataTypes.DATE, allowNull: false },
    completedAt: { type: DataTypes.DATE, allowNull: true }
  }, { tableName: 'groups', timestamps: true });
};
