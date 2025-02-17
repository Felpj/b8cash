const express = require('express');
const router = express.Router();
const TcrController = require('./tcr.controller');
const { authenticate } = require('../middleware/auth.middleware');

const tcrController = new TcrController();

router.post('/sendPix',  (req, res) => tcrController.sendPix(req, res)); 
router.post('/sendTed',  (req, res) => tcrController.sendTed(req, res)); 
router.post('/generatePixKey',  (req, res) => tcrController.generatePixKey(req, res));
router.post('/createUserAccount',  (req, res) => tcrController.createUserAccount(req, res));
router.post('/getTransactions',  (req, res) => tcrController.getTransactions(req, res)); 
router.get('/getAccountData',  (req, res) => tcrController.getAccountData(req, res)); 
router.get('/getKeyData',  (req, res) => tcrController.getKeyData(req, res)); 
router.get('/getAccountPixKeys',  (req, res) => tcrController.getAccountPixKeys(req, res)); 
router.get('/getAccountBalance',  (req, res) => tcrController.getAccountBalance(req, res)); 

module.exports = router;
