const PedidoOnlineModel = require('../models/PedidoOnlineModel');

class PedidoOnlineController {
async criarPedido(req, res) {
    const cliente_id = req.usuarioId;
    const { itens, total, forma_pagamento, dados_transacao, endereco_entrega } = req.body;
    if (!itens || !itens.length) return res.status(400).json({ erro: 'Carrinho vazio' });
    try {
        const pedidoId = await PedidoOnlineModel.criar({ cliente_id, total, forma_pagamento, dados_transacao, endereco_entrega, itens });
        res.status(201).json({ mensagem: 'Pedido realizado! Aguardando aprovação.', pedido_id: pedidoId });
    } catch (error) {
        res.status(500).json({ erro: error.message });
    }
}

async listarMeusPedidos(req, res) {
    try {
        const pedidos = await PedidoOnlineModel.listarPorCliente(req.usuarioId);
        res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
        res.json(pedidos);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}
async listarTodosPedidos(req, res) {
    if (!req.usuarioId) {
        return res.status(401).json({ erro: 'Não autenticado' });
    }
    const isAdmin = req.usuarioCargo === 'admin';
    try {
        const pedidos = await PedidoOnlineModel.listarComPermissao(req.usuarioId, isAdmin);
        res.set('Cache-Control', 'no-store, no-cache');
        res.json(pedidos);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

async aprovarPedido(req, res) {
    try {
        await PedidoOnlineModel.aprovar(req.params.id, req.usuarioId);
        res.json({ mensagem: 'Pedido aprovado' });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
}
}

module.exports = new PedidoOnlineController();
