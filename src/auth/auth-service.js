const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const userService = require('../user/user.service');
const B8cashService = require('../b8cash-api/b8cash.service');


class AuthService {
  constructor() {
    this.b8cashService = new B8cashService();
  }

  // Função de login usando documento
  async login(document, password) {
    try {
      // Busca o usuário pelo documento
      const user = await userService.getUserByDocument(document);

      if (!user) {
        throw new Error('Usuário não encontrado.');
      }

      // Verifica se a senha fornecida é válida
      const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
      if (!isPasswordValid) {
        throw new Error('Credenciais inválidas.');
      }

      // Buscar dados bancários na API B8Cash usando conta mestre
      const masterAccountNumber = process.env.B8_MASTER_ACCOUNT_NUMBER;
      if (!masterAccountNumber) {
        throw new Error('Conta mestre não configurada. Entre em contato com o suporte.');
      }

      try {
        const accountDataResponse = await this.b8cashService.getAccountData(masterAccountNumber, document);
        
        if (accountDataResponse.success && accountDataResponse.data) {
          // Procurar dados do usuário específico no array
          const userAccountData = accountDataResponse.data.find(account => account.userDocument === document);
          
          if (userAccountData) {
            // Usuário encontrado = KYC aprovado e conta criada
            // Salvar dados bancários no banco local
            await userService.saveAccountData(user.id, userAccountData);
            console.log('Dados bancários salvos com sucesso para o usuário:', document);
          } else {
            // Usuário NÃO encontrado = KYC ainda não aprovado
            console.log('Usuário não encontrado na lista de contas ativas. KYC provavelmente pendente:', document);
            throw new Error('Sua conta ainda está sendo processada. Verifique se você completou o processo de verificação de identidade (KYC). Se já completou, aguarde alguns minutos e tente novamente.');
          }
        } else {
          throw new Error('Erro ao consultar dados da conta. Tente novamente em alguns minutos.');
        }
      } catch (accountError) {
        console.error('Erro ao buscar dados bancários:', accountError.message);
        // Se for o erro específico de KYC, propagar a mensagem
        if (accountError.message.includes('verificação de identidade') || 
            accountError.message.includes('sendo processada')) {
          throw accountError;
        }
        // Para outros erros, mensagem genérica
        throw new Error('Não foi possível verificar sua conta no momento. Tente novamente em alguns minutos.');
      }

      // Gera o token JWT
      const token = jwt.sign(
        { id: user.id, document: user.document, email: user.email },
        process.env.JWT_SECRET,
        { expiresIn: '100h' }
      );

      // Retorna o token e os dados do usuário (sem a senha)
      return {
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          document: user.document,
        },
      };
    } catch (error) {
      console.error('Erro no login:', error.message);
      throw new Error(error.message);
    }
  }
}

module.exports = new AuthService();
