const db = require('../config/database');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

class AutenticacaoController {
	// Login gera token com id e cargo
	async login(req, res) {
		try {
			const { email, password } = req.body;
			// Desestrutura corretamente o retorno do db.query
			const [rows] = await db.query('SELECT * FROM usuarios WHERE email = ?', [email]);
			const usuario = rows[0];
			
			if(!usuario || !usuario.ativo) {
				return res.status(401).json({ error: 'Email ou senha inválidos' });
			}
			
			const valido = await bcrypt.compare(password, usuario.password);
			if(!valido) {
				return res.status(401).json({ error: 'Email ou senha inválidos' });
			}
			
			// Gera o token incluindo a cargo (admin ou funcionario)
			const token = jwt.sign(
				{ id: usuario.id, email: usuario.email, cargo: usuario.cargo },
				process.env.JWT_SECRET,
				{ expiresIn: '24h' }
			);
			
			res.json({
				token,
				usuario: {
					id: usuario.id,
					nome: usuario.nome,
					email: usuario.email,
					cargo: usuario.cargo
				}
			});
		} catch(error) {
			console.error('Erro no login:', error);
			res.status(500).json({ error: error.message });
		}
	}
	
	// Registro de novos usuários (com função opcional)
	async registro(req, res) {
		try {
			const { nome, email, password, cargo } = req.body;
			const hashed = await bcrypt.hash(password, 10);
			await db.query(
				'INSERT INTO usuarios (nome, email, password, cargo) VALUES (?, ?, ?, ?)',
				[nome, email, hashed, cargo || 'funcionario']
			);
			res.status(201).json({ message: 'Usuário criado com sucesso' });
		} catch (error) {
			console.error('Erro no cadastro:' ,'error');
			res.status(500).json({ error: error.message });
		}
	}
	
	// Esqueci minha senha  - gera token e atualiza reset_token/reset_expires
	
	async esqueciSenha(req, res) {
		try {
			const { email } = req.body;
			const [rows] = await db.query('SELECT * FROM usuarios WHERE email = ?', [email]);
			const usuario = rows[0];
			if(!usuario) {
				return res.status(404).json({ error: 'Email não encontrado' });
			}
			
			const token = crypto.randomBytes(32).toString('hex');
			const expires = new Date(Date.now() + 3600000); // 1 hora
			
			await db.query(
				'UPDATE usuarios SET reset_token = ?, reset_expires = ? WHERE id = ?',
				[token, expires, usuario.id]
			);
			
			// Retorna apenas o token e o email - o frontend monta a URL
			res.json({ token, email });
		} catch (error) {
			console.error('Erro no esqueciSenha:', error);
			res.status(500).json({ error: error.message });
		}	
	}
	
	// Reset de senha - valida token e atualiza a senha
	async resetarSenha(req, res) {
		try {
			const { token, email, password } = req.body;
			const [rows] = await db.query(
				'SELECT * FROM usuarios WHERE email = ? AND reset_token = ? AND reset_expires > ?',
				[email, token, new Date]
			);
			const usuario = rows[0];
			if(!usuario) {
				return res.status(400).json({ error: 'Link inválido ou expirado' });
			}
			
			const hashed = await bcrypt.hash(password, 10);
			await db.query(
				'UPDATE usuarios SET password = ?, reset_token = NULL, reset_expires = NULL WHERE id = ?',
				[hashed, usuario.id]
			);
			res.json({ message: 'Senha redefinida com sucesso' });
		} catch (error) {
			console.error('Erro no resetarSenha:', error);
			res.status(500).json({ error: error.message });
		}
	}
	
	async registrarCliente(req, res) {
		const { nome, email, password } = req.body;
		if(!nome || !email || !password) {
			return res.status(400).json({ erro: 'Dados incompletos' });
		}
		try {
			const hashedPassword = await bcrypt.hash(password, 10);
			await db.query(
				'INSERT INTO usuarios (nome, email, password, cargo) VALUES(?, ?, ?, ?)',
				[nome, email, hashedPassword, 'cliente']
			);
			res.status(201).json({ messagem: 'Cliente registrado com sucesso' });
		} catch (err) {
			if(err.code === 'ER_DUP_ENTRY') {
				return res.status(409).json({ erro: 'Email já cadastro' });
			}
			res.status(500).json({ erro: err.message });
		}
	}
}

module.exports = new AutenticacaoController();
