Okd = require('./okd');

const collection_name = "games";
let database;



// Initialize database if needed
exports.initialize = function (req, next) {
    // Try to connecto to the database and create database and collection if needed
    // https://www.w3schools.com/nodejs/nodejs_mongodb_create_db.asp
    Okd.initDb(function (err, db) {
        if (err) {
            console.log("Database connection failed. This is okay in testing. Otherwice not. Check that you have defined database_name and database_password.")
            return;
        }
        // https://stackoverflow.com/questions/21023982/how-to-check-if-a-collection-exists-in-mongodb-native-nodejs-driver
        db.listCollections({ name: collection_name })
            .next(function (err, collinfo) {
                if (err) throw err;
                if (collinfo) {
                    // The collection exists
                }
                else {
                    // Create collection
                    let dbo = db.db(collection_name);
                    dbo.createCollection(collection_name, function (err, res) {
                        if (err) throw err;
                        console.log("Games collection created!");
                    });
                }
            });
        database = db;
    });
};
exports.load = function (req, res) {
    // This is a bad coding but exercise was a bit bad too
    // There is no way to implament proper multiplayer without proper login system.
    // So this is a multiplayer made only for two players.
    // No cookie for a session make a new cookie
    if (!req.session.identifier || req.session.identifier === undefined) {
        get_new_identifier(function (new_identfier) {
            req.session.identifier = new_identfier;
            // query = { $or: [{ x: req.session.identifier }, { o: req.session.identifier }] }
            // Check is there allready game running
            query = { x: { $exists: true, $not: { $size: 0 } } };
            db_functions("query", query, null, function (results, query) {
                if (results.length === 1) {
                    // If game is running join game if is not full
                    if (results[0].o != null) {
                        return res.status(401).json({ "error": "Game is allready runnign try again later." });
                    }
                    // Set game to active
                    results[0].data.ended = false;
                    results[0].data.turn = "x";
                    data = { timestamp: get_time(), x: results[0].x, o: new_identfier, data: results[0].data };
                    query = { x: { $exists: true, $not: { $size: 0 } } };
                    db_functions("update", query, data, function () {
                        return res.status(200).json(results[0].data);
                    });
                }
                else {
                    // If game does not run start new game
                    initial_data = { "table": [["", "", "", "", ""], ["", "", "", "", ""], ["", "", "", "", ""], ["", "", "", "", ""], ["", "", "", "", ""]], "turn": "n", "ended": true, "you": "x" };
                    data = { timestamp: get_time(), x: new_identfier, o: null, data: initial_data };
                    db_functions("insert", null, data, function () { 
                        return res.status(200).json(initial_data);
                    });
                }
            });
        });
    }
    else {
        // If cookie is found return database data to client
        query = { $or: [{ x: req.session.identifier }, { o: req.session.identifier }] }
        db_functions("query", query, null, function (results, query) {
            if (results.length === 1) {
                if (results[0].x === req.session.identifier) {
                    results[0].data.you = "x";
                } else {
                    results[0].data.you = "o";
                }
                // Update timestamp
                // https://www.djamware.com/post/58578ab880aca715e80d3caf/mongodb-simple-update-document-example
                data = {$set: {timestamp: get_time()}};
                db_functions("update", query, data, function () { });
                return res.status(200).json(results[0].data);
            }
            else {
                req.session.identifier = undefined;
                return res.status(404).json({ "error": "Database entity is missing!" });
            }
        });
    }
}

// Handle game status save on POST.
exports.save = function (req, res) {
    console.log(req.body);
    let identifier = "0";
    let data
    let query
    // Prepare element that will get to database
    // Format is data and identifier (user cookie)
    // Data consists of matrix of tics and toes and player turn variable
    // Check cookie
    query = { $or: [{ x: req.session.identifier }, { o: req.session.identifier }] }
    db_functions("query", query, null, function (results, query) {
        if (results.length === 0) {
            return res.status(401).json({ "error": "No proper cookie!" });
        }
        if (req.session.identifier === results[0].x && results[0].data.turn === "o" ||
            req.session.identifier === results[0].o && results[0].data.turn === "x") {
            return res.status(401).json({ "error": "Cauht from cheating" });
        }
        query = { $or: [{ x: req.session.identifier }, { o: req.session.identifier }] }
        data = { timestamp: get_time(), x: results[0].x, o: results[0].o, data: req.body };
        db_functions("update", query, data, function () { });
        return res.status(200).json({ "success": "Updated Successfully" });
    });
};

exports.restart = function (req, res) {
    query = { x: { $exists: true, $not: { $size: 0 } } };
    db_functions("query", query, null, function (results, query) {
        if (results.length === 1) {
            // If game does not run start new game
            initial_data = { "table": [["", "", "", "", ""], ["", "", "", "", ""], ["", "", "", "", ""], ["", "", "", "", ""], ["", "", "", "", ""]], "turn": "x", "ended": false, "you": "x" };
            query = { $or: [{ x: req.session.identifier }, { o: req.session.identifier }] }
            data = { timestamp: get_time(), x: results[0].x, o: results[0].o, data: initial_data};
            db_functions("update", query, data, function () { 
                return res.status(200).json(initial_data);
            });
        }
        else {
            return res.status(401).json({ "error": "Invalid state cant't restart" });
        }
    });
}

exports.auto_clean = function () {
    // Autoclean inactive sessions that are older 20 seconds
    let timestamp = get_time();
    // https://docs.mongodb.com/manual/reference/operator/query/lt/
    let query = {timestamp: {$lt: timestamp - 20*1000} }
    db_functions("delete", query, null, function () { });
};

function get_new_identifier(callback) {
    // Get new random session identifier
    let new_identfier = Math.random().toString();
    let query = { $or: [{ x: new_identfier }, { o: new_identfier }] }
    // Check that identifier is unique
    db_functions("query", query, null, function (results, query) {
        if (results.length == 0) {
            callback(query.$or[0].x);
        }
        else {
            get_new_identifier();
        }
    });
}

// Database commands
function db_functions(mode, query, data, callback) {
    let dbo = database.db(collection_name);
    if (mode === "query") {
        // https://www.w3schools.com/nodejs/nodejs_mongodb_query.asp
        dbo.collection(collection_name).find(query).toArray(function (err, result) {
            if (err) throw err;
            callback(result, query);
        });
    }
    else if (mode === "insert") {
        // https://www.w3schools.com/nodejs/nodejs_mongodb_insert.asp
        dbo.collection(collection_name).insertOne(data, function (err, res) {
            if (err) throw err;
            callback(null);
        });
    }
    else if (mode === "update") {
        // https://www.w3schools.com/nodejs/nodejs_mongodb_update.asp
        dbo.collection(collection_name).updateOne(query, data, function (err, res) {
            if (err) throw err;
            callback(null);
        });
    }
    else if (mode === "delete") {
        // https://www.w3schools.com/nodejs/nodejs_mongodb_delete.asp
        dbo.collection(collection_name).deleteOne(query, function (err, res) {
            if (err) throw err;
            callback(null);
        });
    }
}

function get_time() {
    let date = new Date();
    return date.getTime();
}