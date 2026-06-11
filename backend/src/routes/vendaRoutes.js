const router = require('express').Router();
const VendaController = require('../controllers/VendaController');
const { authenticate } = require('../middlewares/authMiddleware');

router.use(authenticate);

router.post('/', VendaController.store);
router.get('/', VendaController.index);
router.patch('/:id/status', VendaController.updateStatus);
router.get('/:id/parcelas', VendaController.getParcelas);
router.patch('/parcelas/:id/status', VendaController.updateParcelaStatus);


module.exports = router;