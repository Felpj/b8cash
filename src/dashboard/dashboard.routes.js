const express = require('express');
const router = express.Router();
const DashboardController = require('./dashboard.controlelr');
const { authenticate } = require('../middleware/auth.middleware');

const dashboardCtrl = new DashboardController();

// Rota para obter o saldo disponível
router.get('/saldo', (req, res) => dashboardCtrl.getSaldoDisponivel(req, res));

// Rota para obter entradas e saídas
router.get('/entradas-saidas', (req, res) => dashboardCtrl.getEntradasSaidas(req, res));

// Rota para obter o fluxo de caixa
router.get('/fluxo-caixa', (req, res) => dashboardCtrl.getFluxoCaixa(req, res));

// Rota para obter transações recentes
router.get('/transacoes-recentes', (req, res) => dashboardCtrl.getTransacoesRecentes(req, res));

// Rota para filtrar transações
router.get('/filtrar-transacoes', (req, res) => dashboardCtrl.getFiltrosTransacoes(req, res));

module.exports = router;
