const express = require('express');
const router = express.Router();
const b8cashController = require('./b8cash.controller');
const { authenticate } = require('../middleware/auth.middleware');

const b8cashCtrl = new b8cashController();

router.post('/sendPix',  (req, res) => b8cashCtrl.sendPix(req, res)); 
router.post('/sendTed',  (req, res) => b8cashCtrl.sendTed(req, res)); 
router.post('/generatePixKey',  (req, res) => b8cashCtrl.generatePixKey(req, res));
router.post('/createUserAccount',  (req, res) => b8cashCtrl.createUserAccount(req, res));
router.post('/generateDepositQrCode', (req, res) => b8cashCtrl.generateDepositQrCode(req, res));
router.post('/getQRCodeData', (req, res) => b8cashCtrl.getQRCodeData(req, res));
router.post('/getKeyData', (req, res) => b8cashCtrl.getKeyData(req, res));
router.get('/getTransactions',  (req, res) => b8cashCtrl.getTransactions(req, res));
router.get('/getAccountData',  (req, res) => b8cashCtrl.getAccountData(req, res)); 
router.get('/getAccountPixKeys',  (req, res) => b8cashCtrl.getAccountPixKeys(req, res)); 
router.get('/getAccountBalance',  (req, res) => b8cashCtrl.getAccountBalance(req, res)); 

module.exports = router;
