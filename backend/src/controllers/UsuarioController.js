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

    // Tenta deletar dependências, mas ignora erros de tabela inexistente
    const dependencias = [
      { nome: 'parcelas', query: 'DELETE FROM parcelas WHERE venda_id IN (SELECT id FROM vendas WHERE vendedor_id = $1)' },
      { nome: 'vendas', query: 'DELETE FROM vendas WHERE vendedor_id = $1' },
      { nome: 'perfumes', query: 'DELETE FROM perfumes WHERE usuario_id = $1' }
    ];

    for (const dep of dependencias) {
      try {
        console.log(`🔹 Deletando ${dep.nome}...`);
        await db.query(dep.query, [usuarioId]);
        console.log(`✅ ${dep.nome} deletados`);
      } catch (err) {
        // Se o erro for "relation does not exist", apenas avisa e continua
        if (err.code === '42P01') { // PostgreSQL: relação não existe
          console.warn(`⚠️ Tabela ${dep.nome} não existe, ignorando.`);
        } else {
          // Outro erro inesperado – relança para ser tratado no catch externo
          throw err;
        }
      }
    }

    // Deleta o usuário
    console.log('🔹 Deletando usuário...');
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
    return res.status(500).json({
      error: error.message,
      detail: error.detail || '',
      code: error.code || ''
    });
  }
}
}

module.exports = new UsuarioController();
