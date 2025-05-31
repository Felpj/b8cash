require('dotenv').config();
const express = require('express');

const app = express();

// Configuração de porta (do .env ou padrão 3000)
const PORT = process.env.PORT || 3000;

// ===== CORS TOTALMENTE ABERTO - PRIMEIRA PRIORIDADE =====
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url} - Origin: ${req.headers.origin}`);
  
  // Headers CORS mais permissivos possíveis
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.header('Access-Control-Allow-Headers', '*');
  res.header('Access-Control-Allow-Credentials', 'false');
  res.header('Access-Control-Max-Age', '86400');
  
  // Responder imediatamente para OPTIONS
  if (req.method === 'OPTIONS') {
    console.log('[CORS] Respondendo OPTIONS para:', req.url);
    return res.status(200).end();
  }
  
  next();
});
// =========================================================

// Middleware para lidar com JSON
app.use(express.json());

// Middleware para documentação do Scalar (usando import dinâmico)
(async () => {
  const { apiReference } = await import('@scalar/express-api-reference');
  app.use(
    '/reference',
    apiReference({
      spec: {
        content: {},
      },
    })
  );

  // Middleware para rotas já configuradas
  const b8cashRoutes = require('./src/b8cash-api/b8cash.routes');
  const userRoutes = require('./src/user/user.routes');
  const authRoutes = require('./src/auth/auth-routes');
  const dashboardRoutes = require('./src/dashboard/dashboard.routes');
  const depositoRoutes = require('./src/deposito/deposito.routes');
  const webhookRoutes = require('./src/webhook/webhook.routes');
  const pixRoutes = require('./src/pix/pix.routes');

  app.use('/b8cash', b8cashRoutes);
  app.use('/user', userRoutes);
  app.use('/auth', authRoutes);
  app.use('/dashboard', dashboardRoutes);
  app.use('/deposito', depositoRoutes);
  app.use('/api', webhookRoutes);
  app.use('/pix', pixRoutes);
  
  // Middleware para rotas não encontradas (404)
  app.use((req, res, next) => {
    res.status(404).json({ error: 'Rota não encontrada' });
  });

  // Middleware para tratamento de erros
  app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Erro interno no servidor' });
  });

  // Middleware para rotas do usuário
})();

// Inicializa o servidor
app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
  console.log(`Documentação disponível em http://localhost:${PORT}/reference`);
});
