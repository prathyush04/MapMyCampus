const router = require('express').Router();
const c = require('../controllers/shortcutController');
const { auth, requireRole } = require('../middleware/auth');
const wrap = require('../utils/asyncWrapper');

router.post('/',      auth, wrap(c.create));
router.get('/mine',   auth, wrap(c.mine));
router.get('/',       auth, requireRole('admin'), wrap(c.list));
router.patch('/:id',  auth, requireRole('admin'), wrap(c.review));

module.exports = router;
