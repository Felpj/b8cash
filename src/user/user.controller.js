const userService = require('./user.service');

class UserController {
  // Criar um novo usuário
  async createUser(req, res) {
    const { name, document, phone, email, password } = req.body;
    console.log('Iniciando a criação de usuário:', { name, document, phone, email }); // Log estratégico
    try {
      if (!name || !document || !phone || !email || !password) {
        console.warn('Erro: Campos obrigatórios não preenchidos'); // Log de aviso
        return res.status(400).json({ error: 'Todos os campos são obrigatórios' });
      }
      
      const result = await userService.createUser(name, document, phone, email, password);
      
      if (result.requiresKyc) {
        console.log('KYC requerido para usuário:', { 
          userId: result.user?.id, 
          email: result.user?.email, 
          kycUrl: result.kycUrl,
          currentStep: result.data?.currentStep 
        });
        // Retorna 200 (não 201) pois usuário existe mas precisa completar KYC
        res.status(200).json(result);
      } else {
        console.log('Usuário processado com sucesso:', { id: result.id, email: result.email, isNewUser: result.isNewUser });
        // Retornamos a resposta completa da API B8cash junto com os dados do usuário local
        res.status(201).json(result);
      }
    } catch (error) {
      console.error('Erro ao processar usuário:', error.message); // Log de erro
      res.status(400).json({ error: error.message });
    }
  }

  // Buscar todos os usuários
  async getAllUsers(req, res) {
    try {
      const users = await userService.getAllUsers();
      res.status(200).json(users);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  // Buscar usuário por ID
  async getUserById(req, res) {
    const { id } = req.params;
    try {
      const user = await userService.getUserById(parseInt(id, 10));
      res.status(200).json(user);
    } catch (error) {
      res.status(404).json({ error: error.message });
    }
  }

  // Atualizar usuário por ID
  async updateUser(req, res) {
    const { id } = req.params;
    const updateData = req.body;
    try {
      const updatedUser = await userService.updateUser(parseInt(id, 10), updateData);
      res.status(200).json(updatedUser);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }

  // Deletar usuário por ID
  async deleteUser(req, res) {
    const { id } = req.params;
    try {
      const deletedUser = await userService.deleteUser(parseInt(id, 10));
      res.status(200).json(deletedUser);
    } catch (error) {
      res.status(404).json({ error: error.message });
    }
  }
}

module.exports = new UserController();
