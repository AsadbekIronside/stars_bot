const express = require('express');
const route = express.Router();

const controller = require('./controller');

route.post('/check', controller.prepare);

module.exports = route;