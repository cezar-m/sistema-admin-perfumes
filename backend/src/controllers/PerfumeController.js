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
		try {
			let usuarioId = req.usuarioId;
			let usuarioCargo = req.usuarioCargo;
			
			// Log para diagnóstico
			console.log('========================================');
			console.log('PerfumeController.index')
			console.log('req.usuarioId:', usuarioId);
			console.log('req.usuarioCargo:', usuarioCargo);
			console.log('Header Authorization:', req.headers.authorization);
			console.log('usuarioCargo:', req.usuarioCargo);
        	console.log('usuarioId:', req.usuarioId);

			
			// Fallback: se não veio do middleware, tenta extrair do token
			if(!usuarioId && req.headers.authorization) {
				const token = req.headers.authorization.split(' ')[1];
				if(token) {
					try {
						const decoded = require('jsonwebtoken').verify(token, process.env.JWT_SECRET);
						usuarioId = decoded.id;
						usuarioCargo = decoded.cargo;
						console.log('Token decodificado manualmente: id=', usuarioId, 'cargo=', usuarioCargo);
					} catch (e) {
						console.log('Token inválido na tentativa manual');
					}
				}
			}
		
			let perfumes = [];
			
			// CORREÇÃO: clientes (cargo 'cliente') também veem todos os perfumes
			if(!usuarioId || usuarioCargo === 'cliente') {
				console.log('Público ou cliente: retorna TODOS os perfumes');
				const result = await db.query('SELECT * FROM perfumes ORDER BY criado_em DESC');
				perfumes = result.rows;
			}
			// Admin: todos os perfumes + nome do criador
			else if(usuarioCargo == 'admin') {
				console.log('Admin: retornando TODOS os perfumes (com criador)');
				const result = await db.query(`
					SELECT p.*, u.nome as criado_por
					FROM perfumes p
					LEFT JOIN usuarios u ON p.usuario_id = u.id
					ORDER BY p.criado_em DESC
				`);
				perfumes = result.rows;
			}
			// Funcionário: apenas os perfumes que ele mesmo cadastrou
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
			res.status(500).json({ error: error.message });
		}
	}

	// Os demais métodos (store, upate, delete) permanecem iguais
	async store(req, res) {
		
		// Permissão: apenas admin ou funcionário
	   if(req.usuarioCargo !== "admin" && req.usuarioCargo !== "funcionario") {
			return res.status(403).json({ error: 'Apenas funcionários ou administradores podem cadastrar perfumes' });
	   }
		upload(req, res, async (err) => {
			if(err) return res.status(400).json({ error: 'Erro no upload' });
			const {nome, descricao, preco, quantidade, familia, genero} = req.body;
			const imagem = req.file ? req.file.filename : null;
			const usuario_id = req.usuarioId;
			try {
				const result = await db.query(
					`INSERT INTO perfumes (nome, descricao, preco, quantidade, familia, genero, imagem, usuario_id)
					 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
					[nome, descricao, preco, quantidade, familia, genero, imagem, usuario_id]
				);
				res.status(201).json({ id: result.insertId, message: 'Perfume cadastrado' });
			} catch (error) {
				console.error(error);
				res.status(500).json({ error: error.message });
			}
		});
	}

	async update(req, res) {
		upload(req, res, async (err) => {
			if(err) return res.status(400).json({ error: 'Erro no upload' });
			const { id } = req.params;
			const { nome, descricao, preco, quantidade, familia, genero } = req.body;
			let imagem = null;
			if(req.file) imagem = req.file.filename;

			let query = 'UPDATE perfumes SET nome=$1, descricao=$2, preco=$3, quantidade=$4, familia=$5, genero=$6';
			let params = [nome, descricao, preco, quantidade, familia, genero];

			if(imagem) {
				query += ', imagem=$7';
				params.push(imagem);
			}

			// Admin pode editar qualquer perfume; funcionário apenas os seus
			if (req.usuarioCargo === 'admin') {
				query += ' WHERE id=$1';
				params.push(id);
			} else {
				query += ' WHERE id=$1 AND usuario_id=$2';
				params.push(id, req.usuarioId);
			}

			try {
				const result = await db.query(query, params);
				if(result.affectedRows === 0) {
					return res.status(403).json({ error: 'Não autorizado ou perfume não existe' });
				}
				res.json({ message: 'Perfume atualizado' });
			} catch (error) {
				console.error(error);
				res.status(500).json({ error: error.message });
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
