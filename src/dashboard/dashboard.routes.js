const express = require('express');
const router = express.Router();
const DashboardController = require('./dashboard.controlelr');
const { authenticate } = require('../middleware/auth.middleware');

const dashboardCtrl = new DashboardController();

// Rota para obter o saldo disponível (protegida com autenticação)
router.get('/saldo', authenticate, (req, res) => dashboardCtrl.getSaldoDisponivel(req, res));

// Rota para obter entradas e saídas (protegida com autenticação)
router.get('/entradas-saidas', authenticate, (req, res) => dashboardCtrl.getEntradasSaidas(req, res));

// Rota para obter o fluxo de caixa (protegida com autenticação)
router.get('/fluxo-caixa', authenticate, (req, res) => dashboardCtrl.getFluxoCaixa(req, res));

// Rota para obter transações recentes (protegida com autenticação)
router.get('/transacoes-recentes', authenticate, (req, res) => dashboardCtrl.getTransacoesRecentes(req, res));

// Rota para filtrar transações (protegida com autenticação)
router.get('/filtrar-transacoes', authenticate, (req, res) => dashboardCtrl.getFiltrosTransacoes(req, res));

module.exports = router;
