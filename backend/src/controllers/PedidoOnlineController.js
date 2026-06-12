const db = require('../config/database');
const PedidoOnlineModel = require('../models/PedidoOnlineModel');

class PedidoOnlineController {
	// Criar pedido (cliente)
	async criarPedido(req, res) {
		const cliente_id = req.usuarioId;
		const { itens, total, forma_pagamento, dados_transacao, endereco_entrega  } = req.body;
		
		if(!itens || !itens.length) {
			return res.status(400).json({ erro: 'Carrinho vazio' });
		}
		
		try {
			const pedidoId = await PedidoOnlineModel.criar({
				cliente_id,
				total,
				forma_pagamento,
				dados_transacao,
				endereco_entrega,
				itens
			});
			
			res.status(201).json({
				mensagem: 'Pedido realizado! Aguardando aprovação.',
				pedido_id: pedidoId,
				dados_pagamento: dados_transacao
			});
		} catch (error) {
			console.error(error);
			res.status(500).json({ erro: error.message });
		}
	}
	
	// Cliente vizualiza seu próprios pedidos (todos)
	async listarMeusPedidos(req, res) {
		const cliente_id = req.usuarioId;
		console.log('Cliente ID:', cliente_id);
		try {
			const pedidos = await PedidoOnlineModel.listarPorCliente(cliente_id);
			console.log('Pedidos encontrados:', pedidos.length);
			res.json(pedidos);
		} catch(error) {
			console.error('ERRO COMPLETO:', error);
			res.status(500).json({ error: error.message, stack: error.stack });
		}
	}

	// Listagem para funcionários/admins com regra de visibilidade + nome do aprovador para admin
	async listarTodosPedidos(req, res) {
		const usuarioId = req.usuarioId;
		
		// Verifica se o usuário é administrador (consulta no banco ou via token)
		let isAdmin = false;
		try {
			const result = await db.query('SELECT cargo FROM usuarios WHERE id = $1', [usuarioId]);
			if(rows.length && result.rows[0].cargo === 'admin') {
				isAdmin = true;
			}
		} catch (error) {
			console.error('Erro ao verificar admin:', error);
		} 
		
		try {
			const pedidos = await PedidoOnlineModel.listarComPermissao(usuarioId, isAdmin);
			res.json(pedidos);
		} catch (error) {
			console.error(error);
			res.status(500).json({ error: error.message });
		}
	}
	
	// Aprovar pedido - registra o ID do aprovador
	async aprovarPedido(req, res) {
		const pedidoId = req.params.id;
		const usuarioLogadoId = req.usuarioId;
		
		try {
			await PedidoOnlineModel.aprovar(pedidoId, usuarioLogadoId);
			res.json({ mensagem: 'Pedido aprovado, estoque atualizado e aprovador registrado.' });
		} catch (error) {
			console.error(error);
			res.status(400).json({ error: error.message });
		}
	}
}

module.exports = new PedidoOnlineController();
