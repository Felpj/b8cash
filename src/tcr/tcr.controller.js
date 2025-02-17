const TcrService = require('./tcr.service');

class TcrController {
  constructor() {
    this.tcrService = new TcrService();
  }

  // Método para enviar PIX
  async sendPix(req, res) {
    const accountNumber = req.headers['account-number']; // Lê o ACCOUNT-NUMBER do header
    const { destinationKey, amount } = req.body;

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
      const result = await this.tcrService.sendPix(accountNumber, destinationKey, amount);
      res.status(200).json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  // Método para enviar TED
  async sendTed(req, res) {
    const accountNumber = req.headers['account-number']; // Lê o ACCOUNT-NUMBER do header
    const { destination, amount } = req.body;

    try {
      // Validação dos parâmetros obrigatórios
      if (!accountNumber || !destination || !amount ) {
        return res.status(400).json({ error: 'Parâmetros insuficientes para enviar TED.' });
      }

      // Chama o serviço para enviar TED
      const result = await this.tcrService.sendTed(accountNumber, destination, amount);
      res.status(200).json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  // Método para gerar uma nova chave PIX
  async generatePixKey(req, res) {
    const accountNumber = req.headers['account-number']; // Obtém o número da conta do header
    const { keyType } = req.body;

    try {
      // Validação do parâmetro obrigatório
      if (!accountNumber) {
        return res.status(400).json({
          error: 'O cabeçalho ACCOUNT-NUMBER é obrigatório para gerar uma chave PIX.',
        });
      }

      // Chama o serviço para gerar a chave PIX
      const result = await this.tcrService.generatePixKey(accountNumber, keyType);
      res.status(200).json(result);
    } catch (error) {
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
      const result = await this.tcrService.createUserAccount(document, email, name, phone);
      res.status(200).json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  // Método para consultar todas as transações
  async getTransactions(req, res) {
    //console.log(req, res,'[getTransactions] Iniciando consulta de transações');
    const accountNumber = req.headers['account-number']; // Obtém o número da conta do header

    try {
      // Validação do parâmetro obrigatório
      if (!accountNumber) {
        return res.status(400).json({
          error: 'O cabeçalho ACCOUNT-NUMBER é obrigatório para consultar as transações.',
        });
      }

      // Chama o serviço para consultar transações
      const result = await this.tcrService.getTransactions(accountNumber);
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
      const result = await this.tcrService.getAccountData(accountNumber, document);
      res.status(200).json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

   // Método para consultar informações de uma chave PIX
   async getKeyData(req, res) {
    const { key } = req.query; // Obtém o parâmetro `key` da URL

    try {
      // Validação do parâmetro obrigatório
      if (!key) {
        return res.status(400).json({
          error: 'O parâmetro "key" é obrigatório para consultar informações de uma chave PIX.',
        });
      }

      // Chama o serviço para consultar a chave PIX
      const result = await this.tcrService.getKeyData(key);
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
      const result = await this.tcrService.getAccountPixKeys(accountNumber);
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
      const result = await this.tcrService.getAccountBalance(accountNumber);
      res.status(200).json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
}

module.exports = TcrController;
