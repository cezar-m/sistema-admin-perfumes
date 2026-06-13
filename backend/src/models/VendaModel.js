const db = require('../config/database');

class VendaModel {
	async findAll(filters = {}) {
		let query = `
			SELECT s.*, p.nome as perfume_nome
			FROM vendas s
			JOIN perfumes p ON s.perfume_id = p.id
		`;
		const params = [];
		if(filters.vendedor_id) {
			query += ` WHERE s.vendedor_id = $2`;
			params.push(filters.vendedor_id);
		}
		query += ` ORDER BY s.data_venda DESC`;
		const rows = await db.query(query, params);
		return rows;
	}
	
	async findById(id, vendedor_id = null) {
		let query = `
			SELECT s.*, p.nome as perfume_nome
			FROM vendas s
			JOIN perfumes p ON s.perfume_id = p.id
			WHERE s.id = $1
		`;
		const params  = [id];
		if(vendedor_id) {
			query += ` AND s.vendedor_id = $1`;
			params.push(vendedor_id);
		}
		const rows = await db.query(query, params);

		return rows[0];
	}
	
	async create(data) {
		const { perfume_id, quantidade, total, cliente_nome, cliente_telefone, vendedor_id, forma_pagamento, status_pagamento } = data;
		const result = await db.query(
			`INSERT INTO vendas
			 (perfume_id, quantidade, total, cliente_nome, cliente_telefone, vendedor_id, forma_pagamento, data_venda, status_pagamento)
			 VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), $8)`,
			 [perfume_id, quantidade, total, cliente_nome, cliente_telefone, vendedor_id, forma_pagamento, status_pagamento || 'pendente']
		);
		return result.insertId;
	}
	
	async getDashboardStats(vendedor_id = null) {
		let query = `
			SELECT
				COUNT(*) as total_vendas,
				COALESCE(SUM(total), 0) as total_faturado,
				COALESCE(AVG(total), 0) as ticket_medio,
				COUNT(DISTINCT DATE(data_venda)) as dias_com_venda
				FROM vendas
		`;
		const params = [];
		if(vendedor_id) {
			query += ` WHERE vendedor_id = $1`;
			params.push(vendedor_id);
		}
		const result = await db.query(query, params);
		return result.rows[0];
	}
}

module.exports = new VendaModel();
