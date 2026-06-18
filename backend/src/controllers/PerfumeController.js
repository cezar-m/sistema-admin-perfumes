const db = require('../config/database');
const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
	destination: './src/uploads/',
	filename: (req, file, cb) => {
		cb(null, Date.now() + path.extname(file.originalname));
	}
});
const upload = multer({ storage }).single('imagem');

class PerfumeController {
	async index(req, res) {
	  console.log('ENTROU NO INDEX');
	  try {
	    let usuarioId = req.usuarioId;
	    let usuarioCargo = req.usuarioCargo;
	
	    // Fallback manual do token
	    if (!usuarioId && req.headers.authorization) {
	      const token = req.headers.authorization.split(' ')[1];
	      if (token) {
	        try {
	          const decoded = require('jsonwebtoken').verify(token, process.env.JWT_SECRET);
	          usuarioId = decoded.id;
	          usuarioCargo = decoded.cargo;
	        } catch (e) {
	          console.log('Token inválido na tentativa manual');
	        }
	      }
	    }
	
	    let perfumes = [];
	
	    // Público ou cliente
	    if (!usuarioId || usuarioCargo === 'cliente') {
	      console.log('Público ou cliente: retorna TODOS os perfumes');
	      const result = await db.query('SELECT * FROM perfumes ORDER BY criado_em DESC');
	      perfumes = result.rows;
	    }
	    // Admin
	    else if (usuarioCargo === 'admin') {
	      console.log('Admin: retornando TODOS os perfumes (com criador)');
	      // 👇 Ajuste os nomes das colunas conforme seu banco
	      const result = await db.query(`
	        SELECT p.*, u.nome as criado_por
	        FROM perfumes p
	        LEFT JOIN usuarios u ON p.usuario_id = u.id
	        ORDER BY p.criado_em DESC
	      `);
	      perfumes = result.rows;
	    }
	    // Funcionário
	    else {
	      console.log(`Funcionário ${usuarioId}: retornando apenas perfumes com usuario_id = ${usuarioId}`);
	      const result = await db.query(
	        'SELECT * FROM perfumes WHERE usuario_id = $1 ORDER BY criado_em DESC',
	        [usuarioId]
	      );
	      perfumes = result.rows;
	    }
	
	    res.json(perfumes);
	  } catch (error) {
	    console.error('Erro fatal no index:', error);
	    // Retorna o stack para depuração (remova em produção)
	    res.status(500).json({ error: error.message, stack: error.stack });
	  }
	}

	async store(req, res) {
	  console.log('🔵 STORE - Iniciando');
	
	  // 1. Verifica permissão
	  if (req.usuarioCargo !== "admin" && req.usuarioCargo !== "funcionario") {
	    return res.status(403).json({ error: 'Apenas funcionários ou administradores podem cadastrar perfumes' });
	  }
	
	  // 2. Verifica autenticação
	  if (!req.usuarioId) {
	    console.error('❌ usuarioId não definido no request');
	    return res.status(401).json({ error: 'Usuário não autenticado' });
	  }
	
	  // 3. Processa o upload com multer (com try/catch próprio)
	  upload(req, res, async (err) => {
	    if (err) {
	      console.error('❌ Erro no multer:', err);
	      return res.status(400).json({ error: 'Erro no upload: ' + err.message });
	    }
	
	    try {
	      // 4. Extrai e limpa os dados
	      const { nome, descricao, familia, genero } = req.body;
	      
	      // Converte preço (aceita vírgula ou ponto)
	      let preco = parseFloat(String(req.body.preco).replace(',', '.').replace(/[^0-9.]/g, ''));
	      if (isNaN(preco) || preco < 0) {
	        console.warn('⚠️ Preço inválido:', req.body.preco);
	        return res.status(400).json({ error: 'Preço inválido. Use formato como 199,90' });
	      }
	
	      let quantidade = parseInt(req.body.quantidade, 10);
	      if (isNaN(quantidade) || quantidade < 0) {
	        console.warn('⚠️ Quantidade inválida:', req.body.quantidade);
	        return res.status(400).json({ error: 'Quantidade inválida' });
	      }
	
	      const imagem = req.file ? req.file.filename : null;
	      const usuario_id = req.usuarioId;
	
	      console.log('📦 Dados a inserir:', { nome, descricao, preco, quantidade, familia, genero, imagem, usuario_id });
	
	      // 5. Query INSERT com tratamento para criado_em
	      // Se a coluna criado_em não tiver DEFAULT, use NOW() explicitamente
	      const query = `
	        INSERT INTO perfumes (nome, descricao, preco, quantidade, familia, genero, imagem, usuario_id, criado_em)
	        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
	        RETURNING id
	      `;
	      const values = [nome, descricao, preco, quantidade, familia, genero, imagem, usuario_id];
	
	      console.log('🔍 Executando query:', query);
	      console.log('🔍 Com valores:', values);
	
	      const result = await db.query(query, values);
	
	      console.log('✅ Perfume inserido com ID:', result.rows[0].id);
	      res.status(201).json({ id: result.rows[0].id, message: 'Perfume cadastrado' });
	
	    } catch (error) {
	      console.error('❌ ERRO FATAL NO STORE:', error);
	      // Retorna stack para depuração (remova em produção)
	      res.status(500).json({ 
	        error: error.message, 
	        stack: error.stack,
	        details: 'Verifique logs do servidor para mais informações'
	      });
	    }
	  });
	}
	
	async update(req, res) {
    	upload(req, res, async (err) => {
	        if (err) {
	            return res.status(400).json({
	                error: 'Erro no upload'
	            });
	        }
	        try {
	            const { id } = req.params;
	            const {
	                nome, descricao, preco, quantidade, familia, genero
	            } = req.body;
				let query = `UPDATE perfumes SET nome=$1, descricao=$2, preco=$3, quantidade=$4, familia=$5, genero=$6`;
	            const params = [nome, descricao, preco, quantidade, familia, genero];
	            if (req.file) {
	                query += `, imagem=$7`;
	                params.push(req.file.filename);
	            }
	            if (req.usuarioCargo === 'admin') {
	                const idParam = params.length + 1;
	                query += ` WHERE id=$${idParam}`;
	                params.push(id);
	            } else {
	                const idParam = params.length + 1;
	                params.push(id);
	                const usuarioParam = params.length + 1;
	                params.push(req.usuarioId);
	                query += `
	                    WHERE id=$${idParam}
	                    AND usuario_id=$${usuarioParam}
	                `;
	            }
	            const result = await db.query(
	                query, params
	            );
	            if (result.rowCount === 0) {
	                return res.status(404).json({
	                    error: 'Perfume não encontrado'
	                });
	            }
	            return res.json({
	                message: 'Perfume atualizado'
	            });
	        } catch (error) {
	            console.error('ERRO UPDATE:', error);
	            return res.status(500).json({
	                error: error.message
	            });
	        }
    	});
	}

	async delete(req, res) {
		const { id } = req.params;
		const usuarioCargo = req.usuarioCargo;
		let query, params;
		if(usuarioCargo === 'admin') {
			query = 'DELETE FROM perfumes WHERE id = $1';
			params = [id];
		} else {
			query = 'DELETE FROM perfumes WHERE id = $1 AND usuario_id = $2';
			params = [id, req.usuarioId];
		}
		try {
			const result = await db.query(query, params);
			if(result.rowCount === 0) return res.status(403).json({ error: 'Não autorizado' });
			res.json({ message: 'Perfume deletado' });
		} catch (error) {
			console.error(error);
			res.status(500).json({ error: error.message });
		}
	}
}

module.exports = new PerfumeController();
