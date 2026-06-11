const router = require('express').Router();
const PerfumeController = require('../controllers/PerfumeController');
const { authenticate } = require('../middlewares/authMiddleware');

// Rota GET pública - qualquer um pode listar perfumes
router.get('/', PerfumeController.index);

// Rotas protegidas (apenas usuários autenticados)
router.post('/', authenticate, PerfumeController.store);
router.put('/:id', authenticate, PerfumeController.update);
router.delete('/:id', authenticate, PerfumeController.delete);

module.exports = router; 