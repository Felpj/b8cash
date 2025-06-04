const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const bcrypt = require('bcrypt');
const B8cashService = require('../b8cash-api/b8cash.service');
const { isValidDocument, getDocumentType, cleanDocument } = require('../utils/documentValidation');

class UserService {
    constructor() {
        this.b8cashService = new B8cashService();
    }

    // Criar um novo usuário
    async createUser(name, document, phone, email, password) {
        console.log('Iniciando a criação do usuário:', { name, document, phone, email }); // Log estratégico
        
        try {
            // Limpar e validar documento
            const cleanedDocument = cleanDocument(document);
            const documentType = getDocumentType(cleanedDocument);
            
            if (documentType === 'invalid') {
                throw new Error('CPF ou CNPJ inválido');
            }
            
            console.log(`Documento validado: ${cleanedDocument} (${documentType})`);
            
            // Verificar se o usuário já existe (por email ou documento)
            let user = await prisma.user.findFirst({
                where: {
                    OR: [
                        { email },
                        { document: cleanedDocument },
                    ],
                },
            });

            let isNewUser = false;

            // Se o usuário não existir, criar no banco local
            if (!user) {
                isNewUser = true;
                // Hash da senha
                const hashedPassword = await bcrypt.hash(password, 10);
                console.log('Senha hasheada com sucesso.'); // Log estratégico

                // Criação do usuário no banco de dados
                user = await prisma.user.create({
                    data: {
                        name,
                        email,
                        passwordHash: hashedPassword,
                        phoneNumber: phone,
                        document: cleanedDocument, // Salvar documento limpo
                    },
                });
                console.log('Usuário criado no banco de dados:', user); // Log estratégico
            } else {
                console.log('Usuário já existe no banco de dados:', user); // Log estratégico
            }

            // Chamar API B8cash para registrar o usuário
            try {
                // Normalizar dados para API (como no Postman que funciona)
                const normalizedName = name.toLowerCase();
                const normalizedPhone = phone.replace(/[\(\)\s\-]/g, ''); // Remove ( ) espaços e traços
                
                console.log('[USER SERVICE] Dados originais:', { name, phone, document });
                console.log('[USER SERVICE] Dados normalizados para API B8Cash:', {
                    document: cleanedDocument,
                    email, 
                    name: normalizedName,
                    phone: normalizedPhone
                });
                
                const b8Response = await this.b8cashService.createUserAccount(cleanedDocument, email, normalizedName, normalizedPhone);
                console.log('Resposta da API B8cash:', b8Response); // Log estratégico

                // Se sucesso = true, usuário foi criado com sucesso
                if (b8Response.success) {
                    return {
                        id: user.id,
                        name: user.name,
                        email: user.email,
                        phone: user.phoneNumber,
                        document: user.document,
                        documentType: documentType,
                        isNewUser,
                        message: isNewUser ? 'Usuário criado com sucesso' : 'Usuário já existe',
                        success: true
                    };
                } else {
                    // Se sucesso = false, usuário precisa fazer KYC
                    // Retornar dados de KYC para o frontend com informações do usuário local
                    return {
                        success: false,
                        message: b8Response.message,
                        data: b8Response.data,
                        requiresKyc: true,
                        user: {
                            id: user.id,
                            name: user.name,
                            email: user.email,
                            document: user.document,
                            documentType: documentType,
                            phone: user.phoneNumber
                        },
                        kycUrl: b8Response.data?.url,
                        userId: b8Response.data?.userId
                    };
                }
            } catch (b8Error) {
                console.error('Erro na API B8cash:', b8Error.message);
                // Se houve erro na API B8cash mas o usuário foi criado localmente, deletar o usuário local
                if (isNewUser) {
                    await prisma.user.delete({
                        where: { id: user.id },
                    });
                    console.log('Usuário deletado do banco de dados após falha na API B8cash');
                }
                throw new Error(`Erro ao processar a requisição na API B8cash: ${b8Error.message}`);
            }

        } catch (error) {
            console.error('Erro ao criar usuário:', error.message);
            
            // Verificar se o erro é de e-mail duplicado
            if (error.code === 'P2002' && error.meta?.target?.includes('email')) {
                console.warn('Tentativa de criar usuário com e-mail duplicado:', email); // Log de aviso
                throw new Error('Este e-mail já está em uso.');
            }
            
            throw error; // Propagar o erro original
        }
    }

    // Buscar usuário pelo documento
    async getUserByDocument(document) {
        try {
            // Limpar documento antes de buscar
            const cleanedDocument = cleanDocument(document);
            
            if (!isValidDocument(cleanedDocument)) {
                throw new Error('CPF ou CNPJ inválido');
            }
            
            const user = await prisma.user.findFirst({
                where: {
                    document: cleanedDocument,
                },
                include: {
                    accounts: true
                }
            });

            if (!user) {
                throw new Error('Usuário não encontrado.');
            }

            return user;
        } catch (error) {
            console.error('Erro ao buscar usuário por documento:', error.message);
            throw new Error('Não foi possível buscar o usuário.');
        }
    }

    // Buscar usuário pelo e-mail (manter para compatibilidade)
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

    // Salvar dados bancários do usuário
    async saveAccountData(userId, accountData) {
        try {
            // Verificar se já existe uma conta para este usuário
            const existingAccount = await prisma.account.findFirst({
                where: {
                    userId: userId,
                    accountNumber: accountData.accountNumber
                }
            });

            if (existingAccount) {
                // Atualizar conta existente
                return await prisma.account.update({
                    where: { id: existingAccount.id },
                    data: {
                        bankNumber: accountData.bankNumber,
                        agencyNumber: accountData.agencyNumber,
                        agencyDigit: accountData.agencyDigit,
                        accountNumber: accountData.accountNumber,
                        accountDigit: accountData.accountDigit,
                        status: accountData.status,
                        accountType: 'corrente', // Padrão
                        balance: 0 // Será atualizado via getAccountBalance
                    }
                });
            } else {
                // Criar nova conta
                return await prisma.account.create({
                    data: {
                        userId: userId,
                        bankNumber: accountData.bankNumber,
                        agencyNumber: accountData.agencyNumber,
                        agencyDigit: accountData.agencyDigit,
                        accountNumber: accountData.accountNumber,
                        accountDigit: accountData.accountDigit,
                        status: accountData.status,
                        accountType: 'corrente', // Padrão
                        balance: 0 // Será atualizado via getAccountBalance
                    }
                });
            }
        } catch (error) {
            console.error('Erro ao salvar dados bancários:', error.message);
            throw new Error('Não foi possível salvar os dados bancários.');
        }
    }

    // Buscar dados bancários do usuário (para verificar se já existem)
    async getUserAccountData(userId) {
        try {
            const account = await prisma.account.findFirst({
                where: {
                    userId: userId
                }
            });

            return account; // Retorna null se não encontrar
        } catch (error) {
            console.error('Erro ao buscar dados bancários do usuário:', error.message);
            return null; // Retorna null em caso de erro para não quebrar o fluxo
        }
    }
}

module.exports = new UserService();
