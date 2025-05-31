const express = require('express');
const pixController = require('./pix.controller');

const router = express.Router();


// Rota para gerar chave PIX
router.post('/generate-key', pixController.generatePixKey);

// Rota para consultar chaves PIX da conta
router.get('/keys', pixController.getAccountPixKeys);

// Rota para gerar QR Code para recebimento PIX
router.post('/generate-qrcode', pixController.generateQrCode);

// Rota para consultar histórico de transações PIX
router.get('/transactions', pixController.getPixTransactions);

module.exports = router; 