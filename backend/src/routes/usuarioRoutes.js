const router = require('express').Router();
const UsuarioController = require('../controllers/UsuarioController');
const { authenticate, isAdmin } = require('../middlewares/authMiddleware');

router.use(authenticate, isAdmin); // apenas admin

router.get('/:id', UsuarioController.index);
router.get('/', UsuarioController.index);
router.put('/:id', UsuarioController.update);
router.delete('/:id', UsuarioController.delete);

module.exports = router;
