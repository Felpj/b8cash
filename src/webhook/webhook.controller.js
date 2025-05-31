const { request } = require('undici');
const { v4: uuidv4 } = require('uuid');
const B8cashService = require('../b8cash-api/b8cash.service');
const B8cashUtils = require('../b8cash-api/b8cash.utils');
const { PrismaClient } = require('@prisma/client');

class WebhookController {
  constructor() {
    this.b8cashService = new B8cashService();
    this.baseUrl = process.env.B8_BASE_URL;
    this.apiKey = process.env.B8_API_KEY;
    this.apiSecret = process.env.B8_API_SECRET;
    this.prisma = new PrismaClient();
  }

  // Método para gerar headers
  _getHeaders() {
    return {
      'Content-Type': 'application/json',
      'B8-API-KEY': this.apiKey,
    };
  }

  // Método para configurar a URL do webhook na API B8Cash
  async setWebhook(req, res) {
    const { url } = req.body;

    // Validação do parâmetro obrigatório
    if (!url) {
      return res.status(400).json({ error: 'A URL do webhook é obrigatória.' });
    }

    try {
      const timestamp = Math.floor(Date.now() / 1000);
      
      const body = {
        url,
        timestamp,
      };

      // Gerar assinatura
      body.signature = B8cashUtils.generateSignature(body, {}, this.apiSecret);

      const { body: responseBody, statusCode } = await request(`${this.baseUrl}/setWebhook`, {
        method: 'POST',
        headers: this._getHeaders(),
        body: JSON.stringify(body),
      });

      if (statusCode !== 200) {
        const errorData = await responseBody.json();
        throw new Error(`Erro ao configurar webhook: ${statusCode} - ${errorData.message}`);
      }

      const data = await responseBody.json();
      return res.status(200).json(data);
    } catch (error) {
      console.error('Erro ao configurar webhook:', error.message);
      return res.status(500).json({ error: 'Não foi possível configurar o webhook.' });
    }
  }

  // Método para receber notificações do webhook
  async receiveNotification(req, res) {
    try {
      // Registrar todos os dados recebidos
      console.log('----------------------------------------');
      console.log('WEBHOOK RECEBIDO - HEADERS:');
      console.log(JSON.stringify(req.headers, null, 2));
      console.log('WEBHOOK RECEBIDO - BODY:');
      console.log(JSON.stringify(req.body, null, 2));
      console.log('----------------------------------------');
      
      // Extrair o tipo de notificação, se disponível
      let notificationType = null;
      if (req.body && req.body.type) {
        notificationType = req.body.type;
      } else if (req.body && req.body.event) {
        notificationType = req.body.event;
      }
      
      // Salvar a notificação no banco de dados
      try {
        const webhookLog = await this.prisma.webhookLog.create({
          data: {
            notificationType,
            requestHeaders: JSON.stringify(req.headers),
            requestBody: JSON.stringify(req.body),
            ipAddress: req.ip || req.connection.remoteAddress,
            notes: 'Webhook recebido e armazenado para análise'
          }
        });
        
        console.log(`Webhook salvo no banco de dados com ID: ${webhookLog.id}`);
      } catch (dbError) {
        console.error('Erro ao salvar webhook no banco de dados:', dbError);
      }
      
      // Resposta de sucesso - sempre retornamos 200 para não receber reenvios
      return res.status(200).json({ success: true, message: 'Notificação recebida com sucesso' });
    } catch (error) {
      console.error('Erro ao processar webhook:', error);
      console.log('----------------------------------------');
      console.log('ERRO NO WEBHOOK - Request Body:');
      console.log(JSON.stringify(req.body, null, 2));
      console.log('----------------------------------------');
      
      // Tentar salvar mesmo em caso de erro
      try {
        await this.prisma.webhookLog.create({
          data: {
            notificationType: 'error',
            requestHeaders: JSON.stringify(req.headers || {}),
            requestBody: JSON.stringify(req.body || {}),
            ipAddress: req.ip || req.connection?.remoteAddress || 'unknown',
            notes: `Erro ao processar: ${error.message}`
          }
        });
      } catch (dbError) {
        console.error('Erro ao salvar webhook com erro:', dbError);
      }
      
      // Mesmo com erro, retornamos 200 para evitar reenvios
      return res.status(200).json({ success: false, error: error.message });
    }
  }

  // Método para listar webhooks com paginação
  async listWebhooks(req, res) {
    try {
      const page = parseInt(req.query.page || '1', 10);
      const limit = parseInt(req.query.limit || '20', 10);
      const skip = (page - 1) * limit;
      const type = req.query.type;
      
      // Construir o filtro
      const where = {};
      if (type) {
        where.notificationType = type;
      }
      
      // Buscar webhooks com contagem total
      const [webhooks, totalCount] = await Promise.all([
        this.prisma.webhookLog.findMany({
          where,
          orderBy: {
            receivedAt: 'desc'
          },
          skip,
          take: limit
        }),
        this.prisma.webhookLog.count({ where })
      ]);
      
      // Calcular informações de paginação
      const totalPages = Math.ceil(totalCount / limit);
      
      return res.status(200).json({
        data: webhooks,
        pagination: {
          page,
          limit,
          totalCount,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      });
    } catch (error) {
      console.error('Erro ao listar webhooks:', error);
      return res.status(500).json({ error: 'Não foi possível listar os webhooks.' });
    }
  }
  
  // Método para buscar webhook por ID
  async getWebhookById(req, res) {
    try {
      const { id } = req.params;
      
      const webhook = await this.prisma.webhookLog.findUnique({
        where: {
          id: parseInt(id, 10)
        }
      });
      
      if (!webhook) {
        return res.status(404).json({ error: 'Webhook não encontrado.' });
      }
      
      // Para facilitar visualização, converter os campos JSON
      try {
        webhook.parsedHeaders = JSON.parse(webhook.requestHeaders);
        webhook.parsedBody = JSON.parse(webhook.requestBody);
      } catch (parseError) {
        console.warn('Erro ao analisar JSON do webhook:', parseError);
      }
      
      return res.status(200).json(webhook);
    } catch (error) {
      console.error('Erro ao buscar webhook:', error);
      return res.status(500).json({ error: 'Não foi possível buscar o webhook.' });
    }
  }
  
  // Método para buscar tipos de webhooks disponíveis
  async getWebhookTypes(req, res) {
    try {
      const types = await this.prisma.webhookLog.groupBy({
        by: ['notificationType'],
        _count: {
          id: true
        }
      });
      
      // Formatar a resposta
      const formattedTypes = types.map(type => ({
        type: type.notificationType || 'unknown',
        count: type._count.id
      }));
      
      return res.status(200).json(formattedTypes);
    } catch (error) {
      console.error('Erro ao buscar tipos de webhook:', error);
      return res.status(500).json({ error: 'Não foi possível buscar os tipos de webhook.' });
    }
  }

  // Mantendo comentários sobre os possíveis tipos de notificações para implementação futura
  /*
  Possíveis tipos de notificações:
  
  1. Notificações de transações (tipo 'transaction')
     - Atualizações de status de transações (aprovada, negada, etc.)
     - Informações como transaction_id, status, amount, etc.
  
  2. Notificações de PIX recebidos (tipo 'pix_received')
     - Quando um PIX é recebido em uma conta
     - Informações como amount, sender, destination_account, etc.
  
  3. Notificações de depósitos (tipo 'deposit')
     - Quando um depósito é confirmado
     - Informações como amount, account_number, etc.
     
  4. Notificações de KYC (possível tipo 'kyc_status')
     - Atualizações de status do processo de KYC
     - Informações como user_id, kyc_status, etc.
  
  A implementação específica será feita após análise das notificações reais recebidas.
  */
}

module.exports = WebhookController;
