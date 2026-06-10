const router = require('express').Router();
const c = require('../controllers/notificationController');
const { auth, requireRole } = require('../middleware/auth');
const wrap = require('../utils/asyncWrapper');

router.get('/',           auth, requireRole('admin'), wrap(c.list));
router.patch('/read-all', auth, requireRole('admin'), wrap(c.readAll));

module.exports = router;
