const { request } = require('undici');
const { v4: uuidv4 } = require('uuid');
const B8cashUtils = require('./b8cash.utils');

class B8cashService {
  
  constructor() {
    this.baseUrl = process.env.B8_BASE_URL;
    this.apiKey = process.env.B8_API_KEY;
    this.apiSecret = process.env.B8_API_SECRET;
    
    // Verificações silenciosas sem logs excessivos
    if (!this.baseUrl || !this.apiKey || !this.apiSecret) {
      console.error('[B8CASH API] ERRO: Configurações de API incompletas. Verifique as variáveis de ambiente.');
    }
  }

  // Função para gerar headers
  _getHeaders(accountNumber) {
    return {
      'Content-Type': 'application/json',
      'B8-API-KEY': this.apiKey,
      'ACCOUNT-NUMBER': accountNumber, // Cabeçalho obrigatório
    };
  }

  // Função para enviar PIX
  async sendPix(accountNumber, destinationKey, amount, description) {
    if (!accountNumber) {
      throw new Error('Número da conta não informado para enviar PIX');
    }

    const uniqueId = uuidv4().slice(0, 30);
    const timestamp = Math.floor(Date.now() / 1000); 

    // O body precisa ser enviado no formato { destination: { key }, amount }
    const body = {
      destination: {
        key: destinationKey
      },
      amount,
      uniqueId,
      timestamp,
    };

    // Adiciona descrição se fornecida
    if (description) {
      body.description = description;
    }

    // Gerar assinatura
    body.signature = B8cashUtils.generateSignature(body, {}, this.apiSecret);
    
    // Log do payload completo
    console.log(`[B8CASH API] sendPix - Payload completo:`, body);
    console.log(`[B8CASH API] sendPix - Headers incluirão ACCOUNT-NUMBER: ${accountNumber}`);
    
    try {
      console.log(`[API REQUEST] POST /sendPix - Enviando PIX para ${destinationKey}, valor: ${amount}`);
      const { body: responseBody, statusCode } = await request(`${this.baseUrl}/sendPix`, {
        method: 'POST',
        headers: this._getHeaders(accountNumber),
        body: JSON.stringify(body),
      });

      // Log da resposta bruta
      let rawData;
      try {
        rawData = await responseBody.json();
        console.log(`[B8CASH API] sendPix - Resposta bruta:`, JSON.stringify(rawData));
      } catch (e) {
        console.error(`[B8CASH API] sendPix - Erro ao processar JSON da resposta:`, e);
        throw new Error(`Erro ao processar resposta: ${e.message}`);
      }

      if (statusCode !== 200) {
        console.error(`[API RESPONSE] Erro ${statusCode}:`, JSON.stringify(rawData));
        throw new Error(`Erro ao enviar PIX: ${statusCode} - ${rawData.message || JSON.stringify(rawData)}`);
      }

      // Log da estrutura da resposta para facilitar debug
      console.log(`[B8CASH API] sendPix - Estrutura da resposta:`, {
        hasSuccess: !!rawData.success,
        hasId: !!rawData.id,
        topLevelKeys: Object.keys(rawData)
      });

      console.log(`[API RESPONSE] PIX enviado com sucesso: ID ${rawData.id || 'N/A'}`);
      return rawData;
    } catch (error) {
      // Se o erro é da nossa exceção interna (já formatado), apenas repassamos
      if (error.message.includes('Erro ao enviar PIX:')) {
        throw error;
      }
      // Caso contrário, é um erro de rede ou outro erro inesperado
      console.error(`[API ERROR] Falha na comunicação:`, error);
      throw new Error(`Não foi possível completar a operação PIX: ${error.message}`);
    }
  }

  // Função para enviar TED
  async sendTed(accountNumber, destination, amount) {
    if (!accountNumber) {
      throw new Error('Número da conta não informado para enviar TED');
    }

    const uniqueId = uuidv4().slice(0, 30);
    const timestamp = Math.floor(Date.now() / 1000); 

    // O body precisa ser enviado no formato conforme documentação
    const body = {
      destination: {
        document: destination.document,
        name: destination.name,
        bankNumber: destination.bankNumber,
        agencyNumber: destination.agencyNumber,
        agencyDigit: destination.agencyDigit,
        accountNumber: destination.accountNumber,
        accountDigit: destination.accountDigit,
        accountType: destination.accountType
      },
      amount,
      uniqueId,
      timestamp,
    };

    // Gerar assinatura
    body.signature = B8cashUtils.generateSignature(body, {}, this.apiSecret);
    
    // Log do payload completo
    console.log(`[B8CASH API] sendTed - Payload completo:`, body);
    console.log(`[B8CASH API] sendTed - Headers incluirão ACCOUNT-NUMBER: ${accountNumber}`);
    
    try {
      console.log(`[API REQUEST] POST /sendTed - Enviando TED para ${destination.name}, valor: ${amount}`);
      const { body: responseBody, statusCode } = await request(`${this.baseUrl}/sendTed`, {
        method: 'POST',
        headers: this._getHeaders(accountNumber),
        body: JSON.stringify(body),
      });

      // Log da resposta bruta
      let rawData;
      try {
        rawData = await responseBody.json();
        console.log(`[B8CASH API] sendTed - Resposta bruta:`, JSON.stringify(rawData));
      } catch (e) {
        console.error(`[B8CASH API] sendTed - Erro ao processar JSON da resposta:`, e);
        throw new Error(`Erro ao processar resposta: ${e.message}`);
      }

      if (statusCode !== 200) {
        console.error(`[API RESPONSE] Erro ${statusCode}:`, JSON.stringify(rawData));
        throw new Error(`Erro ao enviar TED: ${statusCode} - ${rawData.message || JSON.stringify(rawData)}`);
      }

      // Log da estrutura da resposta para facilitar debug
      console.log(`[B8CASH API] sendTed - Estrutura da resposta:`, {
        hasSuccess: !!rawData.success,
        hasId: !!rawData.id,
        topLevelKeys: Object.keys(rawData)
      });

      console.log(`[API RESPONSE] TED enviado com sucesso: ID ${rawData.id || 'N/A'}`);
      return rawData;
    } catch (error) {
      // Se o erro é da nossa exceção interna (já formatado), apenas repassamos
      if (error.message.includes('Erro ao enviar TED:')) {
        throw error;
      }
      // Caso contrário, é um erro de rede ou outro erro inesperado
      console.error(`[API ERROR] Falha na comunicação:`, error);
      throw new Error(`Não foi possível completar a operação TED: ${error.message}`);
    }
  }

  // Função para gerar uma nova chave PIX
  async generatePixKey(accountNumber, keyType, key) {
    if (!accountNumber) {
      throw new Error('Número da conta não informado para gerar chave PIX');
    }

    if (!keyType) {
      throw new Error('O tipo da chave PIX é obrigatório');
    }

    // Mapear os tipos de chave do frontend para os tipos aceitos pela API
    let apiKeyType;
    switch (keyType.toLowerCase()) {
      case 'celular':
        apiKeyType = 'phone';
        break;
      case 'cpf':
        apiKeyType = 'cpf';
        break;
      case 'email':
        apiKeyType = 'email';
        break;
      case 'aleatoria':
        apiKeyType = 'evp';
        break;
      default:
        apiKeyType = keyType;
    }

    console.log(`[API REQUEST] Gerando chave PIX: tipo=${apiKeyType}, valor=${key || 'N/A'}`);
    
    const body = {
      keyType: apiKeyType,
      timestamp: Math.floor(Date.now() / 1000),
    };

    // Se for fornecido um valor para a chave (key), adicionar ao body
    if (key && apiKeyType !== 'evp') {
      body.key = key;
    }

    // Gera a assinatura para autenticação
    body.signature = B8cashUtils.generateSignature(body, {}, this.apiSecret);

    try {
      const { body: responseBody, statusCode } = await request(`${this.baseUrl}/generatePixKey`, {
        method: 'POST',
        headers: this._getHeaders(accountNumber),
        body: JSON.stringify(body),
      });

      const data = await responseBody.json();
      
      if (statusCode !== 200) {
        console.error(`[API RESPONSE] Erro ${statusCode}: ${data.message || JSON.stringify(data)}`);
        throw new Error(`Erro ao gerar chave PIX: ${statusCode} - ${data.message || JSON.stringify(data)}`);
      }

      console.log(`[API RESPONSE] Chave PIX gerada com sucesso: ${apiKeyType}`);
      return data;
    } catch (error) {
      // Se o erro é da nossa exceção interna (já formatado), apenas repassamos
      if (error.message.includes('Erro ao gerar chave PIX:')) {
        throw error;
      }
      // Caso contrário, é um erro de rede ou outro erro inesperado
      console.error(`[API ERROR] Falha na comunicação: ${error.message}`);
      throw new Error(`Não foi possível gerar uma nova chave PIX: ${error.message}`);
    }
  }

    // Função para criar uma nova conta de usuário
    async createUserAccount(document, email, name, phone) {
        console.log('[B8CASH SERVICE] Parâmetros recebidos:', {
            document,
            email,
            name,
            phone
        });
        
        const body = {
          document,
          email,
          name,
          phone,
          timestamp: Math.floor(Date.now() / 1000), // Adiciona o timestamp
        };
        
        console.log('[B8CASH SERVICE] Body antes da assinatura:', body);
        
        // Gera a assinatura para autenticação
        body.signature = B8cashUtils.generateSignature(body, {}, this.apiSecret);
    
        try {
          const { body: responseBody, statusCode } = await request(`${this.baseUrl}/createUserAccount`, {
            method: 'POST',
            headers: this._getHeaders(), // Headers sem ACCOUNT-NUMBER
            body: JSON.stringify(body), // Converte o body para JSON
          });
    
          if (statusCode !== 200) {
            const errorData = await responseBody.json();
            throw new Error(`Erro ao criar conta de usuário: ${statusCode} - ${errorData.message}`);
          }
    
          const data = await responseBody.json();
          return data; // Retorna os dados de sucesso da API
        } catch (error) {
          console.error('Erro ao criar conta de usuário:', error.message);
          throw new Error('Não foi possível criar a conta de usuário.');
        }
      }

  // Função para consultar todas as transações
  async getTransactions(accountNumber, queryParams = {}) {
    if (!accountNumber) {
      throw new Error('Número da conta não informado para consultar transações');
    }

    // 1. Preparar o payload para a assinatura. Começa com o timestamp.
    const paramsForSignature = {
      timestamp: Math.floor(Date.now() / 1000),
    };

    // Adicionar outros query params ao payload da assinatura apenas se estiverem definidos e não forem nulos ou vazios.
    for (const key in queryParams) {
      if (queryParams.hasOwnProperty(key) && queryParams[key] !== undefined && queryParams[key] !== null && queryParams[key] !== '') {
        paramsForSignature[key] = queryParams[key];
      }
    }

    // 2. Gerar a assinatura com base no payload construído.
    const signature = B8cashUtils.generateSignature(paramsForSignature, {}, this.apiSecret);

    // 3. Construir a query string final.
    // Primeiro, a parte que foi assinada.
    const signedParamsQueryString = Object.entries(paramsForSignature)
      .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
      .join('&');
    
    // Montar a URL final com os parâmetros assinados e a assinatura.
    const url = `${this.baseUrl}/getTransactions?${signedParamsQueryString}&signature=${signature}`;

    console.log(`[API REQUEST] GET /getTransactions - Account: ${accountNumber}, URL: ${url}, Signed Payload: ${JSON.stringify(paramsForSignature)}`);
    
    try {
      const { body: responseBody, statusCode } = await request(url, {
        method: 'GET',
        headers: this._getHeaders(accountNumber),
      });
      
      const data = await responseBody.json();
      
      if (statusCode !== 200) {
        console.error(`[API RESPONSE] Erro ${statusCode}: ${data.message || JSON.stringify(data)}`);
        throw new Error(`Erro ao consultar transações: ${statusCode} - ${data.message || JSON.stringify(data)}`);
      }

      // Log somente a quantidade de transações, não o objeto inteiro
      const transactionCount = data.transactions ? data.transactions.length : 0;
      console.log(`[API RESPONSE] ${transactionCount} transações recuperadas para a conta ${accountNumber}`);
      
      return data;
    } catch (error) {
      // Se o erro é da nossa exceção interna (já formatado), apenas repassamos
      if (error.message.includes('Erro ao consultar transações:')) {
        throw error;
      }
      // Caso contrário, é um erro de rede ou outro erro inesperado
      console.error(`[API ERROR] Falha na comunicação: ${error.message}`);
      throw new Error(`Não foi possível consultar as transações: ${error.message}`);
    }
  }

  // Função para consultar informações da conta
  async getAccountData(accountNumber, document) {
    // Monta a URL com o parâmetro `document`, se fornecido
    const url = document
      ? `${this.baseUrl}/getAccountData?document=${encodeURIComponent(document)}`
      : `${this.baseUrl}/getAccountData`;

    // Cria o body com timestamp
    const body = {
      timestamp: Math.floor(Date.now() / 1000)
    };

    // Cria objeto com query parameters se existirem
    const queryParams = document ? { document } : {};

    // Gera a assinatura combinando body e query parameters
    body.signature = B8cashUtils.generateSignature(body, queryParams, this.apiSecret);

    try {
      const { body: responseBody, statusCode } = await request(url, {
        method: 'GET',
        headers: this._getHeaders(accountNumber),
        body: JSON.stringify(body)
      });

      if (statusCode !== 200) {
        const errorData = await responseBody.json();
        throw new Error(`Erro ao consultar informações da conta: ${statusCode} - ${errorData.message}`);
      }

      const data = await responseBody.json();
      return data; // Retorna os dados de sucesso da API
    } catch (error) {
      console.error('Erro ao consultar informações da conta:', error.message);
      throw new Error('Não foi possível consultar as informações da conta.');
    }
  }



  // Função para consultar todas as chaves PIX da conta
  async getAccountPixKeys(accountNumber) {
    if (!accountNumber) {
      throw new Error('O cabeçalho ACCOUNT-NUMBER é obrigatório para consultar as chaves PIX.');
    }

    const body = {
      timestamp: Math.floor(Date.now() / 1000)
    };
    
    // Gera a assinatura
    body.signature = B8cashUtils.generateSignature(body, {}, this.apiSecret);

    const url = `${this.baseUrl}/getAccountPixKeys`;

    try {
      const { body: responseBody, statusCode } = await request(url, {
        method: 'GET',
        headers: this._getHeaders(accountNumber),
        body: JSON.stringify(body)
      });

      if (statusCode !== 200) {
        const errorData = await responseBody.json();
        throw new Error(`Erro ao consultar as chaves PIX: ${statusCode} - ${errorData.message}`);
      }

      const data = await responseBody.json();
      return data; // Retorna os dados de sucesso da API
    } catch (error) {
      console.error('Erro ao consultar as chaves PIX:', error.message);
      throw new Error('Não foi possível consultar as chaves PIX da conta.');
    }
  }

  // Função para consultar o saldo da conta
  async getAccountBalance(accountNumber) {
    if (!accountNumber) {
      throw new Error('O cabeçalho ACCOUNT-NUMBER é obrigatório para consultar o saldo.');
    }

    const url = `${this.baseUrl}/getAccountBalance`;
    const body = {
      timestamp: Math.floor(Date.now() / 1000)
    };
    body.signature = B8cashUtils.generateSignature(body, {}, this.apiSecret);

    try {
      const { body: responseBody, statusCode } = await request(url, {
        method: 'GET',
        headers: this._getHeaders(accountNumber), // Envia os headers 
        body: JSON.stringify(body)
      });

      if (statusCode !== 200) {
        const errorData = await responseBody.json();
        throw new Error(`Erro ao consultar o saldo: ${statusCode} - ${errorData.message}`);
      }

      const data = await responseBody.json();
      return data; // Retorna os dados de sucesso da API
    } catch (error) {
      console.error('Erro ao consultar o saldo:', error.message);
      throw new Error('Não foi possível consultar o saldo da conta.');
    }
  }
  
  // Função para gerar QR Code de depósito
  async generateDepositQrCode(accountNumber, key, value, id) {
    if (!accountNumber) {
      throw new Error('O cabeçalho ACCOUNT-NUMBER é obrigatório para gerar QR Code de depósito.');
    }

    const body = {
      key,
      value,
      id,
      timestamp: Math.floor(Date.now() / 1000) // Adiciona o timestamp
    };

    // Gera a assinatura para autenticação
    body.signature = B8cashUtils.generateSignature(body, {}, this.apiSecret);

    try {
      const { body: responseBody, statusCode } = await request(`${this.baseUrl}/generateDepositQrCode`, {
        method: 'POST',
        headers: this._getHeaders(accountNumber), // Envia os headers com o ACCOUNT-NUMBER
        body: JSON.stringify(body), // Converte o body para JSON
      });

      if (statusCode !== 200) {
        const errorData = await responseBody.json();
        throw new Error(`Erro ao gerar QR Code de depósito: ${statusCode} - ${errorData.message}`);
      }

      const data = await responseBody.json();
      return data; // Retorna os dados de sucesso da API
    } catch (error) {
      console.error('Erro ao gerar QR Code de depósito:', error.message);
      throw new Error('Não foi possível gerar o QR Code de depósito.');
    }
  }

  // Função para obter informações de uma chave PIX a partir do QR Code
  async getQRCodeData(key) {
    if (!key) {
      throw new Error('O parâmetro "key" é obrigatório para consultar informações da chave PIX.');
    }

    const body = {
      timestamp: Math.floor(Date.now() / 1000)
    };

    // Adiciona query params para a assinatura
    const queryParams = { key };
    
    // Gera a assinatura combinando body e query parameters
    body.signature = B8cashUtils.generateSignature(body, queryParams, this.apiSecret);

    try {
      console.log(`[API REQUEST] GET /getQRCodeData - Consultando dados da chave PIX: ${key}`);
      const { body: responseBody, statusCode } = await request(`${this.baseUrl}/getQRCodeData`, {
        method: 'POST',
        headers: this._getHeaders(),
        body: JSON.stringify(body),
      });

      if (statusCode !== 200) {
        const errorData = await responseBody.json();
        throw new Error(`Erro ao consultar dados do QR Code: ${statusCode} - ${errorData.message || JSON.stringify(errorData)}`);
      }

      const data = await responseBody.json();
      console.log(`[API RESPONSE] Dados do QR Code obtidos com sucesso para chave: ${key}`);
      return data; // Retorna os dados de sucesso da API
    } catch (error) {
      // Se o erro é da nossa exceção interna (já formatado), apenas repassamos
      if (error.message.includes('Erro ao consultar dados do QR Code:')) {
        throw error;
      }
      // Caso contrário, é um erro de rede ou outro erro inesperado
      console.error(`[API ERROR] Falha ao consultar dados do QR Code: ${error.message}`);
      throw new Error('Não foi possível consultar as informações da chave PIX.');
    }
  }

  // Função para obter informações detalhadas de uma chave PIX
  async getKeyData(accountNumber, key) {
    if (!accountNumber) {
      throw new Error('O cabeçalho ACCOUNT-NUMBER é obrigatório para consultar informações da chave PIX.');
    }

    if (!key) {
      throw new Error('O parâmetro "key" é obrigatório para consultar informações da chave PIX.');
    }

    const body = {
      key,
      timestamp: Math.floor(Date.now() / 1000)
    };

    // Gera a assinatura para autenticação
    body.signature = B8cashUtils.generateSignature(body, {}, this.apiSecret);

    // Log detalhado do payload
    console.log(`[B8CASH API] getKeyData - Payload completo:`, JSON.stringify(body));
    console.log(`[B8CASH API] getKeyData - Headers incluirão ACCOUNT-NUMBER: ${accountNumber}`);

    try {
      console.log(`[API REQUEST] POST /getKeyData - Consultando dados da chave PIX: ${key}`);
      const { body: responseBody, statusCode } = await request(`${this.baseUrl}/getKeyData`, {
        method: 'POST',
        headers: this._getHeaders(accountNumber),
        body: JSON.stringify(body),
      });

      // Log da resposta bruta
      let rawData;
      try {
        rawData = await responseBody.json();
        console.log(`[B8CASH API] getKeyData - Resposta bruta:`, JSON.stringify(rawData));
      } catch (e) {
        console.error(`[B8CASH API] getKeyData - Erro ao processar JSON da resposta:`, e);
        throw new Error(`Erro ao processar resposta: ${e.message}`);
      }

      if (statusCode !== 200) {
        console.error(`[API RESPONSE] Erro ${statusCode}:`, JSON.stringify(rawData));
        throw new Error(`Erro ao consultar a chave PIX: ${statusCode} - ${rawData.message || JSON.stringify(rawData)}`);
      }

      // Log da estrutura da resposta para facilitar debug
      console.log(`[B8CASH API] getKeyData - Estrutura da resposta:`, {
        hasData: !!rawData.data,
        dataType: rawData.data ? typeof rawData.data : 'N/A',
        dataIsEmpty: rawData.data ? Object.keys(rawData.data).length === 0 : true,
        topLevelKeys: Object.keys(rawData)
      });

      console.log(`[API RESPONSE] Dados da chave PIX obtidos com sucesso: ${key}`);
      return rawData;
    } catch (error) {
      // Se o erro é da nossa exceção interna (já formatado), apenas repassamos
      if (error.message.includes('Erro ao consultar a chave PIX:')) {
        throw error;
      }
      // Caso contrário, é um erro de rede ou outro erro inesperado
      console.error(`[API ERROR] Falha ao consultar dados da chave PIX:`, error);
      throw new Error(`Erro ao consultar a chave PIX: ${error.message}`);
    }
  }

}

module.exports = B8cashService;
