const db = require('../config/database');
const bcrypt = require('bcrypt');

class UsuarioController {
	async index(req, res) {
	  try {
	    const { id } = req.params;
	
	    // Se tiver ID, busca um único usuário
	    if (id) {
	      const usuarioId = parseInt(id, 10);
	      if (isNaN(usuarioId)) {
	        return res.status(400).json({ error: 'ID inválido' });
	      }
	
	      const result = await db.query(
	        'SELECT id, nome, email, cargo, ativo FROM usuarios WHERE id = $1',
	        [usuarioId]
	      );
	
	      if (result.rows.length === 0) {
	        return res.status(404).json({ error: 'Usuário não encontrado' });
	      }
	
	      return res.json(result.rows[0]);
	    }
	
	    // Se não tiver ID, lista todos
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

  if (Number(usuarioId) === Number(loggedUsuarioId)) {
    return res.status(403).json({ error: 'Você não pode excluir sua própria conta' });
  }

  try {
    console.log(`🗑️ Deletando usuário ${usuarioId}...`);

    // Agora, com CASCADE, basta deletar o usuário
    const result = await db.query(
      'DELETE FROM usuarios WHERE id = $1 RETURNING id',
      [usuarioId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    console.log(`✅ Usuário ${usuarioId} e todas as dependências excluídos com sucesso`);
    return res.json({ message: 'Usuário excluído com sucesso' });

  } catch (error) {
    console.error('❌ ERRO NO DELETE:', error);

    // Se ainda houver erro de FK, é porque alguma FK não foi configurada com CASCADE
    if (error.code === '23503') {
      return res.status(400).json({
        error: 'Falha ao excluir: ainda há dependências. Verifique se todas as FKs têm ON DELETE CASCADE.',
        detail: error.detail
      });
    }

    return res.status(500).json({
      error: error.message,
      code: error.code,
      detail: error.detail
    });
  }
}
}

module.exports = new UsuarioController();
