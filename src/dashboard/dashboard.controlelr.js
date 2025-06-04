const DashboardService = require('./dashboard.service');

class DashboardController {
  constructor() {
    this.dashboardService = new DashboardService();
  }

  /**
   * Obtém o saldo disponível da conta
   * @param {Object} req - Objeto de requisição
   * @param {Object} res - Objeto de resposta
   */
  async getSaldoDisponivel(req, res) {
    try {
      const accountNumber = req.accountNumber;
      const userDocument = req.user.document;

      if (!accountNumber) {
        return res.status(400).json({
          success: false,
          error: 'Dados bancários não encontrados. Faça login novamente.'
        });
      }

      const result = await this.dashboardService.getSaldoDisponivel(accountNumber, userDocument);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      console.error(`[DashboardController] Erro em getSaldoDisponivel:`, error.message);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * Obtém o total de entradas e saídas da conta
   * @param {Object} req - Objeto de requisição
   * @param {Object} res - Objeto de resposta
   */
  async getEntradasSaidas(req, res) {
    try {
      const accountNumber = req.accountNumber;
      const userDocument = req.user.document;
      const queryParams = req.query;

      if (!accountNumber) {
        return res.status(400).json({
          success: false,
          error: 'Dados bancários não encontrados. Faça login novamente.'
        });
      }

      const result = await this.dashboardService.getEntradasSaidas(accountNumber, userDocument, queryParams);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      console.error(`[DashboardController] Erro em getEntradasSaidas:`, error.message);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * Obtém os dados para o gráfico de fluxo de caixa
   * @param {Object} req - Objeto de requisição
   * @param {Object} res - Objeto de resposta
   */
  async getFluxoCaixa(req, res) {
    try {
      // accountNumber e userDocument vêm automaticamente do middleware de autenticação
      const accountNumber = req.accountNumber;
      const userDocument = req.user.document;

      if (!accountNumber) {
        return res.status(400).json({ 
          success: false, 
          error: 'Dados bancários não encontrados. Faça login novamente.' 
        });
      }

      const data = await this.dashboardService.getFluxoCaixa(accountNumber, userDocument, req.query);
      res.status(200).json({ success: true, data });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * Obtém as transações mais recentes
   * @param {Object} req - Objeto de requisição
   * @param {Object} res - Objeto de resposta
   */
  async getTransacoesRecentes(req, res) {
    try {
      // accountNumber e userDocument vêm automaticamente do middleware de autenticação
      const accountNumber = req.accountNumber;
      const userDocument = req.user.document;
      const queryParams = req.query; // Captura todos os query params (incluindo limit, etc.)

      if (!accountNumber) {
        return res.status(400).json({
          success: false,
          error: 'Dados bancários não encontrados. Faça login novamente.'
        });
      }

      // Passa userDocument e queryParams para o serviço. O limite padrão será tratado no service se não vier em queryParams.
      const result = await this.dashboardService.getTransacoesRecentes(accountNumber, userDocument, queryParams);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * Obtém transações filtradas
   * @param {Object} req - Objeto de requisição
   * @param {Object} res - Objeto de resposta
   */
  async getFiltrosTransacoes(req, res) {
    try {
      // accountNumber vem automaticamente do middleware de autenticação
      const accountNumber = req.accountNumber;
      const { dataInicio, dataFim, tipos, limite, pagina } = req.query;

      if (!accountNumber) {
        return res.status(400).json({
          success: false,
          error: 'Dados bancários não encontrados. Faça login novamente.'
        });
      }

      // Prepara os filtros
      const filtros = {
        dataInicio,
        dataFim,
        tipos: tipos ? tipos.split(',') : ['entrada', 'saida'],
        limite: limite ? parseInt(limite) : 10,
        pagina: pagina ? parseInt(pagina) : 1
      };

      const result = await this.dashboardService.getFiltrosTransacoes(accountNumber, filtros);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  // Método para obter dados de um usuário específico
  // ... existing code ...
}

module.exports = DashboardController;
