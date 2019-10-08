// This program is heavily inspired by Antti Knutas Node demo:
// https://bitbucket.org/aknutas/www-demos/src/master/expressjs-sample/

// Import required modules
let express = require('express'),
  app = express(),
  cookieSession = require('cookie-session'),
  createError = require('http-errors'),
  path = require('path'),
  cookieParser = require('cookie-parser'),
  game_controller = require('./controllers/game_controller'),
  port = process.env.PORT || process.env.OPENSHIFT_NODEJS_PORT || 8080,
  ip   = process.env.IP   || process.env.OPENSHIFT_NODEJS_IP || '0.0.0.0';

// Initialize database if required
game_controller.initialize();

// Prepare Cookies
// https://expressjs.com/en/resources/middleware/cookie-session.html
app.set('trust proxy', 1);
app.use(cookieSession({
  name: 'session',
  keys: ["secret1", "hello"],
  // Cookie will persist 3 months
  maxAge: 24 * 60 * 60 * 1000 * 90
}))

// Set static folder to public
app.use(express.static('static'))
// Setup express to utilize views
app.set('views', path.join(__dirname, 'views'));
// Set viewengine to pug
app.set('view engine', 'pug');

// Setup express additional features
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

// Set views as public folder
app.use(express.static(path.join(__dirname, 'public')));


// Define routes
let indexRouter = require('./routes/index');
let gameRouter = require('./routes/game');

// Initialize routes
app.use('/', indexRouter);
app.use('/api', gameRouter)

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

app.listen(port, ip, () => console.log(`Tic Tac Toe app listening on port ${port}!`))
module.exports = app;