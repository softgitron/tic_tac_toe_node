var express = require('express');
var router = express.Router();

/* Render main page */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Tic Tac Toe by Roni' });
});

module.exports = router;