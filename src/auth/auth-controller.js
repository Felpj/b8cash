const bcrypt = require('bcrypt');
const authService = require('./auth-service');


class AuthController {

  async login(req, res) {
    const { document, password } = req.body;
    console.log('Iniciando o processo de login para o documento:', document); // Log estratégico

    try {
      // Chama o serviço de autenticação
      const result = await authService.login(document, password);
      console.log('Login bem-sucedido para o documento:', document); // Log estratégico

      // Retorna o token e os dados do usuário
      res.status(200).json(result);
    } catch (error) {
      console.error('Erro no login para o documento:', document, 'Mensagem de erro:', error.message); // Log estratégico
      res.status(401).json({ error: error.message });
    }
  }
}

module.exports = new AuthController();
