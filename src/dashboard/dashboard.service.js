const B8cashService = require('../b8cash-api/b8cash.service');

class DashboardService {
  constructor() {
    this.b8cashService = new B8cashService();
  }

  /**
   * Obtém o saldo disponível na conta
   * @param {string} accountId - Número da conta
   * @returns {Promise<Object>} - Objeto contendo o saldo formatado
   */
  async getSaldoDisponivel(accountId) { 
    try {
      // Chama o método da API B8cash para obter o saldo
      const result = await this.b8cashService.getAccountBalance(accountId);
      
      // Verifica se o resultado contém o saldo
      if (!result || !result.success || !result.data || !result.data.available) {
        throw new Error('Não foi possível obter o saldo da conta');
      }
      
      return {
        saldo: result.data.available,
        accountNumber: accountId
      };
    } catch (error) {
      console.error('Erro ao obter saldo disponível:', error.message);
      throw new Error('Não foi possível obter o saldo disponível da conta');
    }
  }

  /**
   * Obtém o total de entradas e saídas da conta
   * @param {string} accountId - Número da conta
   * @returns {Promise<Object>} - Objeto contendo os totais de entrada e saída
   */
  async getEntradasSaidas(accountId, queryParams = {}) {
    try {
      console.log(`[DashboardService] getEntradasSaidas - Account: ${accountId}, Params: ${JSON.stringify(queryParams)}`);
      // Chama o método da API B8cash para obter as transações, passando os queryParams
      const result = await this.b8cashService.getTransactions(accountId, queryParams);
      
      if (!result || !result.success || !result.transactions || !Array.isArray(result.transactions)) {
        // Retorna zero se não houver transações ou a resposta for inválida, em vez de lançar erro, 
        // para que o dashboard não quebre se não houver dados para o período.
        console.warn('[DashboardService] getEntradasSaidas - Não foi possível obter as transações ou não há transações para o período.');
        return {
          entradas: 0,
          saidas: 0,
          formattedEntradas: `R$ 0,00`,
          formattedSaidas: `R$ 0,00`
        };
      }

      // Filtra e calcula o total de entradas e saídas - SIMPLIFICADO para usar apenas 'side'
      let totalEntradas = 0;
      let totalSaidas = 0;

      result.transactions.forEach(transaction => {
        const amount = parseFloat(transaction.amount);
        
        // Simplifica a lógica: usa apenas o campo 'side' que é mais confiável
        if (transaction.side === 'in') {
          totalEntradas += amount;
        } else if (transaction.side === 'out') {
          totalSaidas += amount;
        }
      });

      return {
        entradas: totalEntradas,
        saidas: totalSaidas,
        formattedEntradas: `R$ ${totalEntradas.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        formattedSaidas: `R$ ${totalSaidas.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      };
    } catch (error) {
      console.error('Erro ao obter entradas e saídas:', error.message);
      throw new Error('Não foi possível obter o total de entradas e saídas da conta');
    }
  }

  /**
   * Obtém os dados para o gráfico de fluxo de caixa por período
   * @param {string} accountId - Número da conta
   * @param {string} periodo - Período para filtro (mes, trimestre, semestre, ano)
   * @returns {Promise<Object>} - Dados para o gráfico de fluxo de caixa nos formatos Guided e Advanced
   */
  async getFluxoCaixa(accountId, queryParams = {}) {
    try {
      console.log(`[DashboardService] getFluxoCaixa - Account: ${accountId}, Params: ${JSON.stringify(queryParams)}`);
      // Se queryParams contiver startDate e endDate, eles serão usados pela chamada à API.
      // A lógica de "periodo" (mês, trimestre) pode ser mantida como fallback ou removida se o front sempre enviar datas.
      // Por ora, a chamada à API usará os queryParams como vierem.
      const result = await this.b8cashService.getTransactions(accountId, queryParams);

      if (!result || !result.success || !result.transactions || !Array.isArray(result.transactions) || result.transactions.length === 0) {
        console.warn('[DashboardService] getFluxoCaixa - Não foi possível obter as transações ou não há transações para o período.');
        return {
          guidedData: [],
          advancedData: { labels: [], datasets: [] },
          periodo: queryParams.periodo || 'N/A', // Indica o período usado se ainda for relevante
          granularidade: 'N/A',
          totalPontos: 0
        };
      }

      
      const transacoesParaProcessar = result.transactions;

      // Determinar o período baseado nos queryParams ou último ano
      let dataInicio, dataFim;
      
      if (queryParams.startDate && queryParams.endDate) {
        // Se as datas foram fornecidas nos filtros, usar elas
        dataInicio = new Date(parseInt(queryParams.startDate) * 1000);
        dataFim = new Date(parseInt(queryParams.endDate) * 1000);
      } else {
        // Senão, usar o último ano ou baseado nas transações
        if (transacoesParaProcessar.length > 0) {
          // Usar as datas das transações como referência
          const timestamps = transacoesParaProcessar.map(t => t.createdTimestamp * 1000);
          dataInicio = new Date(Math.min(...timestamps));
          dataFim = new Date(Math.max(...timestamps));
        } else {
          // Fallback: último ano
          dataFim = new Date();
          dataInicio = new Date();
          dataInicio.setFullYear(dataInicio.getFullYear() - 1);
        }
      }

      console.log(`[DashboardService] getFluxoCaixa - Período: ${dataInicio.toISOString()} até ${dataFim.toISOString()}`);

      // Detectar a granularidade adequada baseada no período
      const granularidade = this.detectarGranularidade(dataInicio, dataFim);
      console.log(`[DashboardService] getFluxoCaixa - Granularidade detectada: ${granularidade}`);

      // Gerar todos os intervalos do período baseado na granularidade
      let todosIntervalos = [];
      switch (granularidade) {
        case 'dia':
          todosIntervalos = this.gerarDiasPeriodo(dataInicio, dataFim);
          break;
        case 'semana':
          todosIntervalos = this.gerarSemanasPeriodo(dataInicio, dataFim);
          break;
        case 'mes':
        default:
          todosIntervalos = this.gerarMesesPeriodo(dataInicio, dataFim);
          break;
      }
      
      // Inicializar dadosPorIntervalo com todos os intervalos do período (valores zero)
      const dadosPorIntervalo = {};
      todosIntervalos.forEach(intervalo => {
        dadosPorIntervalo[intervalo.chave] = {
          entradas: 0,
          saidas: 0,
          label: intervalo.label || intervalo.mes || intervalo.chave,
          chaveOrdenacao: intervalo.chaveOrdenacao
        };
      });

      // Agrupa as transações por intervalo baseado na granularidade
      transacoesParaProcessar.forEach(transaction => {
        const chaveTransacao = this.obterChaveTransacao(transaction, granularidade);
        
        // Só adiciona se o intervalo estiver no período (deveria estar sempre)
        if (dadosPorIntervalo[chaveTransacao]) {
          const amount = parseFloat(transaction.amount);
          
          // Verifica se é entrada usando critérios consistentes
          if (transaction.side === 'in') {
            dadosPorIntervalo[chaveTransacao].entradas += amount;
          } else if (transaction.side === 'out') {
            dadosPorIntervalo[chaveTransacao].saidas += amount;
          }
        }
      });

      // Converte o objeto para array e ordena por data (mais antigo primeiro para o gráfico)
      const dadosFluxoCaixa = Object.values(dadosPorIntervalo).sort((a, b) => {
        return a.chaveOrdenacao.localeCompare(b.chaveOrdenacao);
      });

      console.log(`[DashboardService] getFluxoCaixa - Dados processados (${granularidade}):`, dadosFluxoCaixa);

      // 1. Preparar dados para modo Guided (adequação do array existente)
      const guidedData = dadosFluxoCaixa.map(item => ({
        month: item.label,         // usar o label adequado para cada granularidade
        entradas: item.entradas,   // valor para série "Entradas"
        saidas: item.saidas,       // valor para série "Saídas"
        // Mantenho também os dados originais
        chaveOrdenacao: item.chaveOrdenacao
      }));
      
      console.log(`[DashboardService] getFluxoCaixa - Guided Data (${granularidade}):`, guidedData);
      
      // 2. Preparar dados para modo Advanced
      
      // Extrair labels para o eixo X - usar os labels adequados para cada granularidade
      const labels = dadosFluxoCaixa.map(item => item.label);
      
      // Extrair dados para cada série
      const entradasData = dadosFluxoCaixa.map(item => item.entradas);
      const saidasData = dadosFluxoCaixa.map(item => item.saidas);
      
      console.log(`[DashboardService] getFluxoCaixa - Labels (${granularidade}):`, labels);
      console.log(`[DashboardService] getFluxoCaixa - Entradas (${granularidade}):`, entradasData);
      console.log(`[DashboardService] getFluxoCaixa - Saídas (${granularidade}):`, saidasData);
      
      // Construir datasets
      const datasets = [
        {
          label: 'Entradas',
          data: entradasData,
          backgroundColor: '#4BC0C0', // Verde-azulado
          borderColor: '#4BC0C0',
          fill: false
        },
        {
          label: 'Saídas',
          data: saidasData,
          backgroundColor: '#FF6384', // Rosa
          borderColor: '#FF6384',
          fill: false
        }
      ];
      
      // Configurações do gráfico
      const options = {
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: true,
            position: "top",
            labels: {
              boxWidth: 10,
              usePointStyle: true
            }
          }
        }
      };
      
      // Retornar os dados em ambos os formatos
      return {
        // Dados no formato original (manter compatibilidade)
        dadosFluxoCaixa,
        
        // Dados para modo Guided do WeWeb Charts
        guidedData,
        
        // Dados para modo Advanced do WeWeb Charts
        advancedData: {
          labels,
          datasets,
          options
        },
        
        // Informações sobre o período e granularidade
        periodo: queryParams.periodo || granularidade,
        granularidade: granularidade,
        totalPontos: dadosFluxoCaixa.length
      };
    } catch (error) {
      console.error('Erro ao obter fluxo de caixa:', error.message);
      throw new Error('Não foi possível obter os dados de fluxo de caixa');
    }
  }

  // Método auxiliar para obter o nome do mês a partir do índice
  getNomeMes(indice) {
    const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    return meses[indice];
  }

  // Método auxiliar para obter o índice do mês a partir do nome
  getIndiceMes(nomeMes) {
    const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    return meses.indexOf(nomeMes);
  }

  /**
   * Obtém as transações mais recentes
   * @param {string} accountId - Número da conta
   * @param {Object} queryParams - Parâmetros da query
   * @returns {Promise<Object>} - Lista de transações recentes
   */
  async getTransacoesRecentes(accountId, queryParams = {}) {
    try {
      console.log(`[DashboardService] getTransacoesRecentes - Account: ${accountId}`);
      
      // 1. Buscar TODOS os registros (com limit alto para forçar a API)
      const paramsParaAPI = { 
        ...queryParams,
        limit: 10000 // Limit alto para pegar todos os registros disponíveis
      };
      
      const result = await this.b8cashService.getTransactions(accountId, paramsParaAPI);
      
      if (!result || !result.success || !result.transactions || !Array.isArray(result.transactions)) {
        return {
          transacoes: [],
          total: 0
        };
      }

      console.log(`[DEBUG] Total de registros retornados: ${result.transactions.length}`);
      
      // 2. Ordenar por timestamp decrescente (mais recentes primeiro)
      const transacoesOrdenadas = result.transactions.sort((a, b) => {
        return (b.createdTimestamp || 0) - (a.createdTimestamp || 0);
      });
      
      // 3. Pegar os 5 mais recentes
      const limiteSolicitado = queryParams.limit ? parseInt(queryParams.limit) : 5;
      const transacoesMaisRecentes = transacoesOrdenadas.slice(0, limiteSolicitado);
      
      console.log(`[DEBUG] Selecionados os ${transacoesMaisRecentes.length} mais recentes:`);
      transacoesMaisRecentes.forEach((t, index) => {
        console.log(`[DEBUG] ${index + 1}. ${new Date(t.createdTimestamp * 1000).toLocaleString('pt-BR')} - ${t.type} - R$ ${t.amount}`);
      });

      // 4. Formatar para exibição
      const transacoesFormatadas = transacoesMaisRecentes.map(transaction => {
        const isEntrada = transaction.side === "in";
        const status = isEntrada ? "recebido" : "enviado";
        
        let nome = '';
        if (isEntrada) {
          nome = transaction.from?.name || transaction.from?.userDocument || "Remetente não identificado";
        } else {
          nome = transaction.to?.name || transaction.to?.key || transaction.to?.userDocument || "Destinatário não identificado";
        }

        const formattedAmount = `R$ ${parseFloat(transaction.amount).toLocaleString('pt-BR', { 
          minimumFractionDigits: 2, 
          maximumFractionDigits: 2 
        })}`;

        const dataTransacao = new Date(transaction.createdTimestamp * 1000);
        const formattedDate = dataTransacao.toLocaleDateString('pt-BR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric'
        });
        const formattedTime = dataTransacao.toLocaleTimeString('pt-BR', {
          hour: '2-digit',
          minute: '2-digit'
        });

        let icon = '';
        if (transaction.type === 'pix') {
          icon = 'pix';
        } else if (transaction.type === 'internal') {
          icon = 'transferencia';
        } else if (transaction.type === 'deposit') {
          icon = 'deposito';
        } else if (transaction.type === 'payment') {
          icon = 'pagamento';
        } else {
          icon = isEntrada ? 'entrada' : 'saida';
        }

        return {
          id: transaction.id,
          data: `${formattedDate} às ${formattedTime}`,
          valor: formattedAmount,
          tipo: transaction.type,
          icon: icon,
          status: status,
          nome: nome,
          timestamp: transaction.createdTimestamp,
          balanceAfter: transaction.balanceAfter ? parseFloat(transaction.balanceAfter) : null
        };
      });

      return {
        transacoes: transacoesFormatadas,
        total: transacoesFormatadas.length
      };
    } catch (error) {
      console.error('Erro ao obter transações recentes:', error.message);
      throw new Error('Não foi possível obter as transações recentes');
    }
  }

  /**
   * Obtém transações filtradas
   * @param {string} accountId - Número da conta
   * @param {Object} filtros - Filtros a serem aplicados
   * @param {Date} filtros.dataInicio - Data de início do período
   * @param {Date} filtros.dataFim - Data de fim do período
   * @param {Array} filtros.tipos - Tipos de transação (entrada, saída, ambos)
   * @param {number} filtros.limite - Limite de transações a retornar
   * @param {number} filtros.pagina - Página para paginação
   * @returns {Promise<Object>} - Transações filtradas
   */
  async getFiltrosTransacoes(accountId, filtros = {}) {
    try {
      console.log(`[DashboardService] getFiltrosTransacoes - Account: ${accountId}, Filtros Recebidos: ${JSON.stringify(filtros)}`);
      // Os `filtros` aqui são os que o front-end do dashboard especificamente envia para esta rota.
      // `queryParams` para `b8cashService.getTransactions` devem ser derivados destes filtros.
      const queryParamsForApi = {
        startDate: filtros.dataInicio,
        endDate: filtros.dataFim,
        limit: filtros.limite ? parseInt(filtros.limite) : undefined, // Deixa a API usar default se não especificado
        order: 'desc', // Força ordenação decrescente (mais recentes primeiro) na API
        // O parâmetro "side" da API é mais direto que "tipos: ['entrada', 'saida']"
        // Se filtros.tipos tiver um único valor "entrada" ou "saida", podemos mapear para "side".
        // Se tiver ambos ou for indefinido, não passamos "side" para a API (pega tudo).
      };

      if (filtros.tipos && filtros.tipos.length === 1) {
        if (filtros.tipos[0] === 'entrada') queryParamsForApi.side = 'in';
        if (filtros.tipos[0] === 'saida') queryParamsForApi.side = 'out';
      }

      console.log(`[DashboardService] getFiltrosTransacoes - QueryParams para API: ${JSON.stringify(queryParamsForApi)}`);

      const result = await this.b8cashService.getTransactions(accountId, queryParamsForApi);
      
      if (!result || !result.success || !result.transactions || !Array.isArray(result.transactions)) {
        console.warn('[DashboardService] getFiltrosTransacoes - Não foi possível obter as transações ou não há transações.');
        return {
          transacoes: [],
          paginacao: { total: 0, porPagina: filtros.limite || 10, paginaAtual: filtros.pagina || 1, totalPaginas: 0 },
          filtrosAplicados: filtros
        };
      }

      // A lógica de filtragem adicional (se houver) e paginação do lado do serviço é aplicada aqui sobre o resultado da API.
      let transacoesParaProcessar = [...result.transactions];

      // Se a API não filtrou por `side` (porque `tipos` era `ambos` ou não especificado),
      // e `filtros.tipos` ainda requer filtragem, aplicar aqui.
      if (!queryParamsForApi.side && filtros.tipos && filtros.tipos.length > 0 && !filtros.tipos.includes('ambos')) {
        transacoesParaProcessar = transacoesParaProcessar.filter(transaction => {
          if (filtros.tipos.includes('entrada') && (transaction.side === "in" || transaction.transaction_type === 'entrada' || transaction.transaction_type === 'pix_recebido' || transaction.transaction_type === 'deposito' || transaction.transaction_type === 'transferencia_entrada')) {
            return true;
          }
          if (filtros.tipos.includes('saida') && (transaction.side === "out" || transaction.transaction_type === 'saida' || transaction.transaction_type === 'pix_enviado' || transaction.transaction_type === 'pagamento' || transaction.transaction_type === 'transferencia_saida')) {
            return true;
          }
          return false;
        });
      }

      // ORDENAÇÃO ROBUSTA: Sempre ordena por createdTimestamp decrescente (mais recentes primeiro)
      transacoesParaProcessar.sort((a, b) => {
        const timestampA = a.createdTimestamp || 0;
        const timestampB = b.createdTimestamp || 0;
        return timestampB - timestampA; // Decrescente: mais recente primeiro
      });

      // Paginação no lado do serviço (se a API não paginou ou retornou mais do que o limite da página)
      const limitePaginacao = filtros.limite ? parseInt(filtros.limite) : 10;
      const paginaAtual = filtros.pagina ? parseInt(filtros.pagina) : 1;
      const totalTransacoesFiltradas = transacoesParaProcessar.length;
      const totalPaginas = Math.ceil(totalTransacoesFiltradas / limitePaginacao);
      const indiceInicio = (paginaAtual - 1) * limitePaginacao;
      const transacoesPaginadas = transacoesParaProcessar.slice(indiceInicio, indiceInicio + limitePaginacao);

      // Formata as transações para exibição
      const transacoesFormatadas = transacoesPaginadas.map(transaction => {
        // Verifica se é entrada ou saída
        const isEntrada = transaction.side === "in";
        const status = isEntrada ? "recebido" : "enviado";
        
        // Determina o nome da pessoa envolvida na transação
        let nome = '';
        
        if (isEntrada && transaction.from && transaction.from.name) {
          // Se for recebimento, pega o nome de quem enviou
          nome = transaction.from.name;
        } else if (!isEntrada && transaction.to && transaction.to.name) {
          // Se for envio, pega o nome para quem foi enviado
          nome = transaction.to.name;
        } else if (!isEntrada && transaction.to && transaction.to.key) {
          // Se não tiver nome, mas tiver chave, usa a chave formatada
          const key = transaction.to.key;
          if (key.includes('@')) {
            nome = `E-mail: ${key}`;
          } else if (key.length > 10) {
            nome = `Chave: ${key.substring(0, 8)}...`;
          } else {
            nome = `Chave: ${key}`;
          }
        } else if (isEntrada && transaction.from && transaction.from.userDocument) {
          nome = `CPF/CNPJ: ${transaction.from.userDocument}`;
        } else if (!isEntrada && transaction.to && transaction.to.userDocument) {
          nome = `CPF/CNPJ: ${transaction.to.userDocument}`;
        } else {
          nome = isEntrada ? "Remetente não identificado" : "Destinatário não identificado";
        }

        // Formata o valor
        const formattedAmount = `R$ ${parseFloat(transaction.amount).toLocaleString('pt-BR', { 
          minimumFractionDigits: 2, 
          maximumFractionDigits: 2 
        })}`;

        // Formata a data com horário
        const dataTransacao = new Date(transaction.createdTimestamp * 1000);
        const formattedDate = dataTransacao.toLocaleDateString('pt-BR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric'
        });
        const formattedTime = dataTransacao.toLocaleTimeString('pt-BR', {
          hour: '2-digit',
          minute: '2-digit'
        });

        // Define o ícone com base no tipo de transação
        let icon = '';
        if (transaction.type === 'pix') {
          icon = 'pix';
        } else if (transaction.type === 'transfer' || transaction.type === 'internal') {
          icon = 'transferencia';
        } else if (transaction.type === 'deposit') {
          icon = 'deposito';
        } else if (transaction.type === 'payment') {
          icon = 'pagamento';
        } else {
          icon = isEntrada ? 'entrada' : 'saida';
        }

        return {
          id: transaction.id,
          data: `${formattedDate} às ${formattedTime}`,
          valor: formattedAmount,
          valorNumerico: parseFloat(transaction.amount),
          tipo: transaction.type,
          icon: icon,
          status: status,
          nome: nome,
          // Campos adicionais
          timestamp: transaction.createdTimestamp,
          balanceAfter: transaction.balanceAfter ? parseFloat(transaction.balanceAfter) : null
        };
      });

      return {
        transacoes: transacoesFormatadas,
        paginacao: {
          total: totalTransacoesFiltradas,
          porPagina: limitePaginacao,
          paginaAtual: paginaAtual,
          totalPaginas: totalPaginas
        },
        filtrosAplicados: filtros
      };
    } catch (error) {
      console.error('Erro ao filtrar transações:', error.message);
      throw new Error('Não foi possível filtrar as transações');
    }
  }

  // Método para obter todas as transações da conta
  async getTransactions(accountNumber, queryParams = {}) {
    try {
      console.log(`[DashboardService] getTransactions - Account: ${accountNumber}, Params: ${JSON.stringify(queryParams)}`);
      // Repassa diretamente os queryParams para o b8cashService
      const result = await this.b8cashService.getTransactions(accountNumber, queryParams);
      return result;
    } catch (error) {
      console.error('[DashboardService] Erro em getTransactions:', error.message);
      throw new Error(`Erro ao buscar transações no DashboardService: ${error.message}`);
    }
  }

  // Método para obter o saldo da conta
  async getAccountBalance(accountNumber) {
    try {
      // Chama o método da API B8cash para obter o saldo
      const result = await this.b8cashService.getAccountBalance(accountNumber);
      
      // Verifica se o resultado contém o saldo
      if (!result || !result.success || !result.data || !result.data.available) {
        throw new Error('Não foi possível obter o saldo da conta');
      }
      
      return {
        saldo: result.data.available,
        accountNumber: accountNumber
      };
    } catch (error) {
      console.error('Erro ao obter saldo:', error.message);
      throw new Error('Não foi possível obter o saldo da conta');
    }
  }

  // Método para obter transações recentes
  async getRecentTransactions(accountNumber, queryParams = {}) {
    try {
      console.log(`[DashboardService] getRecentTransactions - Account: ${accountNumber}, Params: ${JSON.stringify(queryParams)}`);
      // Define um limite padrão se não for fornecido, mas permite que outros filtros sejam passados
      const paramsToUse = { limit: queryParams.limit || 5, ...queryParams };
      
      const result = await this.b8cashService.getTransactions(accountNumber, paramsToUse);
      return result;
    } catch (error) {
      console.error('[DashboardService] Erro em getRecentTransactions:', error.message);
      throw new Error(`Erro ao buscar transações recentes no DashboardService: ${error.message}`);
    }
  }

  // Método para obter dados do fluxo de caixa
  async getCashFlow(accountNumber, queryParams = {}) {
    try {
      console.log(`[DashboardService] getCashFlow - Account: ${accountNumber}, Params: ${JSON.stringify(queryParams)}`);
      // Os filtros de período (startDate, endDate) serão usados diretamente pela chamada ao b8cashService
      const transactionsData = await this.b8cashService.getTransactions(accountNumber, queryParams);

      if (!transactionsData || !transactionsData.transactions || transactionsData.transactions.length === 0) {
        return { labels: [], datasets: [] }; // Retorna estrutura vazia se não houver transações
      }

      // A lógica de agregação do fluxo de caixa permanece, mas agora opera sobre dados potencialmente filtrados
      const cashFlow = transactionsData.transactions.reduce((acc, transaction) => {
        const date = new Date(transaction.transactionDate || transaction.createdAt).toLocaleDateString('pt-BR', { month: 'short', day: 'numeric' });
        if (!acc[date]) {
          acc[date] = { entrada: 0, saida: 0 };
        }
        if (transaction.side === 'in' || transaction.transaction_type === 'entrada' || transaction.transaction_type === 'pix_recebido' || transaction.transaction_type === 'deposito' || transaction.transaction_type === 'transferencia_entrada') {
          acc[date].entrada += parseFloat(transaction.amount);
        } else if (transaction.side === 'out' || transaction.transaction_type === 'saida' || transaction.transaction_type === 'pix_enviado' || transaction.transaction_type === 'pagamento' || transaction.transaction_type === 'transferencia_saida') {
          acc[date].saida += parseFloat(transaction.amount);
        }
        return acc;
      }, {});

      const labels = Object.keys(cashFlow);
      const entradas = labels.map(label => cashFlow[label].entrada);
      const saidas = labels.map(label => cashFlow[label].saida);

      return {
        labels,
        datasets: [
          { label: 'Entradas', data: entradas, backgroundColor: 'rgba(75, 192, 192, 0.5)', borderColor: 'rgb(75, 192, 192)', fill: true },
          { label: 'Saídas', data: saidas, backgroundColor: 'rgba(255, 99, 132, 0.5)', borderColor: 'rgb(255, 99, 132)', fill: true },
        ],
      };
    } catch (error) {
      console.error('[DashboardService] Erro em getCashFlow:', error.message);
      throw new Error(`Erro ao calcular dados do fluxo de caixa no DashboardService: ${error.message}`);
    }
  }

  // Método para obter um resumo de entradas e saídas para o dashboard
  async getEntradasSaidasDashboard(accountNumber, queryParams = {}) {
    try {
      console.log(`[DashboardService] getEntradasSaidasDashboard - Account: ${accountNumber}, Params: ${JSON.stringify(queryParams)}`);
      // Os filtros de período (startDate, endDate) serão usados diretamente pela chamada ao b8cashService
      const transactionsData = await this.b8cashService.getTransactions(accountNumber, queryParams);

      if (!transactionsData || !transactionsData.transactions) {
        return { totalEntradas: 0, totalSaidas: 0 };
      }

      let totalEntradas = 0;
      let totalSaidas = 0;

      transactionsData.transactions.forEach(transaction => {
        const amount = parseFloat(transaction.amount);
        if (transaction.side === 'in' || transaction.transaction_type === 'entrada' || transaction.transaction_type === 'pix_recebido' || transaction.transaction_type === 'deposito' || transaction.transaction_type === 'transferencia_entrada') {
          totalEntradas += amount;
        } else if (transaction.side === 'out' || transaction.transaction_type === 'saida' || transaction.transaction_type === 'pix_enviado' || transaction.transaction_type === 'pagamento' || transaction.transaction_type === 'transferencia_saida') {
          totalSaidas += amount;
        }
      });

      return {
        totalEntradas: totalEntradas.toFixed(2),
        totalSaidas: totalSaidas.toFixed(2),
      };
    } catch (error) {
      console.error('[DashboardService] Erro em getEntradasSaidasDashboard:', error.message);
      throw new Error(`Erro ao calcular resumo de entradas/saídas no DashboardService: ${error.message}`);
    }
  }

  // Método auxiliar para gerar todos os meses entre duas datas
  gerarMesesPeriodo(dataInicio, dataFim) {
    const meses = [];
    
    // Garante que as datas sejam objetos Date válidos
    const inicio = new Date(dataInicio);
    const fim = new Date(dataFim);
    
    // Verifica se as datas são válidas
    if (isNaN(inicio.getTime()) || isNaN(fim.getTime())) {
      console.warn('[DashboardService] gerarMesesPeriodo - Datas inválidas:', { dataInicio, dataFim });
      return [];
    }
    
    // Normalizar para o primeiro dia do mês
    inicio.setDate(1);
    inicio.setHours(0, 0, 0, 0);
    fim.setDate(1);
    fim.setHours(0, 0, 0, 0);
    
    const atual = new Date(inicio);
    
    // Limitar a 24 meses para evitar loops infinitos
    let contador = 0;
    const maxMeses = 24;
    
    while (atual <= fim && contador < maxMeses) {
      const ano = atual.getFullYear();
      const mes = atual.getMonth(); // 0-11
      const chave = `${ano}-${String(mes + 1).padStart(2, '0')}`;
      
      meses.push({
        chave,
        ano,
        mes: this.getNomeMes(mes),
        mesNumero: mes + 1,
        chaveOrdenacao: `${ano}${String(mes + 1).padStart(2, '0')}`
      });
      
      // Avançar para o próximo mês
      atual.setMonth(atual.getMonth() + 1);
      contador++;
    }
    
    console.log(`[DashboardService] gerarMesesPeriodo - Gerados ${meses.length} meses:`, meses.map(m => m.chave));
    return meses;
  }

  // Método auxiliar para detectar a melhor granularidade baseada no período
  detectarGranularidade(dataInicio, dataFim) {
    const diffMs = dataFim.getTime() - dataInicio.getTime();
    const diffDias = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDias <= 7) {
      return 'dia';
    } else if (diffDias <= 60) {
      return 'semana';
    } else {
      return 'mes';
    }
  }

  // Método auxiliar para gerar intervalos por dia
  gerarDiasPeriodo(dataInicio, dataFim) {
    const dias = [];
    const inicio = new Date(dataInicio);
    const fim = new Date(dataFim);
    
    // Normalizar horários
    inicio.setHours(0, 0, 0, 0);
    fim.setHours(23, 59, 59, 999);
    
    const atual = new Date(inicio);
    let contador = 0;
    const maxDias = 90; // Limite de segurança
    
    while (atual <= fim && contador < maxDias) {
      const chave = atual.toISOString().split('T')[0]; // Formato: 2025-01-22
      const label = atual.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }); // 22 Jan
      
      dias.push({
        chave,
        label,
        ano: atual.getFullYear(),
        mes: atual.getMonth() + 1,
        dia: atual.getDate(),
        chaveOrdenacao: chave
      });
      
      atual.setDate(atual.getDate() + 1);
      contador++;
    }
    
    console.log(`[DashboardService] gerarDiasPeriodo - Gerados ${dias.length} dias:`, dias.map(d => d.chave));
    return dias;
  }

  // Método auxiliar para gerar intervalos por semana
  gerarSemanasPeriodo(dataInicio, dataFim) {
    const semanas = [];
    const inicio = new Date(dataInicio);
    const fim = new Date(dataFim);
    
    // Ajustar para começar na segunda-feira da primeira semana
    const diaSemana = inicio.getDay();
    const diasParaSegunda = diaSemana === 0 ? 6 : diaSemana - 1;
    inicio.setDate(inicio.getDate() - diasParaSegunda);
    inicio.setHours(0, 0, 0, 0);
    
    let atual = new Date(inicio);
    let contador = 0;
    const maxSemanas = 20; // Limite de segurança
    
    while (atual <= fim && contador < maxSemanas) {
      const fimSemana = new Date(atual);
      fimSemana.setDate(fimSemana.getDate() + 6);
      
      const chave = `${atual.toISOString().split('T')[0]}_${fimSemana.toISOString().split('T')[0]}`;
      const label = `${atual.getDate().toString().padStart(2, '0')}/${(atual.getMonth() + 1).toString().padStart(2, '0')}`;
      
      semanas.push({
        chave,
        label,
        dataInicio: new Date(atual),
        dataFim: new Date(fimSemana),
        ano: atual.getFullYear(),
        semana: Math.ceil((atual.getDate() + atual.getDay()) / 7),
        chaveOrdenacao: atual.toISOString().split('T')[0]
      });
      
      atual.setDate(atual.getDate() + 7);
      contador++;
    }
    
    console.log(`[DashboardService] gerarSemanasPeriodo - Geradas ${semanas.length} semanas:`, semanas.map(s => s.chave));
    return semanas;
  }

  // Método auxiliar para obter a chave de classificação da transação baseada na granularidade
  obterChaveTransacao(transaction, granularidade) {
    const dataTransacao = new Date(transaction.createdTimestamp * 1000);
    
    switch (granularidade) {
      case 'dia':
        return dataTransacao.toISOString().split('T')[0]; // 2025-01-22
      
      case 'semana':
        // Encontrar a segunda-feira da semana
        const diaSemana = dataTransacao.getDay();
        const diasParaSegunda = diaSemana === 0 ? 6 : diaSemana - 1;
        const segundaFeira = new Date(dataTransacao);
        segundaFeira.setDate(segundaFeira.getDate() - diasParaSegunda);
        
        const domingo = new Date(segundaFeira);
        domingo.setDate(domingo.getDate() + 6);
        
        return `${segundaFeira.toISOString().split('T')[0]}_${domingo.toISOString().split('T')[0]}`;
      
      case 'mes':
      default:
        const ano = dataTransacao.getFullYear();
        const mes = dataTransacao.getMonth() + 1;
        return `${ano}-${String(mes).padStart(2, '0')}`;
    }
  }
}

module.exports = DashboardService;




