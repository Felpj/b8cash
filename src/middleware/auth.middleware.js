const jwt = require('jsonwebtoken');

// ===== BYPASS TEMPORÁRIO PARA DEMONSTRAÇÃO =====
// TODO: REMOVER APÓS DEMONSTRAÇÃO
const DEMO_MODE = process.env.DEMO_MODE === 'true' || true; // Ativar para demonstração
const DEMO_USER = {
  id: 1,
  name: "Usuário Demo", 
  email: "demo@b8cash.com",
  document: "12345678900"
};
// ===============================================

// Middleware para autenticação
class AuthMiddleware {
  authenticate(req, res, next) {
    // ===== BYPASS TEMPORÁRIO PARA DEMONSTRAÇÃO =====
    if (DEMO_MODE) {
      req.user = DEMO_USER; // Injeta usuário demo
      return next();
    }
    // ===============================================

    const authHeader = req.headers['authorization'];

    // Verifica se o header está presente
    if (!authHeader) {
      return res.status(401).json({ error: 'Token não fornecido.' });
    }

    // Remove o prefixo "Bearer "
    const token = authHeader.split(' ')[1];

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET); // Valida o token
      req.user = decoded; // Salva os dados do token no objeto req
      next();
    } catch (error) {
      return res.status(401).json({ error: 'Token inválido.' });
    }
  }

  // Gera um token para autenticação
  generateToken(payload) {
    try {
      // Gera um token com o payload e o segredo configurado
      const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });
      return token;
    } catch (error) {
      console.error('Erro ao gerar token:', error.message);
      throw new Error('Erro ao gerar o token de autenticação.');
    }
  }
}

module.exports = new AuthMiddleware();
