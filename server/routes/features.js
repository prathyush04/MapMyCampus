const express = require('express');
const router = express.Router();
const controller = require('../controllers/featureController');
const { auth, requireRole } = require('../middleware/auth');
const wrap = require('../utils/asyncWrapper');

router.post('/', auth, wrap(controller.create));
router.get('/', auth, requireRole('admin'), wrap(controller.list));
router.put('/:id/status', auth, requireRole('admin'), wrap(controller.updateStatus));

module.exports = router;
