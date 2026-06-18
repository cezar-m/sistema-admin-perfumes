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
    await db.query('BEGIN');

    // Lista de dependências conhecidas (adicione outras se necessário)
    const dependencias = [
      { tabela: 'perfumes', coluna: 'usuario_id' },
      { tabela: 'pedidos_online', coluna: 'cliente_id' },
      // { tabela: 'vendas', coluna: 'vendedor_id' },
      // { tabela: 'parcelas', coluna: 'venda_id' } // se existir
    ];

    for (const dep of dependencias) {
      try {
        console.log(`🔹 Deletando de ${dep.tabela} WHERE ${dep.coluna} = ${usuarioId}`);
        await db.query(`DELETE FROM ${dep.tabela} WHERE ${dep.coluna} = $1`, [usuarioId]);
        console.log(`✅ ${dep.tabela} limpa`);
      } catch (err) {
        // Se a tabela não existir, ignora
        if (err.code === '42P01') {
          console.warn(`⚠️ Tabela ${dep.tabela} não existe, ignorando.`);
        } else {
          throw err; // outro erro inesperado
        }
      }
    }

    // Tenta deletar o usuário
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
    return res.json({ message: 'Usuário e dependências excluídos com sucesso' });

  } catch (error) {
    await db.query('ROLLBACK');
    console.error('❌ ERRO NO DELETE:', error);

    // Se for erro de chave estrangeira, extrai a tabela do detail
    if (error.code === '23503') {
      const tableMatch = error.detail?.match(/table "([^"]+)"/);
      const table = tableMatch ? tableMatch[1] : 'desconhecida';
      return res.status(400).json({
        error: `Usuário ainda possui registros na tabela "${table}". Adicione essa tabela à lista de dependências.`,
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
