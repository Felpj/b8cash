const express = require('express');
const pixController = require('./pix.controller');
const { authenticate } = require('../middleware/auth.middleware');

const router = express.Router();


// Rota para gerar chave PIX (protegida com autenticação)
router.post('/generate-key', authenticate, pixController.generatePixKey);

// Rota para consultar chaves PIX da conta (protegida com autenticação)
router.get('/keys', authenticate, pixController.getAccountPixKeys);

// Rota para consultar dados de uma chave PIX específica (protegida com autenticação)
router.post('/key-data', authenticate, pixController.getKeyData);

// Rota para gerar QR Code para recebimento (protegida com autenticação)
router.post('/generate-qrcode', authenticate, pixController.generateQrCode);

// Rota para consultar histórico de transações PIX (protegida com autenticação)
router.get('/transactions', authenticate, pixController.getPixTransactions);

module.exports = router; 