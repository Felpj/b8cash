const pixService = require('./pix.service');



/**
 * Gera uma nova chave PIX
 * @param {object} req - Objeto de requisição Express
 * @param {object} res - Objeto de resposta Express
 */
const generatePixKey = async (req, res) => {
  try {
    const { keyType, keyValue } = req.body;
    const accountNumber = req.headers['account-number'];
    
    if (!accountNumber) {
      return res.status(400).json({
        success: false,
        message: 'Número da conta não informado. Verifique sua sessão.'
      });
    }
    
    if (!keyType) {
      return res.status(400).json({
        success: false,
        message: 'Tipo de chave é obrigatório.'
      });
    }
    
    // Validar se keyValue é necessário para o tipo de chave
    if ((keyType === 'email' || keyType === 'cpf') && !keyValue) {
      return res.status(400).json({
        success: false,
        message: `Para o tipo de chave "${keyType}" é necessário informar o valor da chave.`
      });
    }
    
    // Log para depuração
    console.log(`[PIX CONTROLLER] Gerando chave PIX: accountNumber=${accountNumber}, keyType=${keyType}, keyValue=${keyValue || 'N/A'}`);
    
    const result = await pixService.generatePixKey(accountNumber, keyType, keyValue);
    
    console.log(`[PIX CONTROLLER] Resultado da geração de chave PIX:`, result);
    
    return res.status(200).json({
      success: true,
      message: 'Chave PIX gerada com sucesso!',
      data: result
    });
  } catch (error) {
    console.error('[PIX CONTROLLER] Erro ao gerar chave PIX:', error);
    
    return res.status(500).json({
      success: false,
      message: error.message || 'Erro ao gerar chave PIX. Por favor, tente novamente mais tarde.'
    });
  }
};

/**
 * Consulta todas as chaves PIX de uma conta
 * @param {object} req - Objeto de requisição Express
 * @param {object} res - Objeto de resposta Express
 */
const getAccountPixKeys = async (req, res) => {
  try {
    const accountNumber = req.headers['account-number'];
    
    if (!accountNumber) {
      return res.status(400).json({
        success: false,
        message: 'Número da conta não informado. Verifique sua sessão.'
      });
    }
    
    const result = await pixService.getAccountPixKeys(accountNumber);
    
    console.log('[PIX CONTROLLER] Resposta do serviço getAccountPixKeys:', result);
    
    // Formatando a resposta para padronizar com success, message e data
    // Verificar os diferentes formatos possíveis da resposta
    if (result && result.success === true && Array.isArray(result.data)) {
      // Formato da API via Postman: { success: true, data: [...] }
      return res.status(200).json({
        success: true,
        message: 'Chaves PIX recuperadas com sucesso',
        data: result.data
      });
    } else if (result && result.keys && Array.isArray(result.keys)) {
      // Formato com propriedade keys diretamente: { keys: [...] }
      return res.status(200).json({
        success: true,
        message: 'Chaves PIX recuperadas com sucesso',
        data: result.keys
      });
    } else if (Array.isArray(result)) {
      // Resposta é um array diretamente
      return res.status(200).json({
        success: true,
        message: 'Chaves PIX recuperadas com sucesso',
        data: result
      });
    } else {
      // Caso não seja possível identificar o formato correto ou não haja chaves
      console.warn('[PIX CONTROLLER] Formato de resposta não reconhecido:', result);
      return res.status(200).json({
        success: true,
        message: 'Chaves PIX recuperadas com sucesso',
        data: []
      });
    }
  } catch (error) {
    console.error('Erro ao consultar chaves PIX:', error);
    
    return res.status(500).json({
      success: false,
      message: error.message || 'Erro ao consultar chaves PIX. Por favor, tente novamente mais tarde.'
    });
  }
};

/**
 * Consulta informações de uma chave PIX específica
 * @param {object} req - Objeto de requisição Express
 * @param {object} res - Objeto de resposta Express
 */
const getKeyData = async (req, res) => {
  try {
    const { key } = req.query;
    
    if (!key) {
      return res.status(400).json({
        success: false,
        message: 'Chave PIX não informada.'
      });
    }
    
    const result = await pixService.getKeyData(key);
    
    return res.status(200).json({
      success: true,
      message: 'Dados da chave PIX recuperados com sucesso',
      data: result
    });
  } catch (error) {
    console.error('Erro ao consultar dados da chave PIX:', error);
    
    return res.status(500).json({
      success: false,
      message: error.message || 'Erro ao consultar dados da chave PIX. Por favor, tente novamente mais tarde.'
    });
  }
};

/**
 * Gera um QR Code para recebimento de PIX
 * @param {object} req - Objeto de requisição Express
 * @param {object} res - Objeto de resposta Express
 */
const generateQrCode = async (req, res) => {
  try {
    const { amount } = req.body;
    const accountNumber = req.headers['account-number'];
    
    // Log de depuração
    console.log('[PIX CONTROLLER] Requisição recebida para gerar QR Code:', {
      amount,
      accountNumber,
      body: req.body,
      headers: req.headers
    });
    
    if (!accountNumber) {
      return res.status(400).json({
        success: false,
        message: 'Número da conta não informado. Verifique sua sessão.'
      });
    }
    
    if (!amount || isNaN(amount) || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'O valor para recebimento deve ser um número maior que zero.'
      });
    }
    
    console.log(`[PIX CONTROLLER] Gerando QR Code para valor R$ ${amount}`);
    
    const result = await pixService.generateQrCode(accountNumber, Number(amount));
    
    // Log para verificar a resposta do serviço
    console.log('[PIX CONTROLLER] Resposta do pixService.generateQrCode:', result);
    
    // Retorna a resposta exatamente como veio do serviço
    return res.status(200).json(result);
  } catch (error) {
    // Log detalhado do erro para depuração
    console.error('[PIX CONTROLLER] Erro ao gerar QR Code:', error);
    console.error('[PIX CONTROLLER] Stack trace:', error.stack);
    
    return res.status(500).json({
      success: false,
      message: error.message || 'Erro ao gerar QR Code para recebimento PIX. Por favor, tente novamente mais tarde.'
    });
  }
};

/**
 * Obtém o histórico de transações PIX
 * @param {Object} req - Objeto de requisição Express 
 * @param {Object} res - Objeto de resposta Express
 */
const getPixTransactions = async (req, res) => {
  try {
    const accountNumber = req.headers['account-number'];
    const limit = parseInt(req.query.limite) || 10;
    const offset = parseInt(req.query.offset) || 0;

    // Validação do account number
    if (!accountNumber) {
      return res.status(400).json({
        success: false,
        message: 'Número da conta não informado. Verifique sua sessão.'
      });
    }

    // Obtenção das transações
    const result = await pixService.getPixTransactions(accountNumber, limit, offset);
    
    // Retorno padronizado
    return res.status(200).json({
      success: true,
      message: 'Transações PIX recuperadas com sucesso',
      data: result
    });
  } catch (error) {
    console.error('Erro ao consultar transações PIX:', error);
    
    return res.status(500).json({
      success: false,
      message: error.message || 'Erro ao consultar transações PIX. Por favor, tente novamente mais tarde.'
    });
  }
};

module.exports = {
  generatePixKey,
  getAccountPixKeys,
  getKeyData,
  generateQrCode,
  getPixTransactions
};