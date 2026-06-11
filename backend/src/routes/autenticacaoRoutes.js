const router = require('express').Router();
const AutenticacaoController = require('../controllers/AutenticacaoController');
router.post('/login', AutenticacaoController.login);
router.post('/registro', AutenticacaoController.registro);
router.post('/esqueci-senha-admin', AutenticacaoController.esqueciSenha);
router.post('/resetar-senha-admin', AutenticacaoController.resetarSenha);

router.post('/cliente/registrar', AutenticacaoController.registrarCliente); 
router.post('/cliente/login', AutenticacaoController.login); // login genérico
router.post('/cliente/esqueci-senha', AutenticacaoController.esqueciSenha);
router.post('/cliente/resetar-senha', AutenticacaoController.resetarSenha);

module.exports = router;