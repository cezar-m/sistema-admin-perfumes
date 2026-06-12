const db = require('../config/database');
const bcrypt = require('bcrypt');

class UsuarioModel {
	async findAll() {
		const result  = await db.query('SELECT id, nome, email, cargo, ativo criado_em FROM usuarios ORDER BY criado_em DESC');
		return result.rows;
	}
	
	async findById(id) {
		const result  = await db.query('SELECT id, nome, email, cargo, ativo, FROM usuarios WHERE id = $1', [id]);
		return result.rows[0];
	}
	
	async findByEmail(email) {
		const result  = await db.query('SELECT * FROM usuarios WHERE email = $1', [email]);
		return result.rows[0];
	}
	
	async create(usuarioData) {
		const { nome, email, password, cargo } = usuarioData;
		const hashedPassword = await bcrypt.hash(password, 10);
		const [result] = await db.query(
			'INSERT INTO usuarios (nome, email, password, cargo, ativo) VALUES ($1, $2, $3, $4, $5)',
			[nome, email, hashedPassword, cargo || 'funcionario', 1]
		);
		return result.insertId;
	}
	
	async update(id, usuarioData) {
		const { nome, email, cargo, ativo, password } = usuarioData;
		if (password) {
			const hashedPassword = await bcrypt.hash(password, 10);
			await db.query(
				'UPDATE usuarios SET nome = $1, email = $2, cargo = $3, ativo = $4, password = $5 WHERE id = $6',
				[nome, email, cargo, ativo, hashedPassword, id]
			);
		} else {
			await db.query(
				'UPDATE usuarios SET nome = $1, email = $2, cargo = $3, ativo = $4 WHERE id = $5',
				[nome, email, cargo, ativo, id]
			);
		}
		return true;
	}
	
	// Exclusão física com remoção de dependências (perfumes e vendas)
	async deleteWithDependencies(id) {
		const connection = await db.getConnection(); // se db não tiver getConnection, veja nota abaixo
		try {
			await connection.beginTransaction();
			
			// Deleta perfumes
			await connection.query('DELETE FROM perfumes WHERE usuario_id = $1', [id]);
			// Deleta vendas
			await connection.query('DELETE FROM vendas WHERE vendedor_id = $1', [id]);
			// Deleta usuário
			const [result] = await connection.query('DELETE FROM usuarios WHERE id = $1', [id]);
			await connection.commit();
		} catch (error) {
			await connection.rollback();
			throw error;
		} finally {
			connection.release();
		}
	}
	
	async updateResetToken(email, token, expiresAt) {
		await db.query('UPDATE usuarios SET reset_token = $1, reset_expires = $1 WHERE email = $1', [token, expiresAt, email]);
	}
	
	async findByResetToken(token) {
		const result  = await db.query('SELECT * FROM usuarios WHERE reset_token = $1 AND reset_expires > NOW()', [token]);
		return result.rows[0];
	}
}

module.exports = new UsuarioModel();
