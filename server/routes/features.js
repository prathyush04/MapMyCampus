const express = require('express');
const router = express.Router();
const controller = require('../controllers/featureController');
const { authOptional, requireAdmin } = require('../middleware/auth');

router.post('/', authOptional, controller.create);
router.get('/', requireAdmin, controller.list);
router.put('/:id/status', requireAdmin, controller.updateStatus);

module.exports = router;
