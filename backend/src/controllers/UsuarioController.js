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

  // Impede auto-exclusão
  if (Number(usuarioId) === Number(loggedUsuarioId)) {
    return res.status(403).json({ error: 'Você não pode excluir sua própria conta' });
  }

  try {
    console.log(`🗑️ Iniciando exclusão do usuário ${usuarioId}`);
    await db.query('BEGIN');

    // Lista de comandos DELETE para tentar (em ordem)
    const deletes = [
      'DELETE FROM parcelas WHERE venda_id IN (SELECT id FROM vendas WHERE vendedor_id = $1)',
      'DELETE FROM vendas WHERE vendedor_id = $1',
      'DELETE FROM perfumes WHERE usuario_id = $1'
    ];

    for (const sql of deletes) {
      try {
        await db.query(sql, [usuarioId]);
        console.log(`✅ Query executada: ${sql.substring(0, 50)}...`);
      } catch (err) {
        // Ignora apenas se for "tabela não existe" (código 42P01)
        if (err.code === '42P01') {
          console.warn(`⚠️ Tabela não existe, ignorando: ${err.message}`);
        } else {
          // Qualquer outro erro (ex: violação de chave estrangeira) – relança
          throw err;
        }
      }
    }

    // Agora deleta o usuário
    const result = await db.query(
      'DELETE FROM usuarios WHERE id = $1 RETURNING id',
      [usuarioId]
    );

    if (result.rows.length === 0) {
      await db.query('ROLLBACK');
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    await db.query('COMMIT');
    console.log(`✅ Usuário ${usuarioId} excluído com sucesso`);
    return res.json({ message: 'Usuário excluído com sucesso' });

  } catch (error) {
    await db.query('ROLLBACK');
    console.error('❌ ERRO FATAL NO DELETE:', error);
    // Retorna erro com detalhes para o frontend (ajuda a debugar)
    return res.status(500).json({
      error: error.message,
      detail: error.detail || '',
      code: error.code || '',
      table: error.table || ''
    });
  }
}
}

module.exports = new UsuarioController();
