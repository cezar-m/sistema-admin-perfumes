require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();

// CORS dinâmico conforme ambiente
const allowedOrigins = process.env.NODE_ENV === 'production'
  ? [process.env.FRONTEND_URL || 'https://sistema-admin-perfumes.vercel.app']
  : ['http://localhost:5173', 'http://localhost:3000'];

app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));

app.use(express.json());

// Servir arquivos estáticos (com fallback para produção)
const uploadsPath = path.join(__dirname, 'src/uploads');
app.use('/uploads', express.static(uploadsPath));

// Rota raiz para evitar 404 na homepage
app.get('/', (req, res) => {
  res.json({
    message: 'API do Sistema Admin Perfumes está rodando',
    version: '1.0.0',
    endpoints: {
      auth: '/api/autenticacao',
      usuarios: '/api/usuarios',
      perfumes: '/api/perfumes',
      vendas: '/api/vendas',
      pedidos: '/api/pedidos'
    }
  });
});

// Rotas da API
app.use('/api/autenticacao', require('./src/routes/autenticacaoRoutes'));
app.use('/api/usuarios', require('./src/routes/usuarioRoutes'));
app.use('/api/perfumes', require('./src/routes/perfumeRoutes'));
app.use('/api/vendas', require('./src/routes/vendaRoutes'));
app.use('/api/pedidos', require('./src/routes/pedidoRoutes'));

// Tratamento de rotas não encontradas (404)
app.use((req, res) => {
  res.status(404).json({ error: 'Rota não encontrada' });
});

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));
