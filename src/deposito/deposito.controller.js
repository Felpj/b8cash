const DepositoService = require('./deposito.service');

class DepositoController {
  constructor() {
    this.depositoService = new DepositoService();
  }

  // Método para gerar QR Code para depósito via PIX
  async generateQrCode(req, res) {
    const accountNumber = req.headers['account-number'];
    const { amount } = req.body;

    try {
      // Validação dos parâmetros obrigatórios
      if (!accountNumber) {
        return res.status(400).json({ error: 'O cabeçalho ACCOUNT-NUMBER é obrigatório.' });
      }

      if (!amount || typeof amount !== 'number' || amount <= 0) {
        return res.status(400).json({ error: 'O valor deve ser um número positivo.' });
      }

      // Chamar o serviço para gerar QR Code
      const result = await this.depositoService.generateQrCode(accountNumber, amount);
      res.status(200).json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  // Método para obter chaves PIX cadastradas
  async getPixKeys(req, res) {
    const accountNumber = req.headers['account-number'];

    try {
      // Validação do parâmetro obrigatório
      if (!accountNumber) {
        return res.status(400).json({ error: 'O cabeçalho ACCOUNT-NUMBER é obrigatório.' });
      }

      // Chamar o serviço para obter chaves PIX
      const result = await this.depositoService.getPixKeys(accountNumber);
      res.status(200).json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  // Método para gerar boleto para depósito
  async generateBoleto(req, res) {
    const accountNumber = req.headers['account-number'];
    const { amount } = req.body;

    try {
      // Validação dos parâmetros obrigatórios
      if (!accountNumber) {
        return res.status(400).json({ error: 'O cabeçalho ACCOUNT-NUMBER é obrigatório.' });
      }

      if (!amount || typeof amount !== 'number' || amount <= 0) {
        return res.status(400).json({ error: 'O valor deve ser um número positivo.' });
      }

      // Chamar o serviço para gerar boleto
      const result = await this.depositoService.generateBoleto(accountNumber, amount);
      res.status(200).json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
}

module.exports = DepositoController;
