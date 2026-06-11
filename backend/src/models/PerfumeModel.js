const db = require('../config/database');

class PerfumeModel {
	async findAll() {
		const rows  = await db.query('SELECT * FROM perfumes ORDER BY criado_em DESC');
		return rows;
	}
	
	async findByUserId(usuario_id) {
		const rows = await db.query('SELECT * FROM perfumes WHERE usuario_id = ? ORDER BY criado_em DESC', [usuario_id]);
		return rows;
	}
	
	async findById(id) {
		const rows = await db.query('SELECT * FROM perfumes WHERE id = ?', [id]);
		return rows[0];
	}
	
	async create(data) {
		const { nome, descricao, preco, quantidade, familia, genero, imagem, usuario_id } = data;
		const result = await db.query(
			`INSERT INTO perfumes (nome, descricao, preco, quantidade, familia, genero, imagem, usuario_id)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
			[nome, descricao, preco, quantidade, familia, genero, imagem, usuario_id]
		);
		return result.insertId;
	}
	
	async update(id, data, usuario_id) {
		const { nome, descricao, preco, quantidade, familia, genero, imagem } = data;
		let query = 'UPDATE perfumes SET nome = ?, descricao = ?, preco = ?, quantidade = ?, familia = ?, genero = ?';
		const params = [nome, descricao, preco, quantidade, familia, genero];
		if(imagem) {
			query += ', imagem = ?';
			params.push(imagem);
		}
		query += ' WHERE id = ? AND usuario_id = ?';
		params.push(id, usuario_id);
		const result = await db.query(query, params);
		return result.affectedRows > 0;
	}
	
	async delete(id, usuario_id = null) {
		let query = 'DELETE FROM perfumes WHERE id = ?';
		const params = [id];
		if(usuario_id) {
			query += ' AND usuario_id = ?';
			params.push(usuario_id);
		}
		const result = await db.query(query, params);
		return result.affectedRows > 0;
	}
	
	async updateStock(id, quantidade) {
		await db.query('UPDATE perfumes SET quantidade = quantidade - ? WHERE id = ?', [quantidadeVendida, id]);
	}
	
	async getLowStock(limite = 5) {
		const rows = await db.query('SELECT * FROM perfumes WHERE quantidade <= ? ORDER BY quantidade ASC' , [limite]);
		return rows;
	}
}

module.exports = new PerfumeModel();