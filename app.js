require('dotenv').config();
const openApiSpec = require('./src/api-docs-example/openapi.json');
const express = require('express');

const app = express();

// Configuração de porta (do .env ou padrão 3000)
const PORT = process.env.PORT || 3000;

// Middleware para lidar com JSON
app.use(express.json());

// Middleware para documentação do Scalar (usando import dinâmico)
(async () => {
  const { apiReference } = await import('@scalar/express-api-reference');
  app.use(
    '/reference',
    apiReference({
      spec: {
        content: openApiSpec,
      },
    })
  );

  // Middleware para rotas já configuradas
  const tcrRoutes = require('./src/tcr/tcr.routes');
  const userRoutes = require('./src/user/user.routes');
  const authRoutes = require('./src/auth/auth-routes');

  app.use('/tcr', tcrRoutes);
  app.use('/user', userRoutes);
  app.use('/auth', authRoutes);

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
