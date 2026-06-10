const router = require('express').Router();
const c = require('../controllers/authController');
const { auth } = require('../middleware/auth');
const wrap = require('../utils/asyncWrapper');

router.post('/send-otp', wrap(c.sendOtp));
router.post('/register', wrap(c.register));
router.post('/login',    wrap(c.login));
router.post('/refresh',  wrap(c.refresh));
router.post('/logout',   auth, wrap(c.logout));

module.exports = router;
