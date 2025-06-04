const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const userService = require('../user/user.service');
const B8cashService = require('../b8cash-api/b8cash.service');
const { isValidDocument, cleanDocument } = require('../utils/documentValidation');


class AuthService {
  constructor() {
    this.b8cashService = new B8cashService();
  }

  // Função de login usando documento
  async login(document, password) {
    try {
      // Limpar e validar documento
      const cleanedDocument = cleanDocument(document);
      
      if (!isValidDocument(cleanedDocument)) {
        throw new Error('CPF ou CNPJ inválido');
      }
      
      console.log(`Documento validado para login: ${cleanedDocument}`);
      
      // Busca o usuário pelo documento limpo
      const user = await userService.getUserByDocument(cleanedDocument);

      if (!user) {
        throw new Error('Usuário não encontrado.');
      }

      // Verifica se a senha fornecida é válida
      const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
      if (!isPasswordValid) {
        throw new Error('Credenciais inválidas.');
      }

      // 🔍 VERIFICAR SE JÁ TEM DADOS BANCÁRIOS SALVOS LOCALMENTE
      const existingAccount = await userService.getUserAccountData(user.id);
      
      if (existingAccount) {
        // ✅ DADOS JÁ EXISTEM - LOGIN NORMAL COM TOKEN COMPLETO
        console.log('Dados bancários encontrados localmente. Login normal.');
        
        // Gera o token JWT com dados bancários incluídos
        const token = jwt.sign(
          { 
            id: user.id, 
            document: user.document, 
            email: user.email,
            account: {
              accountNumber: existingAccount.accountNumber,
              accountDigit: existingAccount.accountDigit,
              agencyNumber: existingAccount.agencyNumber,
              agencyDigit: existingAccount.agencyDigit,
              bankNumber: existingAccount.bankNumber,
              status: existingAccount.status
            }
          },
          process.env.JWT_SECRET,
          { expiresIn: '100h' }
        );

        return {
          token,
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            document: user.document,
            account: {
              accountNumber: existingAccount.accountNumber,
              accountDigit: existingAccount.accountDigit,
              agencyNumber: existingAccount.agencyNumber,
              agencyDigit: existingAccount.agencyDigit,
              bankNumber: existingAccount.bankNumber,
              status: existingAccount.status
            }
          },
        };
      } else {
        // ❌ PRIMEIRO LOGIN - BUSCAR E SALVAR DADOS BANCÁRIOS
        console.log('Primeiro login detectado. Buscando dados bancários...');
        
        const masterAccountNumber = process.env.B8_MASTER_ACCOUNT_NUMBER;
        if (!masterAccountNumber) {
          throw new Error('Conta mestre não configurada. Entre em contato com o suporte.');
        }

        try {
          const accountDataResponse = await this.b8cashService.getAccountData(masterAccountNumber, cleanedDocument);
          
          console.log('🔍 [DEBUG] Resposta completa da API B8Cash:', JSON.stringify(accountDataResponse, null, 2));
          
          if (accountDataResponse.success && accountDataResponse.data) {
            console.log('🔍 [DEBUG] Dados da API - Array length:', accountDataResponse.data.length);
            console.log('🔍 [DEBUG] Primeiro item do array:', JSON.stringify(accountDataResponse.data[0], null, 2));
            
            // Procurar dados do usuário específico no array
            const userAccountData = accountDataResponse.data.find(account => account.userDocument === cleanedDocument);
            
            console.log('🔍 [DEBUG] Dados encontrados para usuário:', JSON.stringify(userAccountData, null, 2));
            
            if (userAccountData) {
              // 💾 SALVAR DADOS BANCÁRIOS NO BANCO LOCAL
              await userService.saveAccountData(user.id, userAccountData);
              console.log('Dados bancários salvos com sucesso para primeiro login:', cleanedDocument);
              
              // 🚨 RETORNA RESPOSTA ESPECIAL INDICANDO PRIMEIRO LOGIN
              return {
                firstLogin: true,
                message: 'Conta configurada com sucesso! Por favor, faça login novamente para acessar o sistema.',
                user: {
                  id: user.id,
                  name: user.name,
                  email: user.email,
                  document: user.document
                }
              };
            } else {
              // Usuário NÃO encontrado = KYC ainda não aprovado
              console.log('Usuário não encontrado na lista de contas ativas. KYC provavelmente pendente:', cleanedDocument);
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
      }
    } catch (error) {
      console.error('Erro no login:', error.message);
      throw new Error(error.message);
    }
  }
}

module.exports = new AuthService();
