const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// ===== BYPASS TEMPORÁRIO PARA DEMONSTRAÇÃO =====
// TODO: REMOVER APÓS DEMONSTRAÇÃO
const DEMO_MODE = false; // ✅ REVERTIDO: Desabilitado após demonstração
const DEMO_USER = {
  id: 1,
  name: "Usuário Demo", 
  email: "demo@b8cash.com",
  document: "12345678900"
};
// ===============================================

// Middleware para autenticação
class AuthMiddleware {
  async authenticate(req, res, next) {
    // ===== BYPASS TEMPORÁRIO PARA DEMONSTRAÇÃO =====
    if (DEMO_MODE) {
      req.user = DEMO_USER; // Injeta usuário demo
      return next();
    }
    // ===============================================

    try {
      const authHeader = req.headers['authorization'];

      // Verifica se o header está presente
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ 
          success: false, 
          message: 'Token de acesso não fornecido.' 
        });
      }

      // Remove o prefixo "Bearer "
      const token = authHeader.substring(7);
      
      // Verificar e decodificar o token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Adicionar dados básicos do usuário à requisição
      req.user = {
        id: decoded.id,
        document: decoded.document,
        email: decoded.email
      };

      // Buscar e injetar dados bancários automaticamente
      if (decoded.account) {
        // Se dados bancários já estão no token (login normal após primeiro login)
        // Concatenar accountNumber + accountDigit conforme exigido pela API B8Cash
        const fullAccountNumber = decoded.account.accountNumber + (decoded.account.accountDigit || '');
        req.accountNumber = fullAccountNumber;
        req.userAccount = decoded.account;
        
        console.log(`[AuthMiddleware] Conta: ${req.accountNumber} (${decoded.account.accountNumber} + ${decoded.account.accountDigit || 'sem dígito'})`);
      } else {
        // Buscar dados bancários no banco local (fallback ou primeiro login)
        const account = await prisma.account.findFirst({
          where: { userId: decoded.id }
        });
        
        if (account) {
          // Concatenar accountNumber + accountDigit conforme exigido pela API B8Cash
          const fullAccountNumber = account.accountNumber + (account.accountDigit || '');
          req.accountNumber = fullAccountNumber;
          req.userAccount = {
            accountNumber: account.accountNumber,
            accountDigit: account.accountDigit,
            agencyNumber: account.agencyNumber,
            agencyDigit: account.agencyDigit,
            bankNumber: account.bankNumber,
            status: account.status
          };
          
          console.log(`[AuthMiddleware] Conta do banco: ${req.accountNumber} (${account.accountNumber} + ${account.accountDigit || 'sem dígito'})`);
        } else {
          return res.status(400).json({
            success: false,
            message: 'Usuário não possui conta bancária cadastrada. Faça login novamente.'
          });
        }
      }

      next();
    } catch (error) {
      console.error('[AuthMiddleware] Erro na autenticação:', error.message);
      
      if (error.name === 'JsonWebTokenError') {
        return res.status(401).json({ 
          success: false, 
          message: 'Token inválido.' 
        });
      }
      
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({ 
          success: false, 
          message: 'Token expirado.' 
        });
      }
      
      res.status(500).json({ 
        success: false, 
        message: 'Erro interno no servidor.' 
      });
    }
  }

  // Gera um token para autenticação
  generateToken(payload) {
    try {
      // Gera um token com o payload e o segredo configurado
      const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '100h' });
      return token;
    } catch (error) {
      console.error('Erro ao gerar token:', error.message);
      throw new Error('Erro ao gerar o token de autenticação.');
    }
  }
}

module.exports = new AuthMiddleware();
