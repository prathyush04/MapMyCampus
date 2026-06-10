const router = require('express').Router();
const c = require('../controllers/bookmarkController');
const { auth } = require('../middleware/auth');
const wrap = require('../utils/asyncWrapper');

router.post('/:locationId', auth, wrap(c.toggle));
router.get('/',             auth, wrap(c.list));

module.exports = router;
