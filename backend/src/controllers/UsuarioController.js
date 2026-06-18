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

    // 1. Descobre todas as tabelas que têm FK para usuarios(id)
    const fkQuery = `
      SELECT
        tc.table_name,
        kcu.column_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND kcu.referenced_table_name = 'usuarios'
        AND kcu.referenced_column_name = 'id'
    `;
    const fkResult = await db.query(fkQuery);
    const tabelas = fkResult.rows.map(row => row.table_name);

    console.log(`📋 Tabelas com FK para usuarios:`, tabelas);

    // 2. Para cada tabela, deleta os registros que referenciam o usuarioId
    for (const tabela of tabelas) {
      // Descobre o nome da coluna que referencia usuarios.id
      const colQuery = `
        SELECT kcu.column_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
          ON tc.constraint_name = kcu.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY'
          AND kcu.referenced_table_name = 'usuarios'
          AND kcu.referenced_column_name = 'id'
          AND tc.table_name = $1
      `;
      const colResult = await db.query(colQuery, [tabela]);
      const coluna = colResult.rows[0]?.column_name;

      if (!coluna) {
        console.warn(`⚠️ Não encontrou coluna para tabela ${tabela}, pulando.`);
        continue;
      }

      console.log(`🔹 Deletando da tabela ${tabela} (coluna ${coluna})...`);
      await db.query(`DELETE FROM ${tabela} WHERE ${coluna} = $1`, [usuarioId]);
      console.log(`✅ ${tabela} limpa`);
    }

    // 3. Deleta o usuário
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
    return res.json({ message: 'Usuário e todas as dependências excluídos com sucesso' });

  } catch (error) {
    await db.query('ROLLBACK');
    console.error('❌ ERRO FATAL NO DELETE:', error);

    if (error.code === '23503') {
      // Tenta extrair a tabela e coluna do erro
      const tableMatch = error.detail?.match(/table "([^"]+)"/);
      const table = tableMatch ? tableMatch[1] : 'desconhecida';
      return res.status(400).json({
        error: `Usuário ainda possui registros na tabela "${table}".`,
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
