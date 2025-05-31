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
    const accountNumber = req.headers['account-number'];

    try {
      if (!accountNumber) {
        return res.status(400).json({
          error: 'O cabeçalho ACCOUNT-NUMBER é obrigatório para consultar o saldo disponível.'
        });
      }

      const result = await this.dashboardService.getSaldoDisponivel(accountNumber);
      res.status(200).json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Obtém o total de entradas e saídas da conta
   * @param {Object} req - Objeto de requisição
   * @param {Object} res - Objeto de resposta
   */
  async getEntradasSaidas(req, res) {
    const accountNumber = req.headers['account-number'];
    const queryParams = req.query; // Captura todos os query params

    try {
      if (!accountNumber) {
        return res.status(400).json({
          error: 'O cabeçalho ACCOUNT-NUMBER é obrigatório para consultar entradas e saídas.'
        });
      }
      // Passa queryParams para o serviço
      const result = await this.dashboardService.getEntradasSaidas(accountNumber, queryParams);
      res.status(200).json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Obtém os dados para o gráfico de fluxo de caixa
   * @param {Object} req - Objeto de requisição
   * @param {Object} res - Objeto de resposta
   */
// controller ─ rota GET /fluxo-caixa
async getFluxoCaixa(req, res) {
  const accountNumber = req.headers['account-number'];
  if (!accountNumber) {
    return res.status(400).json({ error: 'Cabeçalho ACCOUNT-NUMBER é obrigatório.' });
  }

  try {
    const data = await this.dashboardService.getFluxoCaixa(accountNumber, req.query);
    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}


  /**
   * Obtém as transações mais recentes
   * @param {Object} req - Objeto de requisição
   * @param {Object} res - Objeto de resposta
   */
  async getTransacoesRecentes(req, res) {
    const accountNumber = req.headers['account-number'];
    const queryParams = req.query; // Captura todos os query params (incluindo limit, etc.)

    try {
      if (!accountNumber) {
        return res.status(400).json({
          error: 'O cabeçalho ACCOUNT-NUMBER é obrigatório para consultar transações recentes.'
        });
      }
      // Passa queryParams para o serviço. O limite padrão será tratado no service se não vier em queryParams.
      const result = await this.dashboardService.getTransacoesRecentes(accountNumber, queryParams);
      res.status(200).json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Obtém transações filtradas
   * @param {Object} req - Objeto de requisição
   * @param {Object} res - Objeto de resposta
   */
  async getFiltrosTransacoes(req, res) {
    const accountNumber = req.headers['account-number'];
    const { dataInicio, dataFim, tipos, limite, pagina } = req.query;

    try {
      if (!accountNumber) {
        return res.status(400).json({
          error: 'O cabeçalho ACCOUNT-NUMBER é obrigatório para filtrar transações.'
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
      res.status(200).json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  // Método para obter dados de um usuário específico
  // ... existing code ...
}

module.exports = DashboardController;
