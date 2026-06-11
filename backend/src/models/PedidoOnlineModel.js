const db = require('../config/database');

class PedidoOnlineModel {
	// Cliente vê seus própios pedidos (todos)
	static async listarPorCliente(clienteId) {
		const [pedidos] = await db.execute(`
			SELECT * FROM pedidos_online
			WHERE cliente_id = ?
			ORDER BY data_pedido DESC
		`, [clienteId]);
		
		if(pedidos.length === 0) return pedidos;
		
		const ids = pedidos.map(p => p.id);
		// Use db.query em vez de db.execute para IN com array
		const [itens] = await db.query(`
			SELECT ip.pedido_id,
				ip.quantidade,
				ip.preco_unitario,
				perf.nome as nome
			FROM itens_pedido_online ip
			JOIN perfumes perf ON ip.perfume_id = perf.id
			WHERE ip.pedido_id IN (?)
		`, [ids]);
		
		const itensPorPedidos = {};
		for (const item of itens) {
			if(!itensPorPedidos[item.pedido_id]) itensPorPedidos[item.pedido_id] = [];
				itensPorPedidos[item.pedido_id].push({
					nome: item.nome,
					quantidade: item.quantidade,
					preco: item.preco_unitario
				});
		}
		
		for(const pedido of pedidos) {
			pedido.itens = itensPorPedidos[pedido.id] || [];
		}
		return pedidos;	
	}
	
	// Listagem com permissão (funcionário ou admin)
	static async listarComPermissao(usuarioId, isAdmin = false) {
		let sql, params;
		
		if(isAdmin) {
			// Admin vê TODOS os pedidos + nome do aprovador
			sql = `
				SELECT po.*,
					   u.nome as cliente_nome,
					   u.email,
					   aprov.nome as aprovador_nome
				FROM pedidos_online po
				JOIN usuarios u ON po.cliente_id = u.id
				LEFT JOIN usuarios aprov ON po.aprovado_por_id = aprov.id
				ORDER BY po.data_pedido DESC
			`;
			params = [];
		} else {
			// Funcionário comum:
			// - Todos os pendetes (status = 'aguardando_aprovacao')
			// - Pedidos já processados apenas se ele foi o aprovador
			sql = `
				SELECT po.*,
					   u.nome as cliente_nome,
					   u.email,
					   NULL as aprovador_nome
				FROM pedidos_online po
				JOIN usuarios u ON po.cliente_id = u.id
				WHERE po.status = 'aguardando_aprovacao'
					OR (po.status != 'aguardando_aprovacao' AND po.aprovado_por_id = ?)
				ORDER BY po.data_pedido DESC
			`;
			params = [usuarioId];
		}
		
		const [rows] = await db.execute(sql, params);
		
		// Buscar itens para cada pedido
		for(let pedido of rows) {
			const [itens] = await db.execute(`
				SELECT ip.quantidade, ip.preco_unitario, perf.nome as perfume_nome
				FROM itens_pedido_online ip
				JOIN perfumes perf ON ip.perfume_id = perf.id
				WHERE ip.pedido_id = ?
			`, [pedido.id]);
			pedido.itens = itens;
		}
		return rows;
	} 
	
	// Criar pedido (sem alterações)
	static async criar(pedido) {
		const { cliente_id, total, forma_pagamento, dados_transacao, endereco_entrega, itens } = pedido;
		const connection = await db.getConnection();
		
		const enderecoFinal = endereco_entrega 
		? (typeof endereco_entrega === 'string' ? endereco_entrega : JSON.stringify(endereco_entrega))
		: null;
		
		try {
			await connection.beginTransaction();
			const [result] = await connection.execute(
				`INSERT INTO pedidos_online (cliente_id, total, forma_pagamento, endereco_entrega, dados_transacao, status)
				 VALUES (?, ?, ?, ?, ?, 'aguardando_aprovacao')`,
				 [cliente_id, total, forma_pagamento, enderecoFinal, JSON.stringify(dados_transacao)]
			);
			
			const pedidoId = result.insertId;
			for(const item of itens) {
				await connection.execute(
					`INSERT INTO itens_pedido_online (pedido_id, perfume_id, quantidade, preco_unitario)
					 VALUES (?, ?, ?, ?)`,
					 [pedidoId, item.perfume_id, item.quantidade, item.preco_unitario]
				);
			} 
			await connection.commit();
			return pedidoId;
		} catch (error) {
			await connection.rollback();
			throw error;
		} finally {
			connection.release();
		}
	}
	
	// Aprovar pedido - salva quem aprovou
	static async aprovar(pedidoId, aprovadoPorId) {
		const connection = await db.getConnection();
		try {
			await connection.beginTransaction();
			const [pedido] = await connection.execute(
				'SELECT status FROM pedidos_online WHERE id = ?',
				 [pedidoId]
			);
			if(pedido.length === 0) throw new Error('Pedido não encontrado');
			if(pedido[0].status !== 'aguardando_aprovacao') throw new Error('Pedido já processado');
			
			const [itens] = await connection.execute(
				'SELECT perfume_id, quantidade FROM itens_pedido_online WHERE pedido_id = ?',
				[pedidoId]
			);
			
			for(const item of itens) {
				const [update] = await connection.execute(
					'UPDATE perfumes SET quantidade = quantidade - ?  WHERE id = ? AND quantidade >= ?',
					[item.quantidade, item.perfume_id, item.quantidade]
				);
				if(update.affectedRows === 0) {
					throw new Error(`Estoque insuficiente para o perfume ID ${item.perfume_id}`);
				}
			}
			
			// Atualiza status e registra o aprovador
			await connection.execute(
				'UPDATE pedidos_online SET status = "aprovado", aprovado_por_id = ? WHERE id = ?',
				[aprovadoPorId, pedidoId]
			);
			
			await connection.commit();
			console.log(`Pedido ${pedidoId} aprovado por usuário ${aprovadoPorId}`);
			return true;
		} catch(error) {
			await connection.rollback();
			throw error;
		} finally {
			connection.release();
		}
	}
}

module.exports  = PedidoOnlineModel;