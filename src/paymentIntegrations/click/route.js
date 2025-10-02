const express = require('express');
const route = express.Router();

const controller = require('./controller');

route.post('/prepare', controller.prepare.bind(controller));
route.post('/complete', controller.complete.bind(controller));

module.exports = route;