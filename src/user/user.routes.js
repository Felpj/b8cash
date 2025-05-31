const express = require('express');
const userController = require('./user.controller');
const { authenticate } = require('../middleware/auth.middleware');

const router = express.Router();

router.post('/users', (req, res) => userController.createUser(req, res));
router.get('/users', authenticate, (req, res) => userController.getAllUsers(req, res));
router.get('/users/:id', (req, res) => userController.getUserById(req, res));
router.put('/users/:id', (req, res) => userController.updateUser(req, res));
router.delete('/users/:id', (req, res) => userController.deleteUser(req, res));
router.post('/register', (req, res) => userController.createUser(req, res));

module.exports = router;
