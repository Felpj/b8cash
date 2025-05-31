const express = require('express');
const router = express.Router();
const WebhookController = require('./webhook.controller');

const webhookController = new WebhookController();

// Rota para configurar a URL do webhook
router.post('/setWebhook', (req, res) => webhookController.setWebhook(req, res));

// Rota para receber notificações do webhook (será configurada como URL no setWebhook)
router.post('/notifications', (req, res) => webhookController.receiveNotification(req, res));

// Rotas para consulta dos webhooks armazenados
router.get('/logs', (req, res) => webhookController.listWebhooks(req, res));
router.get('/logs/types', (req, res) => webhookController.getWebhookTypes(req, res));
router.get('/logs/:id', (req, res) => webhookController.getWebhookById(req, res));

module.exports = router;
