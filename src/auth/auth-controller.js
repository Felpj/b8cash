const bcrypt = require('bcrypt');
const authService = require('./auth-service');


class AuthController {

  async login(req, res) {
    const { email, password } = req.body;

    try {
      // Chama o serviço de autenticação
      const result = await authService.login(email, password);

      // Retorna o token e os dados do usuário
      res.status(200).json(result);
    } catch (error) {
      res.status(401).json({ error: error.message });
    }
  }
}

module.exports = new AuthController();
