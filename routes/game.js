let express = require('express');
let router = express.Router();

// Require controllers
let game_controller = require('../controllers/game_controller');

const { sanitizeBody, body, check, validationResult } = require('express-validator');

// GET game status based on cookie
router.get('/get_status', game_controller.load);

// Sanitize call and then save results to database
// https://express-validator.github.io/docs/
router.post("/save_status", [
    // Sanitize input JSON
    // sanitizeBody('*').trim().escape(),
    body("table").isArray({ min: 5, max: 5, number: 5 }),
    body("turn").custom(value => typeof value === "string" && value === "x" || value === "o"),
    body("ended").isBoolean()
], (req, res) => {

    // Finds the validation errors in this request and wraps them in an object with handy functions
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(422).json({ errors: errors.array() });
    }
    else {
        game_controller.save(req, res)
    }
});
module.exports = router;