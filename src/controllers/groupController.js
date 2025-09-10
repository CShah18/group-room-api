const { Group, Participant, sequelize } = require('../models');
const redis = require('../redisClient');

const DEFAULT_EXPIRY_MINUTES = parseInt(process.env.DEFAULT_EXPIRY_MINUTES || '30', 10);

function countKey(id) { return `group:${id}:count`; }
function maxKey(id) { return `group:${id}:max`; }

// Atomic Lua script:
// returns:
//  -2 -> count key missing
//  -1 -> already full
//  >0 -> new count after increment
const JOIN_LUA = `
if redis.call('exists', KEYS[1]) == 0 then return -2 end
local current = tonumber(redis.call('get', KEYS[1]) or '0')
local max = tonumber(redis.call('get', KEYS[2]) or '-1')
if current >= max then return -1 end
return redis.call('incr', KEYS[1])
`;

async function ensureRedisKeysForGroup(group) {
  const cKey = countKey(group.id);
  const mKey = maxKey(group.id);
  const exists = await redis.exists(cKey);
  if (exists) return { existed: true };

  // If keys missing: check if group is still active in DB (not expired and not complete)
  const now = Date.now();
  if (group.expiresAt.getTime() <= now || group.isExpired || group.isComplete) {
    // treat as expired/closed
    return { existed: false, expiredOrClosed: true };
  }

  // rehydrate keys with remaining TTL
  const ttl = Math.max(1, Math.floor((group.expiresAt.getTime() - now)/1000));
  // set count to group's current participantsCount and max
  await redis.set(cKey, String(group.participantsCount || 0), { EX: ttl });
  await redis.set(mKey, String(group.maxParticipants), { EX: ttl });
  return { existed: false, expiredOrClosed: false, ttl };
}

exports.createGroup = async (req, res, next) => {
  try {
    const maxParticipants = parseInt(req.body.maxParticipants, 10);
    const expiryMinutes = req.body.expiryMinutes ? parseInt(req.body.expiryMinutes,10) : DEFAULT_EXPIRY_MINUTES;
    const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000);

    const newGroup = await Group.create({
      maxParticipants,
      expiresAt
    });

    // Initialize Redis keys with TTL
    const ttlSeconds = Math.max(1, Math.floor((expiresAt.getTime() - Date.now()) / 1000));
    await redis.set(countKey(newGroup.id), '0', { EX: ttlSeconds });
    await redis.set(maxKey(newGroup.id), String(maxParticipants), { EX: ttlSeconds });

    return res.status(201).json({ id: newGroup.id, maxParticipants, expiresAt });
  } catch (err) {
    next(err);
  }
};

exports.joinGroup = async (req, res, next) => {
  const groupId = req.params.id;
  const userId = req.body.userId;

  try {
    const group = await Group.findByPk(groupId);
    if (!group) return res.status(404).json({ error: 'Group not found' });

    // Ensure redis keys exist (rehydrate if needed). If expired or closed, respond 410/409.
    const ensure = await ensureRedisKeysForGroup(group);
    if (ensure.expiredOrClosed) {
      // mark expired in DB if time passed
      if (!group.isExpired && group.expiresAt.getTime() <= Date.now()) {
        group.isExpired = true;
        await group.save();
      }
      return res.status(410).json({ error: 'Group expired or closed' });
    }

    // Prevent duplicate join quickly (DB check)
    const already = await Participant.findOne({ where: { groupId, userId }});
    if (already) return res.status(409).json({ error: 'User already joined' });

    const cKey = countKey(groupId);
    const mKey = maxKey(groupId);

    // Run atomic script
    const raw = await redis.eval(JOIN_LUA, { keys: [cKey, mKey], arguments: [] });
    const result = Number(raw);

    if (result === -1) {
      return res.status(409).json({ error: 'Group is full' });
    }
    if (result === -2) {
      // keys missing even after rehydration -> treat as expired
      // mark expired in DB
      group.isExpired = true;
      await group.save();
      return res.status(410).json({ error: 'Group expired' });
    }

    // Insert into DB transactionally and update group
    const t = await sequelize.transaction();
    try {
      await Participant.create({ groupId, userId }, { transaction: t });
      // update participantsCount and maybe mark complete
      const newCount = result;
      const updates = { participantsCount: newCount };
      if (newCount >= group.maxParticipants) {
        updates.isComplete = true;
        updates.completedAt = new Date();
      }
      await Group.update(updates, { where: { id: groupId }, transaction: t });
      await t.commit();
      return res.status(200).json({ groupId, participantsCount: newCount, isComplete: updates.isComplete || false });
    } catch (err) {
      await t.rollback();
      // Compensate Redis increment because DB insertion failed
      try { await redis.decr(cKey); } catch (er) { console.error('Failed to decr after DB error', er); }
      if (err.name && err.name.includes('SequelizeUniqueConstraintError')) {
        return res.status(409).json({ error: 'User already joined (concurrent)' });
      }
      throw err;
    }

  } catch (err) {
    next(err);
  }
};

exports.getGroup = async (req, res, next) => {
  try {
    const group = await Group.findByPk(req.params.id);
    if (!group) return res.status(404).json({ error: 'Group not found' });

    // If Redis keys are missing, try rehydrate or mark expired
    const ensure = await ensureRedisKeysForGroup(group);
    if (ensure.expiredOrClosed) {
      if (!group.isExpired && group.expiresAt.getTime() <= Date.now()) {
        group.isExpired = true;
        await group.save();
      }
      return res.json({
        id: group.id,
        participantsCount: group.participantsCount,
        maxParticipants: group.maxParticipants,
        isComplete: group.isComplete,
        isExpired: true,
        expiresAt: group.expiresAt,
        timeLeftSeconds: 0
      });
    }

    // Get live count from Redis (single source for active groups)
    const liveCountRaw = await redis.get(countKey(group.id));
    const liveCount = Number(liveCountRaw || group.participantsCount || 0);
    const ttl = await redis.ttl(countKey(group.id)); // seconds

    return res.json({
      id: group.id,
      participantsCount: liveCount,
      maxParticipants: group.maxParticipants,
      isComplete: group.isComplete,
      isExpired: group.isExpired,
      expiresAt: group.expiresAt,
      timeLeftSeconds: ttl > 0 ? ttl : 0
    });
  } catch (err) {
    next(err);
  }
};
