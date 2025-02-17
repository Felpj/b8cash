const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const bcrypt = require('bcrypt');

class UserService {

    // Criar um novo usuário
    async createUser(name, email, password) {
        try {
            // Hash da senha
            const hashedPassword = await bcrypt.hash(password, 10);

            // Criação do usuário no banco de dados
            const user = await prisma.user.create({
                data: {
                    name,
                    email,
                    password: hashedPassword,
                },
            });

            return user;
        } catch (error) {
            console.error('Erro ao criar usuário:', error.message);
            throw new Error('Não foi possível criar o usuário.');
        }
    }

    // Buscar usuário pelo e-mail
    async getUserByEmail(email) {
        try {
            const user = await prisma.user.findUnique({
                where: {
                    email,
                },
            });

            if (!user) {
                throw new Error('Usuário não encontrado.');
            }

            return user;
        } catch (error) {
            console.error('Erro ao buscar usuário por e-mail:', error.message);
            throw new Error('Não foi possível buscar o usuário.');
        }
    }



    // Buscar todos os usuários
    async getAllUsers() {
        try {
            const users = await prisma.user.findMany({
                select: {
                    id: true,
                    name: true,
                    email: true,
                    createdAt: true,
                    updatedAt: true,
                },
            });
            return users;
        } catch (error) {
            console.error('Erro ao buscar usuários:', error.message);
            throw new Error('Não foi possível buscar os usuários.');
        }
    }

    // Buscar usuário por ID
    async getUserById(userId) {
        try {
            const user = await prisma.user.findUnique({
                where: {
                    id: userId,
                },
                select: {
                    id: true,
                    name: true,
                    email: true,
                    createdAt: true,
                    updatedAt: true,
                },
            });

            if (!user) {
                throw new Error('Usuário não encontrado.');
            }

            return user;
        } catch (error) {
            console.error('Erro ao buscar usuário por ID:', error.message);
            throw new Error('Não foi possível buscar o usuário.');
        }
    }

    // Atualizar usuário por ID
    async updateUser(userId, updateData) {
        try {
            // Se a senha for atualizada, gerar o hash antes de salvar
            if (updateData.password) {
                updateData.password = await bcrypt.hash(updateData.password, 10);
            }

            const updatedUser = await prisma.user.update({
                where: {
                    id: userId,
                },
                data: updateData,
            });

            return updatedUser;
        } catch (error) {
            console.error('Erro ao atualizar usuário:', error.message);
            if (error.code === 'P2025') {
                throw new Error('Usuário não encontrado para atualizar.');
            }
            throw new Error('Não foi possível atualizar o usuário.');
        }
    }

    // Deletar usuário por ID
    async deleteUser(userId) {
        try {
            const deletedUser = await prisma.user.delete({
                where: {
                    id: userId,
                },
            });

            return deletedUser;
        } catch (error) {
            console.error('Erro ao deletar usuário:', error.message);
            if (error.code === 'P2025') {
                throw new Error('Usuário não encontrado para deletar.');
            }
            throw new Error('Não foi possível deletar o usuário.');
        }
    }
}

module.exports = new UserService();
