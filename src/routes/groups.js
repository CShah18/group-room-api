const express = require('express');
const { body, param, validationResult } = require('express-validator');
const ctrl = require('../controllers/groupController');
const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     Group:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           example: "8a6f8a8e-8a2d-4c0c-9bcb-123456789abc"
 *         maxParticipants:
 *           type: integer
 *           example: 5
 *         participantsCount:
 *           type: integer
 *           example: 2
 *         isComplete:
 *           type: boolean
 *           example: false
 *         isExpired:
 *           type: boolean
 *           example: false
 *         expiresAt:
 *           type: string
 *           format: date-time
 *           example: "2025-09-10T12:00:00.000Z"
 *         completedAt:
 *           type: string
 *           format: date-time
 *           nullable: true
 *           example: null
 *         timeLeftSeconds:
 *           type: integer
 *           example: 1700
 *
 *     CreateGroupRequest:
 *       type: object
 *       required:
 *         - maxParticipants
 *       properties:
 *         maxParticipants:
 *           type: integer
 *           example: 3
 *         expiryMinutes:
 *           type: integer
 *           description: Optional expiry in minutes
 *           example: 30
 *
 *     JoinGroupRequest:
 *       type: object
 *       required:
 *         - userId
 *       properties:
 *         userId:
 *           type: string
 *           example: "user-123"
 */

/**
 * @swagger
 * /groups:
 *   post:
 *     summary: Create a group
 *     description: Create a new group with a maximum number of participants and optional expiry.
 *     tags: [Groups]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateGroupRequest'
 *     responses:
 *       201:
 *         description: Group successfully created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Group'
 *       400:
 *         description: Invalid request body
 */
router.post('/',
  body('maxParticipants').isInt({ min: 1 }),
  body('expiryMinutes').optional().isInt({ min: 1 }),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    return ctrl.createGroup(req, res, next);
  }
);

/**
 * @swagger
 * /groups/{id}/join:
 *   post:
 *     summary: Join a group
 *     description: Add a user to a group if not full or expired.
 *     tags: [Groups]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *           format: uuid
 *         required: true
 *         description: Group ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/JoinGroupRequest'
 *     responses:
 *       200:
 *         description: Successfully joined group
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 groupId:
 *                   type: string
 *                   format: uuid
 *                   example: "8a6f8a8e-8a2d-4c0c-9bcb-123456789abc"
 *                 participantsCount:
 *                   type: integer
 *                   example: 2
 *                 isComplete:
 *                   type: boolean
 *                   example: false
 *       404:
 *         description: Group not found
 *       409:
 *         description: User already joined or group full
 *       410:
 *         description: Group expired
 */
router.post('/:id/join',
  param('id').isUUID(),
  body('userId').isString().notEmpty(),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    return ctrl.joinGroup(req, res, next);
  }
);

/**
 * @swagger
 * /groups/{id}:
 *   get:
 *     summary: Get group status
 *     description: Retrieve current group status including participant count, max participants, expiry, etc.
 *     tags: [Groups]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *           format: uuid
 *         required: true
 *         description: Group ID
 *     responses:
 *       200:
 *         description: Group status retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Group'
 *       404:
 *         description: Group not found
 */
router.get('/:id',
  param('id').isUUID(),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    return ctrl.getGroup(req, res, next);
  }
);

module.exports = router;
