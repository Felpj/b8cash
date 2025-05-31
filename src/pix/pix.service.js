// Importa a classe B8cashService
const B8cashService = require('../b8cash-api/b8cash.service');

// Cria uma instância do serviço
const b8cashServiceInstance = new B8cashService();


/**
 * Gera uma nova chave PIX
 * @param {string} accountNumber - Número da conta
 * @param {string} keyType - Tipo da chave (cpf, email, celular, aleatoria)
 * @param {string} keyValue - Valor da chave (quando aplicável)
 * @returns {Promise<Object>} Dados da chave PIX gerada
 */
const generatePixKey = async (accountNumber, keyType, keyValue) => {
  try {
    console.log(`[PIX SERVICE] Gerando chave PIX: accountNumber=${accountNumber}, keyType=${keyType}, keyValue=${keyValue || 'N/A'}`);
    
    // Para tipos de chave que necessitam um valor, verificar se foi fornecido
    if ((keyType === 'email' || keyType === 'cpf') && !keyValue) {
      throw new Error(`Para o tipo de chave "${keyType}" é necessário informar o valor da chave.`);
    }
    
    // Utiliza o serviço B8cash para gerar chave PIX
    return await b8cashServiceInstance.generatePixKey(accountNumber, keyType, keyValue);
  } catch (error) {
    console.error('[PIX SERVICE] Erro ao gerar chave PIX:', error.message);
    throw error;
  }
};

/**
 * Consulta todas as chaves PIX de uma conta
 * @param {string} accountNumber - Número da conta
 * @returns {Promise<Array>} Lista de chaves PIX
 */
const getAccountPixKeys = async (accountNumber) => {
  try {
    console.log(`[PIX SERVICE] Consultando chaves PIX: accountNumber=${accountNumber}`);
    // Utiliza o serviço B8cash para obter chaves PIX da conta
    return await b8cashServiceInstance.getAccountPixKeys(accountNumber);
  } catch (error) {
    console.error('[PIX SERVICE] Erro ao consultar chaves PIX:', error);
    throw error;
  }
};

/**
 * Consulta informações de uma chave PIX específica
 * @param {string} accountNumber - Número da conta para o header
 * @param {string} key - Chave PIX a ser consultada
 * @returns {Promise<Object>} Dados da chave PIX
 */
const getKeyData = async (accountNumber, key) => {
  try {
    console.log(`[PIX SERVICE] Consultando dados da chave PIX: accountNumber=${accountNumber}, key=${key}`);
    
    // Validação básica
    if (!accountNumber) {
      console.error('[PIX SERVICE] Erro: accountNumber não fornecido');
      throw new Error('Número da conta (accountNumber) é obrigatório para consultar dados da chave PIX');
    }
    
    if (!key) {
      console.error('[PIX SERVICE] Erro: key não fornecida');
      throw new Error('Chave PIX (key) é obrigatória para consulta');
    }
    
    // Utiliza o serviço B8cash para obter dados da chave
    const response = await b8cashServiceInstance.getKeyData(accountNumber, key);
    
    // Log detalhado da resposta
    console.log(`[PIX SERVICE] Resposta completa dos dados da chave PIX:`, JSON.stringify(response));
    
    // Log da estrutura da resposta para facilitar debug
    console.log(`[PIX SERVICE] Estrutura da resposta:`, {
      hasData: !!response.data,
      dataType: response.data ? typeof response.data : 'N/A',
      dataIsEmpty: response.data ? Object.keys(response.data).length === 0 : true,
      topLevelKeys: Object.keys(response),
      name: response.name || (response.data ? response.data.name : undefined)
    });
    
    return response;
  } catch (error) {
    console.error('[PIX SERVICE] Erro ao consultar dados da chave PIX:', error);
    throw error;
  }
};

/**
 * Gera um QR Code para recebimento de PIX
 * @param {string} accountNumber - Número da conta
 * @param {number} amount - Valor para recebimento
 * @returns {Promise<Object>} Dados do QR Code gerado
 */
const generateQrCode = async (accountNumber, amount) => {
  try {
    console.log(`[PIX SERVICE] Gerando QR Code para valor R$ ${amount}`);
    
    // Buscar as chaves PIX do usuário
    console.log(`[PIX SERVICE] Buscando chaves PIX do usuário com accountNumber ${accountNumber}`);
    const pixKeysResponse = await getAccountPixKeys(accountNumber);
    
    console.log('[PIX SERVICE] Resposta das chaves PIX:', pixKeysResponse);
    
    // Verificar se existem chaves PIX disponíveis e processar a resposta
    let pixKeys = [];
    
    if (pixKeysResponse.success && Array.isArray(pixKeysResponse.data)) {
      pixKeys = pixKeysResponse.data;
    } else if (pixKeysResponse.keys && Array.isArray(pixKeysResponse.keys)) {
      pixKeys = pixKeysResponse.keys;
    } else if (Array.isArray(pixKeysResponse)) {
      pixKeys = pixKeysResponse;
    }
    
    if (!pixKeys.length) {
      throw new Error('Não há chaves PIX cadastradas para esta conta. Por favor, cadastre uma chave PIX primeiro.');
    }
    
    // Usar a primeira chave PIX da lista (conforme solicitado)
    const firstKey = pixKeys[0];
    const pixKey = firstKey.key;
    
    console.log(`[PIX SERVICE] Usando primeira chave PIX encontrada: ${pixKey}`);
    
    // Gerar um ID curto para a transação (até 20 caracteres)
    // Formato: timestamp curto (6 dígitos) + random (4 dígitos)
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    const transactionId = `pix${timestamp}${random}`;
    
    console.log(`[PIX SERVICE] ID da transação gerado: ${transactionId} (${transactionId.length} caracteres)`);
    
    // Chamar o serviço B8cash para gerar o QR Code com os parâmetros dinâmicos
    const result = await b8cashServiceInstance.generateDepositQrCode(
      accountNumber,
      pixKey,
      amount,
      transactionId
    );
    
    console.log('[PIX SERVICE] QR Code gerado com sucesso:', result);
    
    // Formata a resposta para o padrão esperado pelo frontend
    // Retorna apenas o base64 da imagem sem o prefixo, que será adicionado pelo frontend
    return {
      success: true,
      data: {
        qrCodeImage: result.qrCode || '', // Apenas o base64, sem o prefixo
        qrCodeText: result.paymentString || '',
        expiresAt: new Date(Date.now() + 3600000).toISOString(), // 1 hora de expiração
        amount: amount
      }
    };
  } catch (error) {
    console.error('[PIX SERVICE] Erro ao gerar QR Code:', error);
    throw new Error(error.message || 'Não foi possível gerar o QR Code para recebimento PIX.');
  }
};

/**
 * Obtém o histórico de transações PIX
 * @param {string} accountNumber - Número da conta
 * @param {number} limit - Limite de transações a serem retornadas
 * @param {number} offset - Deslocamento para paginação
 * @returns {Promise<Object>} Histórico de transações
 */
const getPixTransactions = async (accountNumber, limit = 10, offset = 0) => {
  try {
    console.log(`[PIX SERVICE] Consultando histórico de transações PIX: limite=${limit}, offset=${offset}`);
    // Obtém todas as transações através do b8cashService
    const result = await b8cashServiceInstance.getTransactions(accountNumber);
    
    // Verificar se o resultado tem a estrutura esperada
    if (!result || !result.success || !result.transactions || !Array.isArray(result.transactions)) {
      console.error('[PIX SERVICE] Formato de resposta inválido:', result);
      throw new Error('Não foi possível obter o histórico de transações PIX. Por favor, tente novamente mais tarde.');
    }

    // Filtra apenas transações do tipo PIX
    const pixTransactions = result.transactions.filter(transaction => 
      transaction.type === 'pix' || 
      transaction.type === 'pix_enviado' || 
      transaction.type === 'pix_recebido'
    );
    
    console.log(`[PIX SERVICE] Encontradas ${pixTransactions.length} transações PIX`);
    
    // Aplicar paginação
    const startIndex = offset;
    const endIndex = offset + limit;
    const paginatedTransactions = pixTransactions.slice(startIndex, endIndex);
    
    // Mapeia para o formato esperado pelo frontend
    const formattedTransactions = paginatedTransactions.map(transaction => {
      // Determinar se é enviado ou recebido com base no campo 'side'
      const transactionType = transaction.side === 'in' ? 'pix_recebido' : 'pix_enviado';
      
      // Obter informações do remetente/destinatário dependendo do tipo
      const recipientName = transaction.side === 'in' 
        ? (transaction.from && transaction.from.name ? transaction.from.name : 'Não identificado')
        : (transaction.to && transaction.to.name ? transaction.to.name : 'Não identificado');

      const recipientDocument = transaction.side === 'in'
        ? (transaction.from && transaction.from.userDocument ? transaction.from.userDocument : null)
        : (transaction.to && transaction.to.userDocument ? transaction.to.userDocument : null);

      // Obter a chave PIX usada
      const pixKey = transaction.side === 'in'
        ? (transaction.to && transaction.to.key ? transaction.to.key : null)
        : (transaction.to && transaction.to.key ? transaction.to.key : null);

      return {
        id: transaction.id || transaction.transactionId || '',
        amount: parseFloat(transaction.amount || 0),
        description: transaction.description || '',
        status: 'concluido', // Assumindo que todas as transações obtidas já foram concluídas
        transactionType,
        destinationKey: transaction.side === 'out' ? pixKey : null,
        originKey: transaction.side === 'in' ? pixKey : null,
        createdAt: new Date(transaction.createdTimestamp * 1000).toISOString(),
        recipientName,
        recipientDocument,
        formattedAmount: new Intl.NumberFormat('pt-BR', { 
          style: 'currency', 
          currency: 'BRL' 
        }).format(parseFloat(transaction.amount || 0)),
        formattedDate: new Date(transaction.createdTimestamp * 1000).toLocaleDateString('pt-BR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })
      };
    });
    
    return {
      transactions: formattedTransactions,
      total: pixTransactions.length
    };
  } catch (error) {
    console.error('[PIX SERVICE] Erro ao obter transações PIX:', error.message);
    throw new Error('Não foi possível carregar o histórico de transações PIX. Por favor, tente novamente mais tarde.');
  }
};

/**
 * Envia um PIX para uma chave de destino
 * @param {string} accountNumber - Número da conta de origem
 * @param {string} destinationKey - Chave PIX de destino
 * @param {number} amount - Valor da transação
 * @param {string} description - Descrição opcional da transação
 * @returns {Promise<Object>} Dados da transação PIX
 */
const sendPix = async (accountNumber, destinationKey, amount, description) => {
  try {
    console.log(`[PIX SERVICE] Enviando PIX: accountNumber=${accountNumber}, destinationKey=${destinationKey}, amount=${amount}, description=${description || 'N/A'}`);
    
    // Validação básica
    if (!accountNumber) {
      console.error('[PIX SERVICE] Erro: accountNumber não fornecido');
      throw new Error('Número da conta (accountNumber) é obrigatório para enviar PIX');
    }
    
    if (!destinationKey) {
      console.error('[PIX SERVICE] Erro: destinationKey não fornecida');
      throw new Error('Chave PIX de destino (destinationKey) é obrigatória');
    }
    
    if (!amount || isNaN(amount) || amount <= 0) {
      console.error('[PIX SERVICE] Erro: valor inválido', amount);
      throw new Error('Valor do PIX deve ser um número positivo');
    }
    
    // Utiliza o serviço B8cash para enviar PIX
    const response = await b8cashServiceInstance.sendPix(accountNumber, destinationKey, amount, description);
    
    // Log detalhado da resposta
    console.log(`[PIX SERVICE] Resposta completa do envio de PIX:`, JSON.stringify(response));
    
    // Log da estrutura da resposta para facilitar debug
    console.log(`[PIX SERVICE] Estrutura da resposta de envio:`, {
      success: !!response.success,
      hasId: !!response.id,
      topLevelKeys: Object.keys(response)
    });
    
    return response;
  } catch (error) {
    console.error('[PIX SERVICE] Erro ao enviar PIX:', error);
    throw error;
  }
};

module.exports = {
  generatePixKey,
  getAccountPixKeys,
  getKeyData,
  generateQrCode,
  getPixTransactions,
  sendPix
}; 