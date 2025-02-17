const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const userService = require('../user/user.service');


class AuthService {
  // Função de login
  async login(email, password) {
    try {
      // Busca o usuário pelo e-mail
      const user = await userService.getUserByEmail(email);

      if (!user) {
        throw new Error('Usuário não encontrado.');
      }

      // Verifica se a senha fornecida é válida
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        throw new Error('Credenciais inválidas.');
      }

      // Gera o token JWT
      const token = jwt.sign(
        { id: user.id, email: user.email },
        process.env.JWT_SECRET,
        { expiresIn: '100h' } // Expira em 1 hora
      );

      // Retorna o token e os dados do usuário (sem a senha)
      return {
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
        },
      };
    } catch (error) {
      console.error('Erro no login:', error.message);
      throw new Error(error.message);
    }
  }
}

module.exports = new AuthService();
