const router = require('express').Router();
const c = require('../controllers/locationController');
const { auth, requireRole } = require('../middleware/auth');
const wrap = require('../utils/asyncWrapper');

router.get('/search', wrap(c.search));
router.get('/',       wrap(c.list));
router.get('/:id',    wrap(c.get));
router.post('/',      auth, requireRole('admin'), wrap(c.create));
router.patch('/:id',  auth, requireRole('admin'), wrap(c.update));
router.delete('/:id', auth, requireRole('admin'), wrap(c.remove));

module.exports = router;
