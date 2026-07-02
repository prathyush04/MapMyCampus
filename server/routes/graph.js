const router = require('express').Router();
const c = require('../controllers/graphController');
const { auth, requireRole } = require('../middleware/auth');
const wrap = require('../utils/asyncWrapper');
const { cache } = require('../utils/cache');

router.get('/',            wrap(c.getGraph));
router.get('/flush-cache', wrap(async (req, res) => {
    await cache.flushall();
    res.json({ message: 'Cache flushed successfully' });
}));
router.get('/route',       wrap(c.getRoute));
router.post('/edges',      auth, requireRole('admin'), wrap(c.addEdge));
router.delete('/edges/:id',auth, requireRole('admin'), wrap(c.deleteEdge));
router.post('/nodes',      auth, requireRole('admin'), wrap(c.addNode));
router.patch('/nodes/:id', auth, requireRole('admin'), wrap(c.updateNode));
router.delete('/nodes/:id',auth, requireRole('admin'), wrap(c.deleteNode));

module.exports = router;
