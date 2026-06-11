const jwt = require('jsonwebtoken');

module.exports = {
	authenticate(req, res, next) {
		const authHeader = req.headers.authorization;
		if(!authHeader) return res.status(401).json({ error: 'Token não fornecido' });
		const token = authHeader.split(' ')[1];
		if(!token) return res.status(401).json({ error: 'Token mal formatado' });
		try {
			const decoded = jwt.verify(token, process.env.JWT_SECRET);
			req.usuarioId = decoded.id;
			req.usuarioCargo = decoded.cargo;
			next();
		} catch (error) {
			return res.status(401).json({ error: 'Token inválido ou expirado' });
		}
	},
	isAdmin(req, res, next) {
		if(req.usuarioCargo !== 'admin') return res.status(403).json({ error: 'Acesso negado' });
		next();
	}
};