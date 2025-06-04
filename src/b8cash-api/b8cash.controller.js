const B8cashService = require('./b8cash.service');

class B8cashController {
  constructor() {
    this.b8cashService = new B8cashService();
  }

  // Método para enviar PIX
  async sendPix(req, res) {
    const accountNumber = req.headers['account-number']; // Lê o ACCOUNT-NUMBER do header
    const { destination: { key: destinationKey }, amount } = req.body;

    try {
      // Validação dos parâmetros obrigatórios
      if (!accountNumber || !destinationKey || !amount) {
        return res.status(400).json({ error: 'Parâmetros insuficientes para enviar PIX.' });
      }

      // Verificação adicional para valores válidos
      if (typeof amount !== 'number' || amount <= 0) {
        return res.status(400).json({ error: 'O valor deve ser um número positivo.' });
      }

      // Chama o serviço para enviar PIX
      const result = await this.b8cashService.sendPix(accountNumber, destinationKey, amount);
      res.status(200).json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  // Método para enviar TED
  async sendTed(req, res) {
    const accountNumber = req.headers['account-number']; // Lê o ACCOUNT-NUMBER do header
    const { destination, amount } = req.body;

    console.log('[B8CASH CONTROLLER] sendTed - Payload recebido:', {
      accountNumber,
      destination,
      amount,
      bodyKeys: Object.keys(req.body),
      destinationKeys: destination ? Object.keys(destination) : 'destination é null/undefined'
    });

    console.log('[B8CASH CONTROLLER] sendTed - Verificação detalhada do destination:', {
      hasDestination: !!destination,
      destinationType: typeof destination,
      hasDocument: destination ? !!destination.document : false,
      documentValue: destination ? `"${destination.document}"` : 'N/A',
      documentLength: destination?.document?.length || 0,
      documentType: destination ? typeof destination.document : 'N/A',
      observacao: 'IMPORTANTE: API B8Cash espera userDocument, não document'
    });

    try {
      // Validação dos parâmetros obrigatórios
      if (!accountNumber || !destination || !amount) {
        return res.status(400).json({ error: 'Parâmetros insuficientes para enviar TED.' });
      }

      // Validação da estrutura do destination conforme documentação B8Cash
      // IMPORTANTE: A API B8Cash processa internamente 'document' como 'userDocument'
      const requiredDestinationFields = [
        'document', 'name', 'bankNumber', 'agencyNumber', 
        'agencyDigit', 'accountNumber', 'accountDigit', 'accountType'
      ];
      
      for (const field of requiredDestinationFields) {
        if (!destination[field]) {
          console.log(`[B8CASH CONTROLLER] Campo ausente: ${field} = "${destination[field]}"`);
          return res.status(400).json({ 
            error: `Campo obrigatório ausente em destination: ${field}` 
          });
        }
      }

      // Verificação adicional para valores válidos
      if (typeof amount !== 'number' || amount <= 0) {
        return res.status(400).json({ error: 'O valor deve ser um número positivo.' });
      }

      console.log('[B8CASH CONTROLLER] sendTed - Enviando para B8cashService com document mapeado para userDocument');

      // Chama o serviço para enviar TED
      const result = await this.b8cashService.sendTed(accountNumber, destination, amount);
      res.status(200).json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  // Método para gerar uma nova chave PIX
  async generatePixKey(req, res) {
    const accountNumber = req.headers['account-number']; // Obtém o número da conta do header
    const { keyType, key } = req.body; // Alterado para extrair key e keyType

    try {
      // Validação do parâmetro obrigatório
      if (!accountNumber) {
        return res.status(400).json({
          error: 'O cabeçalho ACCOUNT-NUMBER é obrigatório para gerar uma chave PIX.',
        });
      }
      
      // Validação para keyType
      if (!keyType) {
        return res.status(400).json({
          error: 'O parâmetro keyType é obrigatório.',
        });
      }
      
      // CORRIGIDO: Validação para key - obrigatório apenas para tipos específicos
      // Para chaves aleatórias (evp), o key é opcional (será gerado automaticamente)
      const tiposQueRequeremKey = ['celular', 'email', 'cpf', 'cnpj', 'phone'];
      
      if (tiposQueRequeremKey.includes(keyType.toLowerCase()) && !key) {
        return res.status(400).json({
          error: `O parâmetro key é obrigatório para o tipo de chave "${keyType}".`,
        });
      }

      console.log(`[B8cashController] generatePixKey - Account: ${accountNumber}, KeyType: ${keyType}, Key: ${key || 'AUTO-GENERATED'}`);

      // Chama o serviço para gerar a chave PIX, passando accountNumber, keyType e key
      const result = await this.b8cashService.generatePixKey(accountNumber, keyType, key);
      res.status(200).json(result);
    } catch (error) {
      console.error(`[B8cashController] Erro em generatePixKey:`, error.message);
      res.status(500).json({ error: error.message });
    }
  }

   // Método para criar uma nova conta de usuário
   async createUserAccount(req, res) {
    const { document, email, name, phone } = req.body;

    try {
      // Validação dos parâmetros obrigatórios
      if (!document || !email || !name || !phone) {
        return res.status(400).json({
          error: 'Parâmetros insuficientes. Certifique-se de enviar document, email e name.',
        });
      }

      // Chama o serviço para criar a conta de usuário
      const result = await this.b8cashService.createUserAccount(document, email, name, phone);
      res.status(200).json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  // Método para consultar todas as transações
  async getTransactions(req, res) {
    //console.log(req, res,'[getTransactions] Iniciando consulta de transações');
    const accountNumber = req.headers['account-number']; // Obtém o número da conta do header
    const { startDate, endDate, limit, order, userDocument, side } = req.query; // Obtém os query params

    try {
      // Validação do parâmetro obrigatório
      if (!accountNumber) {
        return res.status(400).json({
          error: 'O cabeçalho ACCOUNT-NUMBER é obrigatório para consultar as transações.',
        });
      }

      // Chama o serviço para consultar transações
      const result = await this.b8cashService.getTransactions(
        accountNumber,
        { startDate, endDate, limit, order, userDocument, side } // Passa os query params para o serviço
      );
      console.log(result,'[getTransactions] Resultado da consulta de transações');
      res.status(200).json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  // Método para consultar informações da conta
  async getAccountData(req, res) {
    const accountNumber = req.headers['account-number']; // Obtém o número da conta do header
    const { document } = req.query; // Obtém o parâmetro `document` da URL

    try {
      // Validação do cabeçalho obrigatório
      if (!accountNumber) {
        return res.status(400).json({
          error: 'O cabeçalho ACCOUNT-NUMBER é obrigatório para consultar informações da conta.',
        });
      }

      // Chama o serviço para consultar informações da conta
      const result = await this.b8cashService.getAccountData(accountNumber, document);
      res.status(200).json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }


  // Método para consultar todas as chaves PIX da conta
  async getAccountPixKeys(req, res) {
    const accountNumber = req.headers['account-number']; // Obtém o número da conta do header

    try {
      // Validação do cabeçalho obrigatório
      if (!accountNumber) {
        return res.status(400).json({
          error: 'O cabeçalho ACCOUNT-NUMBER é obrigatório para consultar as chaves PIX.',
        });
      }

      // Chama o serviço para consultar as chaves PIX
      const result = await this.b8cashService.getAccountPixKeys(accountNumber);
      res.status(200).json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

   // Método para consultar o saldo da conta
   async getAccountBalance(req, res) {
    const accountNumber = req.headers['account-number']; // Obtém o número da conta do header

    try {
      // Validação do cabeçalho obrigatório
      if (!accountNumber) {
        return res.status(400).json({
          error: 'O cabeçalho ACCOUNT-NUMBER é obrigatório para consultar o saldo.',
        });
      }

      // Chama o serviço para consultar o saldo
      const result = await this.b8cashService.getAccountBalance(accountNumber);
      res.status(200).json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
  
  // Método para gerar QR Code de depósito
  async generateDepositQrCode(req, res) {
    const accountNumber = req.headers['account-number']; // Obtém o número da conta do header
    const { key, value, id } = req.body;

    try {
      // Validação do cabeçalho obrigatório
      if (!accountNumber) {
        return res.status(400).json({
          error: 'O cabeçalho ACCOUNT-NUMBER é obrigatório para gerar QR Code de depósito.',
        });
      }

      // Validação dos parâmetros obrigatórios
      if (!key || !value || !id) {
        return res.status(400).json({
          error: 'Os parâmetros key, value e id são obrigatórios para gerar QR Code de depósito.',
        });
      }

      // Validação do valor
      if (typeof value !== 'number' || value <= 0) {
        return res.status(400).json({
          error: 'O valor deve ser um número positivo.',
        });
      }

      // Chama o serviço para gerar o QR Code
      const result = await this.b8cashService.generateDepositQrCode(accountNumber, key, value, id);
      res.status(200).json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  // Método para obter informações de uma chave PIX a partir do QR Code
  async getQRCodeData(req, res) {
    const { key } = req.body;

    try {
      // Validação do parâmetro obrigatório
      if (!key) {
        return res.status(400).json({
          error: 'O parâmetro "key" é obrigatório para consultar informações da chave PIX.',
        });
      }

      // Chama o serviço para consultar os dados do QR Code
      const result = await this.b8cashService.getQRCodeData(key);
      res.status(200).json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  // Método para obter informações de uma chave PIX
  async getKeyData(req, res) {
    const accountNumber = req.headers['account-number']; // Obtém o número da conta do header
    const { key } = req.body;

    try {
      // Validação do cabeçalho obrigatório
      if (!accountNumber) {
        return res.status(400).json({
          error: 'O cabeçalho ACCOUNT-NUMBER é obrigatório para consultar informações da chave PIX.',
        });
      }

      // Validação do parâmetro obrigatório
      if (!key) {
        return res.status(400).json({
          error: 'O parâmetro "key" é obrigatório para consultar informações da chave PIX.',
        });
      }

      // Chama o serviço para consultar os dados da chave PIX
      const result = await this.b8cashService.getKeyData(accountNumber, key);
      res.status(200).json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
}

module.exports = B8cashController;
