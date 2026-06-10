const router = require('express').Router();
const c = require('../controllers/postController');
const { auth } = require('../middleware/auth');
const wrap = require('../utils/asyncWrapper');

router.post('/',           auth, wrap(c.create));
router.get('/:locationId', wrap(c.list));
router.delete('/:id',      auth, wrap(c.remove));

module.exports = router;
