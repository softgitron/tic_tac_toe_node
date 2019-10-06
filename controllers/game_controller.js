MongoClient = require('mongodb');

const mongo_database_url = "mongodb://localhost:27017/";
const collection_name = "games";


// Initialize database if needed
exports.initialize = function (req, next) {
    // Try to connecto to the database and create database and collection if needed
    // https://www.w3schools.com/nodejs/nodejs_mongodb_create_db.asp
    MongoClient.connect(mongo_database_url, function (err, db) {
        if (err) throw err;
        // https://stackoverflow.com/questions/21023982/how-to-check-if-a-collection-exists-in-mongodb-native-nodejs-driver
        db.listCollections({ name: collection_name })
            .next(function (err, collinfo) {
                if (err) throw err;
                if (collinfo) {
                    // The collection exists
                    db.close();
                }
                else {
                    // Create collection
                    let dbo = db.db(collection_name);
                    dbo.createCollection(collection_name, function (err, res) {
                        if (err) throw err;
                        console.log("Games collection created!");
                        db.close();
                    });
                }
            });
    }); 6
};
exports.load = function (req, res) {
    // No cookie for a session return error
    if (!req.session.identifier) {
        return res.status(401).json({ error: "Cookie must be supplied!" });
    }
    // If cookie is found return database data to client
    query = { identifier: req.session.identifier }
    db_functions("query", query, null, function (results, query) {
        if (results.length === 1) {
            return res.status(200).json(results[0].data);
        }
        else {
            return res.status(404).json({ "error": "Database entity is missing!" });
        }
    });
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
    if (!req.session.identifier) {
        get_new_identifier(function (new_identfier) {
            req.session.identifier = new_identfier;
            data = { data: req.body, identifier: req.session.identifier };
            query = { identifier: req.session.identifier }
            db_functions("insert", null, data, function () { });
            return res.status(200).json({ "success": "Created Successfully" });
        });
    }
    else {
        data = { data: req.body, identifier: req.session.identifier };
        query = { identifier: req.session.identifier }
        db_functions("update", query, data, function () { });
        return res.status(200).json({ "success": "Updated Successfully" });
    }
};

function get_new_identifier(callback) {
    let new_identifier;
    // Get new random session identifier
    new_identfier = Math.random().toString();
    let query = { identifier: new_identfier }
    // Check that identifier is unique
    db_functions("query", query, null, function (results, query) {
        if (results.length == 0) {
            callback(query.identifier);
        }
        else {
            get_new_identifier();
        }
    });
}

// Database commands
function db_functions(mode, query, data, callback) {
    MongoClient.connect(mongo_database_url, function (err, db) {
        if (err) throw err;
        let dbo = db.db(collection_name);
        if (mode === "query") {
            // https://www.w3schools.com/nodejs/nodejs_mongodb_query.asp
            dbo.collection(collection_name).find(query).toArray(function (err, result) {
                if (err) throw err;
                db.close();
                callback(result, query);
            });
        }
        else if (mode === "insert") {
            // https://www.w3schools.com/nodejs/nodejs_mongodb_insert.asp
            dbo.collection(collection_name).insertOne(data, function (err, res) {
                if (err) throw err;
                db.close();
                callback(null);
            });
        }
        else if (mode === "update") {
            // https://www.w3schools.com/nodejs/nodejs_mongodb_update.asp
            dbo.collection(collection_name).updateOne(query, data, function (err, res) {
                if (err) throw err;
                db.close();
                callback(null);
            });
        }
    });
}