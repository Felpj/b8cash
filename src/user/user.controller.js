const userService = require('./user.service');

class UserController {
  // Criar um novo usuário
  async createUser(req, res) {
    const { name, email, password } = req.body;
    try {
      const user = await userService.createUser(name, email, password);
      res.status(201).json(user);
    } catch (error) {
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
