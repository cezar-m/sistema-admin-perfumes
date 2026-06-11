const crypto = require('crypto');
const bcrypt = require('bcrypt');
const db = require('../config/db'); // ajuste o caminho conforme seu projeto

class AutenticacaoController {
	
	async esqueciSenha(req, res) {
		try {
			const { email } = req.body;
			
			// Validação básica
			if (!email) {
				return res.status(400).json({ error: 'Email é obrigatório' });
			}
			
			const [rows] = await db.query('SELECT * FROM usuarios WHERE email = ?', [email]);
			const usuario = rows[0];
			if (!usuario) {
				// Por segurança, retorne mensagem genérica (não informe se email existe)
				return res.status(404).json({ error: 'Email não encontrado' });
			}
			
			const token = crypto.randomBytes(32).toString('hex');
			const expires = new Date(Date.now() + 3600000); // 1 hora
			
			await db.query(
				'UPDATE usuarios SET reset_token = ?, reset_expires = ? WHERE id = ?',
				[token, expires, usuario.id]
			);
			
			// Retorna token e email para o frontend montar a URL
			res.json({ token, email });
		} catch (error) {
			console.error('Erro no esqueciSenha:', error);
			res.status(500).json({ error: error.message });
		}	
	}
	
	async resetarSenha(req, res) {
		try {
			const { token, email, password } = req.body;
			
			// Validações
			if (!token || !email || !password) {
				return res.status(400).json({ error: 'Dados incompletos' });
			}
			if (password.length < 6) {
				return res.status(400).json({ error: 'A senha deve ter no mínimo 6 caracteres' });
			}
			
			// CORREÇÃO AQUI: usar new Date() (instância atual)
			const [rows] = await db.query(
				'SELECT * FROM usuarios WHERE email = ? AND reset_token = ? AND reset_expires > ?',
				[email, token, new Date()]  // ← antes estava "new Date" sem parênteses
			);
			const usuario = rows[0];
			if (!usuario) {
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
		
		if (!nome || !email || !password) {
			return res.status(400).json({ error: 'Dados incompletos' }); // troquei "erro" por "error" para consistência
		}
		
		if (password.length < 6) {
			return res.status(400).json({ error: 'A senha deve ter no mínimo 6 caracteres' });
		}
		
		try {
			const hashedPassword = await bcrypt.hash(password, 10);
			await db.query(
				'INSERT INTO usuarios (nome, email, password, cargo) VALUES(?, ?, ?, ?)',
				[nome, email, hashedPassword, 'cliente']
			);
			// Corrigido "messagem" para "message"
			res.status(201).json({ message: 'Cliente registrado com sucesso' });
		} catch (err) {
			if (err.code === 'ER_DUP_ENTRY') {
				// Corrigido texto "cadastro" para "cadastrado"
				return res.status(409).json({ error: 'Email já cadastrado' });
			}
			res.status(500).json({ error: err.message });
		}
	}
}

module.exports = new AutenticacaoController();
