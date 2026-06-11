const db = require('../config/database');
const bcrypt = require('bcrypt');

class UsuarioModel {
	async findAll() {
		const [rows] = await db.query('SELECT id, nome, email, cargo, ativo criado_em FROM usuarios ORDER BY criado_em DESC');
		return rows;
	}
	
	async findById(id) {
		const [rows] = await db.query('SELECT id, nome, email, cargo, ativo, FROM usuarios WHERE id = ?', [id]);
		return rows[0];
	}
	
	async findByEmail(email) {
		const [rows] = await db.query('SELECT * FROM usuarios WHERE email = ?', [email]);
		return rows[0];
	}
	
	async create(usuarioData) {
		const { nome, email, password, cargo } = usuarioData;
		const hashedPassword = await bcrypt.hash(password, 10);
		const [result] = await db.query(
			'INSERT INTO usuarios (nome, email, password, cargo, ativo) VALUES (?, ?, ?, ?, ?)',
			[nome, email, hashedPassword, cargo || 'funcionario', 1]
		);
		return result.insertId;
	}
	
	async update(id, usuarioData) {
		const { nome, email, cargo, ativo, password } = usuarioData;
		if (password) {
			const hashedPassword = await bcrypt.hash(password, 10);
			await db.query(
				'UPDATE usuarios SET nome = ?, email = ?, cargo = ?, ativo = ?, password = ? WHERE id = ?',
				[nome, email, cargo, ativo, hashedPassword, id]
			);
		} else {
			await db.query(
				'UPDATE usuarios SET nome = ?, email = ?, cargo = ?, ativo = ? WHERE id = ?',
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
			await connection.query('DELETE FROM perfumes WHERE usuario_id = ?', [id]);
			// Deleta vendas
			await connection.query('DELETE FROM vendas WHERE vendedor_id = ?', [id]);
			// Deleta usuário
			const [result] = await connection.query('DELETE FROM usuarios WHERE id = ?', [id]);
			await connection.commit();
		} catch (error) {
			await connection.rollback();
			throw error;
		} finally {
			connection.release();
		}
	}
	
	async updateResetToken(email, token, expiresAt) {
		await db.query('UPDATE usuarios SET reset_token = ?, reset_expires = ? WHERE email = ?', [token, expiresAt, email]);
	}
	
	async findByResetToken(token) {
		const [rows] = await db.query('SELECT * FROM usuarios WHERE reset_token = ? AND reset_expires > NOW()', [token]);
		return rows[0];
	}
}

module.exports = new UsuarioModel();