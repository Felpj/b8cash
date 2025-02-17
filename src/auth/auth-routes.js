// auth.module.js
const express = require('express');
const auth = require('./auth-controller');

const router = express.Router();

// Configurar rotas de autenticação
router.post('/login', (req, res) => auth.login(req, res));

module.exports = router;
