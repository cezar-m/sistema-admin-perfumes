const db = require('../config/database');

class VendaController {
	async store(req, res) {
		try {
			
			// Bloqueia o cliente de fazer vendas somente o admin e o funcionários podem fazer a venda
			if(req.usuarioCargo !== "admin" && req.usuarioCargo !== "funcionario") {
				return res.status(403).json({ error: 'Apenas funcionários ou administradores podem registrar vendas' });
			}
			
			const { perfume_id, quantidade, cliente_nome, cliente_telefone, forma_pagamento, quantidade_parcelas = 1 } = req.body;
			const formaPagamento = forma_pagamento || req.body.forma_pagamento || null;
			const vendedor_id = req.usuarioId;
			
			if (!formaPagamento) {
				return res.status(400).json({ error: 'Forma de pagamento é obrigatória (pix, cartão, dinheiro)' });
			}
			
			if (quantidade_parcelas > 1 && formaPagamento !== 'cartao_credito') {
				return res.status(400).json({ error: 'Parcelamento apenas para cartão de crédito' });
			}
			
			if(!perfume_id || !quantidade) {
				return res.status(400).json({ error: 'Perfume e quantidade são obrigatórios' });
			}
			
			// Buscar perfume 
			let perfumeRows;
			try {
				perfumeRows = await db.query('SELECT * FROM perfumes WHERE id = $1', [perfume_id]);
			} catch (err) {
				console.error('Erro na consulta do perfume:', err);
				return res.status(500).json({ error: 'Erro ao buscar perfume' });
			}
			const perfume = Array.isArray(perfumeRows) && perfumeRows[0] && Array.isArray(perfumeRows[0])
				? perfumeRows[0][0]
				: perfumeRows[0];
				
			if(!perfume) return res.status(404).json({ error: 'Perfume não encontrado' });
			if(perfume.quantidade < quantidade) return res.status(400).json({ error: 'Estoque insuficiente' });
			
			const total = parseFloat(perfume.preco) * quantidade;
			
			// Atualiza o estoque
			await db.query('UPDATE perfumes SET quantidade = quantidade - $1 WHERE id = $2', [quantidade, perfume_id]);
			
			// Insere a venda com status_pagamento e quantidade_parcelas
			const insertResult = await db.query(
				`INSERT INTO vendas
					(perfume_id, quantidade, total, cliente_nome, cliente_telefone, vendedor_id, forma_pagamento, data_venda, status_pagamento, quantidade_parcelas)
					VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), $8, $9)`,
					[perfume_id, quantidade, total, cliente_nome || null, cliente_telefone || null, vendedor_id, formaPagamento, 'pendente', quantidade_parcelas]
			);
			
			let newId = null;
			if(insertResult && insertResult.insertId) newId = insertResult.insertId;
			else if(Array.isArray(insertResult) && insertResult[0] && insertResult[0].insertId) newId = insertResult[0].insertId;
			else if(insertResult && insertResult[0]) newId = insertResult[0];
			
			// Se for parcelado, gerar paracelas
			if(quantidade_parcelas > 1) {
				const valorParcela = total / quantidade_parcelas;
				const hoje = new Date();
				for(let i = 1; i <= quantidade_parcelas; i++) {
					const dataVencimento = new Date(hoje)
					dataVencimento.setMonth(hoje.getMonth() + i);
					await db.query(
						`INSERT INTO parcelas (venda_id, numero_parcela, valor, data_vencimento, status)
						VALUES ($1, $2, $3, $4, 'pendente')`,
						[newId, i, valorParcela, dataVencimento.toISOString().slice(0, 10)]
					);
				}
			}
			
			res.status(201).json({ id: newId, total, message: 'Venda registrada com sucesso' });
		} catch (error) {
			console.error('Erro ao registrar venda:', error);
			res.status(500).json({ error: 'Erro interno: ' + error.message });
		}
	}
	
	async index(req, res) {
		try {
			const usuarioId = req.usuarioId;
			const usuarioCargo = req.usuarioCargo;
			let vendasData;
			
			if(usuarioCargo === 'admin') {
				// Admin vê toas as vendas
				vendasData = await db.query(`
					SELECT s.id, s.quantidade, s.total, s.cliente_nome, s.forma_pagamento, s.data_venda, s.status_pagamento, s.quantidade_parcelas,
						   p.nome as perfume_nome, u.nome as vendedor_nome
					FROM vendas s
					JOIN perfumes p ON s.perfume_id = p.id
					JOIN usuarios u ON s.vendedor_id = u.id
					ORDER BY s.data_venda DESC
				`);
			} else {
				// Funcionário ou usuário comum vê apenas as vendas que ele mesmo fez
				vendasData = await db.query(`
					SELECT s.id, s.quantidade, s.total, s.cliente_nome, s.forma_pagamento, s.data_venda, s.status_pagamento, s.quantidade_parcelas,
						   p.nome as perfume_nome, u.nome as vendedor_nome
					FROM vendas s
					JOIN perfumes p ON s.perfume_id = p.id
					JOIN usuarios u ON s.vendedor_id = u.id
					WHERE s.vendedor_id = $1
					ORDER BY s.data_venda DESC
				`, [usuarioId]);
			}
			
			let vendas = vendasData;
			if(Array.isArray(vendasData) && vendasData.length > 0 && Array.isArray(vendasData[0])) {
				vendas = vendasData[0]
			}
			res.json(vendas || []);
		} catch (error) {
			console.error('Erro ao listar vendas:', error);
			res.status(500).json([]);
		}
	}
	
	async updateStatus(req, res) {
		try {
			const { id } = req.params;
			const { status_pagamento } = req.body;
			const opcoes = ['pendente', 'pago', 'cancelado'];
			if(!opcoes.includes(status_pagamento)) {
				return res.status(400).json({ error: 'Status inválido' });
			}
			await db.query('UPDATE vendas SET status_pagamento = $1 WHERE id = $2', [status_pagamento, id]);
			res.json({ message: 'Status atualizado com sucesso' });
		} catch (error) {
			console.error(error);
			res.status(500).json({ error: error.message });
		}
	}
	
	// Buscar parcelas de uma venda
	async getParcelas(req, res) {
		try {
			const { id } = req.params;
			const result = await db.query('SELECT * FROM parcelas WHERE venda_id = $1 ORDER BY numero_parcela', [id]);
			res.json(result.rows);
		} catch (error) {
			console.error('Erro ao buscar parcelas:', error);
			res.status(500).json({ error: error.message });
		}
	}
	
	// Atualizar status de uma parcela individual
	async updateParcelaStatus(req, res) {
		try {
			const { id } = req.params;
			const { status } = req.body;
			const opcoes = ['pendente', 'pago', 'cancelado'];
			if(!opcoes.includes(status)) {
				return res.status(400).json({ error: 'Status inválido' });
			}
			await db.query('UPDATE parcelas SET status = $1 WHERE id = $2', [status, id]);
			res.json({ message: 'Status da parcela atualizado' });
		} catch (error) {
			console.error('Erro ao atualizar parcela:', error);
			res.status(500).json({ error: error.message });
		}
	}
}

module.exports = new VendaController();
