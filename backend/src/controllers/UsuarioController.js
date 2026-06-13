const db = require('../config/database');
const bcrypt = require('bcrypt');

class UsuarioController {
	async index(req, res) {
		try {
			const result = await db.query('SELECT id, nome, email, cargo, ativo FROM usuarios');
			res.json(result.rows);
		} catch (error) {
			console.error(error);
			res.status(500).json({ error: 'Erro ao listar' });
		}
	}
	
	async update(req, res) {
    	const { id } = req.params;
    	const { nome, email, cargo, ativo, password } = req.body;
			try {
				let result;
				if (password && password.trim().length >= 6) {
					const hashed = await bcrypt.hash(password, 10);
					result = await db.query(`UPDATE usuarios SET nome = $1, email = $2, cargo = $3, ativo = $4, password = $5 WHERE id = $6 RETURNING id`,
                	[nome, email, cargo, ativo, hashed, id]
            	);
        		} else {
				result = await db.query(
                `UPDATE usuarios SET nome = $1, email = $2,cargo = $3, ativo = $4 WHERE id = $5 RETURNING id`,
                [nome, email, cargo, ativo, id]
            	);
        	}

	        if (result.rows.length === 0) {
	            return res.status(404).json({
	                error: 'Usuário não encontrado'
	            });
	        }
	
	        return res.json({
	            message: 'Usuário atualizado com sucesso'
	        });

    	} catch (error) {

        	console.error('Erro ao atualizar usuário:', error);

        	return res.status(500).json({
            	error: error.message,
            	detail: error.detail,
            	code: error.code
        });
    }
	}
	
	async delete(req, res) {
		const usuarioId = req.params.id;
		const loggedUsuarioId = req.usuarioId;
		
		if (parseInt(usuarioId) === parseInt(loggedUsuarioId)) {
			return res.status(403).json({ error: 'Você não pode excluir sua própria conta' });
		}
		
		try {
			await db.query('BEGIN');
			
			// 1. Primeiro, deleta as vendas associadas aos perfumes do usuário e também as vendas onde o usuário e vendedor
			// (para desfazer qualquer dependência antes de deletar perfumes ou usuário)
			await db.query('DELETE FROM vendas WHERE perfume_id IN (SELECT id FROM perfumes WHERE usuario_id = $1)', [usuarioId]);
			await db.query('DELETE FROM vendas WHERE vendedor_id = $1', [usuarioId]);
			
			// 2. Deleta os perfumes do usuário
			await db.query('DELETE FROM perfumes WHERE usuario_id = $1', [usuarioId]);
			
			// 3. Deleta o usuário
			const result = await db.query('DELETE FROM usuarios WHERE id = $1 RETURNING id', [usuarioId]);
			
			if(result.rows.length === 0) {
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
