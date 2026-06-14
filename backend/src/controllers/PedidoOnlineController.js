const db = require('../config/database');
const PedidoOnlineModel = require('../models/PedidoOnlineModel');

class PedidoOnlineController {
    async criarPedido(req, res) {
        const cliente_id = req.usuarioId;
        const { itens, total, forma_pagamento, dados_transacao, endereco_entrega } = req.body;

        if (!itens || !itens.length) {
            return res.status(400).json({ erro: 'Carrinho vazio' });
        }
        try {
            const pedidoId = await PedidoOnlineModel.criar({
                cliente_id, total, forma_pagamento, dados_transacao, endereco_entrega, itens
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

    async listarMeusPedidos(req, res) {
        const cliente_id = req.usuarioId;
        try {
            const pedidos = await PedidoOnlineModel.listarPorCliente(cliente_id);
            res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
            res.json(pedidos);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async listarTodosPedidos(req, res) {
        const usuarioId = req.usuarioId;
        // Pega o cargo direto do token (se o middleware já tiver colocado)
        const isAdmin = req.usuarioCargo === 'admin';

        try {
            const pedidos = await PedidoOnlineModel.listarComPermissao(usuarioId, isAdmin);
            res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
            res.json(pedidos);
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: error.message });
        }
    }

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
