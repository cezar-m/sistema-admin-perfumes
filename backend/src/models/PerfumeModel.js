const db = require('../config/database');

class PerfumeModel {
	async findAll() {
		const result  = await db.query('SELECT * FROM perfumes ORDER BY criado_em DESC');
		return result.rows;
	}
	
	async findByUserId(usuario_id) {
		const result = await db.query('SELECT * FROM perfumes WHERE usuario_id = $1 ORDER BY criado_em DESC', [usuario_id]);
		return result.rows;
	}
	
	async findById(id) {
		const result = await db.query('SELECT * FROM perfumes WHERE id = $1', [id]);
		return result.rows[0];
	}
	
	async create(data) {
		const { nome, descricao, preco, quantidade, familia, genero, imagem, usuario_id } = data;
		const result = await db.query(
			`INSERT INTO perfumes (nome, descricao, preco, quantidade, familia, genero, imagem, usuario_id)
			VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
			 RETURNING id`,
			[nome, descricao, preco, quantidade, familia, genero, imagem, usuario_id]
		);
		return result.rows[0].id;
	}
	
	async update(id, data, usuario_id) {
		const { nome, descricao, preco, quantidade, familia, genero, imagem } = data;
		let query = 'UPDATE perfumes SET nome = $1, descricao = $2, preco = $3, quantidade = $4, familia = $5, genero = $6';
		const params = [nome, descricao, preco, quantidade, familia, genero];
		if(imagem) {
			query += ', imagem = $7';
			params.push(imagem);
		}
		query += ' WHERE id = $8 AND usuario_id = $9';
		params.push(id, usuario_id);
		const result = await db.query(query, params);
		return result.rowCount  > 0;
	}
	
	async delete(id, usuario_id = null) {
		let query = 'DELETE FROM perfumes WHERE id = $1';
		const params = [id];
		if(usuario_id) {
			query += ' AND usuario_id = $2';
			params.push(usuario_id);
		}
		const result = await db.query(query, params);
		return result.rowCount > 0;
	}
	
	async updateStock(id, quantidade) {
		await db.query('UPDATE perfumes SET quantidade = quantidade - $1 WHERE id = $2', [quantidade, id]);
	}
	
	async getLowStock(limite = 5) {
		const result = await db.query('SELECT * FROM perfumes WHERE quantidade <= $1 ORDER BY quantidade ASC' , [limite]);
		return result.rows;
	}
}

module.exports = new PerfumeModel();
