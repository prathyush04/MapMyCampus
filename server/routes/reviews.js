const router = require('express').Router();
const c = require('../controllers/reviewController');
const { auth } = require('../middleware/auth');
const wrap = require('../utils/asyncWrapper');

router.post('/',              auth, wrap(c.create));
router.get('/:locationId',    wrap(c.list));
router.post('/:id/vote',      auth, wrap(c.vote));

module.exports = router;
