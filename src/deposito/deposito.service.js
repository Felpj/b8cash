const { request } = require('undici');
const { v4: uuidv4 } = require('uuid');
const B8cashService = require('../b8cash-api/b8cash.service');
const B8cashUtils = require('../b8cash-api/b8cash.utils');

class DepositoService {
  constructor() {
    this.b8cashService = new B8cashService();
    this.baseUrl = process.env.B8_BASE_URL;
    this.apiKey = process.env.B8_API_KEY;
    this.apiSecret = process.env.B8_API_SECRET;
  }

  // Função para gerar headers
  _getHeaders(accountNumber) {
    return {
      'Content-Type': 'application/json',
      'B8-API-KEY': this.apiKey,
      'ACCOUNT-NUMBER': accountNumber,
    };
  }

  // Função para gerar QR Code para depósito via PIX
  async generateQrCode(accountNumber, amount) {
    try {
      // Primeiro, obtemos as chaves PIX do usuário
      const pixKeysResult = await this.getPixKeys(accountNumber);
      
      // Verificamos se o usuário possui chaves PIX
      if (!pixKeysResult.success || !pixKeysResult.data || pixKeysResult.data.length === 0) {
        throw new Error('Usuário não possui chaves PIX cadastradas. Cadastre uma chave PIX antes de gerar um QR Code.');
      }
      
      // Utilizamos a primeira chave PIX disponível (preferencialmente uma chave aleatória ou evp)
      let selectedKey;
      // Procuramos primeiro por uma chave do tipo 'evp' (como mostrado na imagem)
      const evpKey = pixKeysResult.data.find(item => item.keyType === 'evp' && item.status === 'active');
      if (evpKey) {
        selectedKey = evpKey.key;
        console.log('Usando chave EVP:', selectedKey);
      } else {
        // Se não encontrar uma chave evp, usa a primeira chave ativa disponível
        const activeKey = pixKeysResult.data.find(item => item.status === 'active');
        if (activeKey) {
          selectedKey = activeKey.key;
          console.log('Usando primeira chave ativa:', selectedKey);
        } else {
          throw new Error('Nenhuma chave PIX ativa encontrada.');
        }
      }
      
      const uniqueId = uuidv4().slice(0, 30);
      const timestamp = Math.floor(Date.now() / 1000);

      const body = {
        amount,
        key: selectedKey, // Adicionamos a chave PIX na requisição
        uniqueId,
        timestamp,
      };

      console.log('Enviando requisição para gerar QR Code com:', JSON.stringify(body));

      // Gerar assinatura
      body.signature = B8cashUtils.generateSignature(body, {}, this.apiSecret);

      const { body: responseBody, statusCode } = await request(`${this.baseUrl}/generateDepositQrCode`, {
        method: 'POST',
        headers: this._getHeaders(accountNumber),
        body: JSON.stringify(body),
      });

      if (statusCode !== 200) {
        const errorData = await responseBody.json();
        throw new Error(`Erro ao gerar QR Code: ${statusCode} - ${errorData.message}`);
      }

      const data = await responseBody.json();
      return data;
    } catch (error) {
      console.error('Erro ao gerar QR Code:', error.message);
      throw new Error('Não foi possível gerar o QR Code para depósito.');
    }
  }

  // Função para obter chaves PIX cadastradas
  async getPixKeys(accountNumber) {
    try {
      // Reutiliza o serviço existente do B8Cash
      const result = await this.b8cashService.getAccountPixKeys(accountNumber);
      return result;
    } catch (error) {
      console.error('Erro ao obter chaves PIX:', error.message);
      throw new Error('Não foi possível obter as chaves PIX cadastradas.');
    }
  }

  // Função para gerar boleto para depósito
  async generateBoleto(accountNumber, amount) {
    const uniqueId = uuidv4().slice(0, 30);
    const timestamp = Math.floor(Date.now() / 1000);

    const body = {
      amount,
      uniqueId,
      timestamp,
    };

    // Gerar assinatura
    body.signature = B8cashUtils.generateSignature(body, {}, this.apiSecret);

    try {
      // Aqui precisamos verificar se existe um endpoint específico para boletos na API da B8Cash
      // Caso não exista, podemos adaptar para usar outro serviço ou solicitar à B8Cash a adição dessa funcionalidade
      
      // Para fins de exemplo, vou simular uma resposta como se o endpoint existisse
      // Em um ambiente real, você precisaria substituir este código pela chamada real à API
      
      // Simulação da resposta para testes
      // Em produção, descomente o código abaixo para fazer a chamada real à API
      
      /*
      const { body: responseBody, statusCode } = await request(`${this.baseUrl}/generateDepositBoleto`, {
        method: 'POST',
        headers: this._getHeaders(accountNumber),
        body: JSON.stringify(body),
      });

      if (statusCode !== 200) {
        const errorData = await responseBody.json();
        throw new Error(`Erro ao gerar boleto: ${statusCode} - ${errorData.message}`);
      }

      const data = await responseBody.json();
      return data;
      */
      
      // Simulação para desenvolvimento - remover em produção
      return {
        success: true,
        data: {
          boletoCode: "74891150198455532406990461994102261005000000093",
          amount: amount,
          expirationDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 dias a partir de hoje
          status: "pending"
        }
      };
    } catch (error) {
      console.error('Erro ao gerar boleto:', error.message);
      throw new Error('Não foi possível gerar o boleto para depósito.');
    }
  }
}

module.exports = DepositoService;
