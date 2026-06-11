require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();

// CORS correto - apenas uma vez
app.use(cors({
	origin: ['http://localhost:5173', 'http://localhost:3000'],
	credentials: true
}));

app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'src/uploads')));

// Rotas
app.use('/api/autenticacao', require('./src/routes/autenticacaoRoutes'));
app.use('/api/usuarios', require('./src/routes/usuarioRoutes'));
app.use('/api/perfumes', require('./src/routes/perfumeRoutes'));
app.use('/api/vendas', require('./src/routes/vendaRoutes'));
app.use('/api/pedidos', require('./src/routes/pedidoRoutes'));

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));