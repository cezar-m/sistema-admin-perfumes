const router = require('express').Router();
const PedidoController = require('../controllers/PedidoOnlineController');
const { authenticate } = require('../middlewares/authMiddleware');

// Aplica authenticate em todas as rotas
router.post('/', authenticate, PedidoController.criarPedido);
router.get('/meus-pedidos', authenticate, PedidoController.listarMeusPedidos);
router.get('/', authenticate, PedidoController.listarTodosPedidos);
router.put('/:id/aprovar', authenticate, PedidoController.aprovarPedido);

module.exports = router;
