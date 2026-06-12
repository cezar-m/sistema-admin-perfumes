const db = require('../config/database');
const bcrypt = require('bcrypt');

class UsuarioController {
	async index(req, res) {
		try {
			const [rows] = await db.query('SELECT id, nome, email, cargo, ativo FROM usuarios');
			res.json(rows);
		} catch (error) {
			console.error(error);
			res.status(500).json({ error: 'Erro ao listar' });
		}
	}
	
	async update(req, res) {
		const { id } = req.params;
		const { nome, email, cargo, ativo, password } = req.body;
		try {
			let query = 'UPDATE usuarios SET nome = $1, email = $2, cargo = $3, ativo = $4';
			const params = [nome, email, cargo, ativo];
			if(password && password.length >= 6) {
				const hashed = await bcrypt.hash(password, 10);
				query += ', password = $1';
				params.push(hashed);
			}
			query += ' WHERE id = $1';
			params.push(id);
			await db.query(query, params);
			res.json({ message: 'Atualizado' });
		} catch (error) {
			console.error(error);
			res.status(500).json({ error: 'Erro ao atualizar'});
		}
	}
	
	async delete(req, res) {
		const usuarioId = req.params.id;
		const loggedUsuarioId = req.usuarioId;
		
		if (parseInt(usuarioId) === parseInt(loggedUsuarioId)) {
			return res.status(403).json({ error: 'Você não pode excluir sua própria conta' });
		}
		
		try {
			await db.query('START TRANSACTION');
			
			// 1. Primeiro, deleta as vendas associadas aos perfumes do usuário e também as vendas onde o usuário e vendedor
			// (para desfazer qualquer dependência antes de deletar perfumes ou usuário)
			await db.query('DELETE FROM vendas WHERE perfume_id IN (SELECT id FROM perfumes WHERE usuario_id = $1)', [usuarioId]);
			await db.query('DELETE FROM vendas WHERE vendedor_id = $1', [usuarioId]);
			
			// 2. Deleta os perfumes do usuário
			await db.query('DELETE FROM perfumes WHERE usuario_id = $1', [usuarioId]);
			
			// 3. Deleta o usuário
			const [result] = await db.query('DELETE FROM usuarios WHERE id = $1', [usuarioId]);
			
			if(result.affectedRows === 0) {
				await db.query('ROLLBACK');
				return res.status(404).json({ error: 'Usuário não encontrado' });
			}
			
			await db.query('COMMIT');
			res.json({ message: 'Usuário e todos os registros associados excluídos com sucesso' });
		} catch (error) {
			await db.query('ROLLBACK');
			console.error('Erro ao excluir usuário:', error);
			res.status(500).json({ error: 'Erro ao excluir: ' + error.message });
		}
	}
}

module.exports = new UsuarioController();
