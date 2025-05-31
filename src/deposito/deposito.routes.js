const express = require('express');
const router = express.Router();
const DepositoController = require('./deposito.controller');
const { authenticate } = require('../middleware/auth.middleware');

const depositoCtrl = new DepositoController();

// Rota para gerar QR Code para depósito via PIX
router.post('/qrcode', authenticate, (req, res) => depositoCtrl.generateQrCode(req, res));

// Rota para obter chaves PIX cadastradas
router.get('/chaves-pix', authenticate, (req, res) => depositoCtrl.getPixKeys(req, res));

// Rota para gerar boleto para depósito
router.post('/boleto', authenticate, (req, res) => depositoCtrl.generateBoleto(req, res));

module.exports = router;
