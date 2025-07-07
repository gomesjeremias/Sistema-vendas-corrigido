const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

// Carregar variáveis de ambiente
dotenv.config();

// Importar rotas
const authRoutes = require('./routes/auth');
const { authenticateToken } = require('./routes/middleware/auth');
const clienteRoutes = require('./routes/clientes');
const fornecedorRoutes = require('./routes/fornecedores');
const produtoRoutes = require('./routes/produtos');
const vendaRoutes = require('./routes/vendas');
const dashboardRoutes = require('./routes/dashboard');

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors({
  origin: '*',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir arquivos estáticos do frontend
app.use(express.static(path.join(__dirname, '.')));

// Rotas da API
app.use('/api/auth', authRoutes);
app.use('/api/clientes', authenticateToken, clienteRoutes);
app.use('/api/fornecedores', authenticateToken, fornecedorRoutes);
app.use('/api/produtos', authenticateToken, produtoRoutes);
app.use('/api/vendas', authenticateToken, vendaRoutes);
app.use('/api/dashboard', authenticateToken, dashboardRoutes);

// Rota para servir o frontend
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Middleware de tratamento de erros
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Algo deu errado!' });
});

// Iniciar servidor
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor rodando na porta ${PORT}`);
  console.log(`Acesse: http://localhost:${PORT}`);
});

module.exports = app;

