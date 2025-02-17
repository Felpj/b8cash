const { request } = require('undici');
const { v4: uuidv4 } = require('uuid');
const TcrUtils = require('./tcr.utils');

class TcrService {
  
  constructor() {
    this.baseUrl = process.env.B8_BASE_URL;
    this.apiKey = process.env.B8_API_KEY;
    this.apiSecret = process.env.B8_API_SECRET;
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
  async sendPix(accountNumber, destinationKey, amount) {

    const uniqueId = uuidv4().slice(0, 30);
    const timestamp = Math.floor(Date.now() / 1000); 

    const body = {
      destination: { key: destinationKey },
      amount,
      uniqueId,
      timestamp,
    };

    // Gerar assinatura
    body.signature = TcrUtils.generateSignature(body, {}, this.apiSecret);

    //Quando eu passo por parametro no body as informacoes: "keytype": "e-mail" ele da esse erro: Erro ao gerar chave PIX: Unexpected token < in JSON at position 0. Como faco pra tentar testar essa falha de seguranca e reportar o erro?
    
    
    try {
      const { body: responseBody, statusCode } = await request(`${this.baseUrl}/sendPix`, {
        method: 'POST',
        headers: this._getHeaders(accountNumber),
        body: JSON.stringify(body),
      });

      if (statusCode !== 200) {
        const errorData = await responseBody.json();
        throw new Error(`Erro ao enviar PIX: ${statusCode} - ${errorData.message}`);
      }

      const data = await responseBody.json();
      return data;
    } catch (error) {
      console.error('Erro ao enviar PIX:', error.message);
      throw new Error('Não foi possível completar a operação PIX.');
    }
  }

  // Função para enviar TED
  async sendTed(accountNumber, destination, amount) {

    const uniqueId = uuidv4(); 
    const timestamp = Math.floor(Date.now() / 1000); 

    const body = {
      destination,
      amount,
      uniqueId,
      timestamp,
    };

    // Gerar assinatura
    body.signature = TcrUtils.generateSignature(body, {}, this.apiSecret);

    try {
      const { body: responseBody, statusCode } = await request(`${this.baseUrl}/sendTed`, {
        method: 'POST',
        headers: this._getHeaders(accountNumber), // Cabeçalhos com o ACCOUNT-NUMBER
        body: JSON.stringify(body),
      });

      if (statusCode !== 200) {
        const errorData = await responseBody.json();
        throw new Error(`Erro ao enviar TED: ${statusCode} - ${errorData.message}`);
      }

      const data = await responseBody.json();
      return data;
    } catch (error) {
      console.error('Erro ao enviar TED:', error.message);
      throw new Error('Não foi possível completar a operação TED.');
    }
  }

  // Função para gerar uma nova chave PIX
  async generatePixKey(accountNumber, keyType) {
    const body = {
      keyType,
      timestamp: Math.floor(Date.now() / 1000), // Adiciona o timestamp
    };

    // Gera a assinatura para autenticação
    body.signature = TcrUtils.generateSignature(body, {}, this.apiSecret);

    try {
      const { body: responseBody, statusCode } = await request(`${this.baseUrl}/generatePixKey`, {
        method: 'POST',
        headers: this._getHeaders(accountNumber), // Envia os headers
        body: JSON.stringify(body), // Converte o body para JSON
      });

      if (statusCode !== 200) {
        const errorData = await responseBody.json();
        throw new Error(`Erro ao gerar chave PIX: ${statusCode} - ${errorData.message}`);
      }

      const data = await responseBody.json();
      return data; // Retorna os dados de sucesso da API
    } catch (error) {
      console.error('Erro ao gerar chave PIX:', error.message);
      throw new Error('Não foi possível gerar uma nova chave PIX.');
    }
  }

    // Função para criar uma nova conta de usuário
    async createUserAccount(document, email, name, phone) {
        const body = {
          document,
          email,
          name,
          phone,
          timestamp: Math.floor(Date.now() / 1000), // Adiciona o timestamp
        };
        
        console.log(body,'[createUserAccount] Body da requisição');
        // Gera a assinatura para autenticação
        body.signature = TcrUtils.generateSignature(body, {}, this.apiSecret);
    
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
  async getTransactions(accountNumber) {
    const body = {
      timestamp: Math.floor(Date.now() / 1000), // Adiciona o timestamp
    };

    // Gera a assinatura para autenticação
    body.signature = TcrUtils.generateSignature(body, {}, this.apiSecret);

    try {
      const { body: responseBody, statusCode } = await request(`${this.baseUrl}/getTransactions`, {
        method: 'POST',
        headers: this._getHeaders(accountNumber), // Envia os headers
        body: JSON.stringify(body), // Converte o body para JSON
      });
      console.log(responseBody,'[getTransactions] Resposta da consulta de transações');
      
      if (statusCode !== 200) {
        const errorData = await responseBody.json();
        throw new Error(`Erro ao consultar transações: ${statusCode} - ${errorData.message}`);
      }

      const data = await responseBody.json();
      return data; // Retorna os dados de sucesso da API
    } catch (error) {
      console.error('Erro ao consultar transações:', error.message);
      throw new Error('Não foi possível consultar as transações.');
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
    body.signature = TcrUtils.generateSignature(body, queryParams, this.apiSecret);

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

  // Função para consultar informações de uma chave PIX
  async getKeyData(key) {
    if (!key) {
      throw new Error('O parâmetro "key" é obrigatório para consultar informações de uma chave PIX.');
    }

    const body = {
      timestamp: Math.floor(Date.now() / 1000)
    };

    // Adiciona query params para a assinatura
    const queryParams = { key };
    
    // Gera a assinatura combinando body e query parameters
    body.signature = TcrUtils.generateSignature(body, queryParams, this.apiSecret);

    const url = `${this.baseUrl}/getKeyData?key=${encodeURIComponent(key)}`;

    try {
      const { body: responseBody, statusCode } = await request(url, {
        method: 'GET',
        headers: this._getHeaders(),
        body: JSON.stringify(body)
      });

      if (statusCode !== 200) {
        const errorData = await responseBody.json();
        throw new Error(`Erro ao consultar a chave PIX: ${statusCode} - ${errorData.message}`);
      }

      const data = await responseBody.json();
      return data; // Retorna os dados de sucesso da API
    } catch (error) {
      console.error('Erro ao consultar a chave PIX:', error.message);
      throw new Error('Não foi possível consultar as informações da chave PIX.');
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
    body.signature = TcrUtils.generateSignature(body, {}, this.apiSecret);

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
    body.signature = TcrUtils.generateSignature(body, {}, this.apiSecret);

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
}

module.exports = TcrService;
