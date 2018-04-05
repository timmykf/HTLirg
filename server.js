
'use strict';

var express = require('express');
var app = express();
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser')
var mysql = require('mysql');
var bcrypt = require('bcrypt');
var crypto = require('crypto');
var nodemailer = require('nodemailer');
var session = require('express-session')
var gaussian = require('gaussian');
var fs = require('fs');
var ip = require('ip')
const mongoDB = require('mongodb')
const client = require('mongodb').MongoClient
const url = 'mongodb://localhost:27017/'


function randn_bm(mu, sigma) {
    var u = 0, v = 0;
    while (u === 0) u = Math.random(); //Converting [0,1) to (0,1)
    console.log(u);
    while (v === 0) v = Math.random();
    console.log(v);
    var z0 = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
    var z1 = Math.sqrt(-2 * Math.log(u)) * Math.sin(2 * Math.PI * v);

    return z0 * sigma + mu;
}

//Database

var pool = mysql.createPool({
    host: "localhost",
    user: "root",
    password: "6988",
    database: "sumdp"
});

pool.getConnection(function (err, con) {
    if (err) throw err;
    con.query("SELECT * FROM logdata", function (err, result, fields) {
        if (err) throw err;
        console.log(result);
        con.release();
    });
});

/*
  pool.getConnection(function(err,con) {
    if (err) throw err;
    console.log("Connected!");
    con.query("CREATE DATABASE sumdp", function (err, result) {
      if (err) throw err;
      console.log("Database created");
    });
});
*/
/*
  pool.getConnection(function(err,con) {
    if (err) throw err;
    console.log("Connected");
    var sql = "CREATE TABLE logdata (ID int NOT NULL AUTO_INCREMENT PRIMARY KEY, username VARCHAR(255), password VARCHAR(255), email VARCHAR(255), salt VARCHAR(255))";
    con.query(sql, function (err, result) {
      if (err) throw err;
      console.log("table created");
    });
});
*/
//initialisierung
var smtpTransport = nodemailer.createTransport({
    service: "Gmail",
    auth: {
        user: "htlblockchain.automail",
        pass: "Gert123Traud098"
    }
});

function requireLogin(req, res, next) {
    if (!req.session.username) {
        res.redirect('/login');
    } else {
        next();
    }
}

//Parse to String
var urlencodedParser = bodyParser.urlencoded({ extended: false });
//email verificaion variables
var host, link, mailOptions, rand;
var Users = [];
var sess;

//express functions (callbacks) 
app.engine('html', require('ejs').renderFile);
app.engine('htm', require('ejs').renderFile);
app.use(session({
    secret: 'loisbert',
    resave: false,
    saveUninitialized: true
}));
/*app.use(function(req,res,next){
    if(req.session && req.session.user){
        pool.getConnection(function(err,con){
            if(err) throw err;
            con.query('Select FROM logdata where email = "'+req.session.user.email
            +'"',function(err, result){
                var sqr = JSON.stringify(result);
                console.log(sqr);
                if(sqr==='[]'){
                    next();
                }else{
                    next();
                }
            })
        })
    }})*/
app.use(express.static('public'));


app.get('/index.htm', function (req, res) {
    console.log("Seite verlangt!");
    res.sendFile(__dirname + "/" + "index.htm");
})

app.get('/login', function (req, res) {
    res.render('index.htm');
})

app.get('/logout', function (req, res) {
    console.log(req.session.username);
    req.session.destroy(function (err) {
        if (err) {
            console.log(err);
            res.status(404).send('Logout unseccesfull')
        } else {
            res.redirect('/');
        }
    })
});


app.get('/', function (req, res) {
    console.log(req.session);
    if (req.session.username) {
        res.redirect("/Interface");
    }
    else { res.render("index.htm") };
})

app.get('/scripts/clientscript.js', (req, res) => {
    console.log("js benoetigt");
    res.send(fs.readFileSync('./scripts/clientscript.js', { encoding: 'utf8' }));
})

app.get('/register', function (req, res) {
    console.log("Registrierung HIERE!!!!");
    res.render('register.htm');
})

app.get('/Interface', requireLogin, function (req, res) {
    if (req.session.username) res.render('Profil.html');
    else { res.redirect("/") }
})


app.get('/get_username', function (req, res) {
    var uxn = req.session.username;
    console.log(uxn);
    res.send(uxn);
})

app.post('/process_login', urlencodedParser, function (req, res) {
    //sess = req.session;

    console.log(req.body);

    var ress = res;
    var un = req.body.first_name;
    var pw = req.body.password;

    pool.getConnection(
        function (err, con) {
            if (err) throw err;
            var sql = "SELECT password,salt FROM logdata WHERE (username='" + un + "')";
            con.query(sql, function (err, result, fields) {
                if (err) throw err;
                var strres = JSON.stringify(result).trim();
                var password = strres.substring(14, strres.length - 29);
                var salt = strres.substring(14 + password.length + 10, strres.length - 3);
                if (strres === "[]") {
                    console.log("User not found");
                    res.render('index.htm');
                }
                else {
                    var sha512 = function (password, salt) {
                        var hash = crypto.createHmac('sha512', salt);
                        hash.update(password);
                        var value = hash.digest('hex');

                        return {
                            salt: salt,
                            passwordHash: value
                        };
                    };

                    var checklog = sha512(pw, salt);
                    if (checklog.passwordHash === password) {
                        req.session.username = un;
                        res.redirect('/Interface');
                    } else {
                        res.redirect('/login');
                    }

                };

                con.release();
            });
        }
    );
});

app.get('/verifly', function (req, res) {
    console.log(req.protocol + "://" + req.get('host') + "           " + host);
    if ((req.protocol + "://" + req.get('host')) == ("http://" + host)) {
        console.log("Domain is matched. Information is from Authentic email");
        if (req.query.id == rand) {
            console.log("email is verified");
            res.end("<h1>Email " + mailOptions.to + " is been Successfully verified");
        }
        else {
            console.log("email is not verified");
            res.end("<h1>Bad Request</h1>");
        }
    }
    else {
        res.end("<h1>Request is from unknown source");
    }
});

app.post('/process_register', urlencodedParser, function (req, res) {
    console.log(req.body);
    var pw = req.body.password;

    pool.getConnection(function (err, con) {
        if (err) throw err;
        con.query("SELECT * FROM logdata WHERE (username ='"
            + req.body.username + "')", function (err, result) {
                if (err) throw err;
                console.log(result);
                var strres = JSON.stringify(result);
                if (strres === "[]") {
                    console.log("Username available");
                    con.query("SELECT * FROM logdata WHERE (email ='"
                        + req.body.email + "')", function (err, result) {
                            if (err) throw err;
                            console.log(result);
                            var stremail = JSON.stringify(result);
                            if (stremail === "[]") {
                                console.log("E-Mail available");
                                if (pw.length > 5 && pw.length < 20) {
                                    rand = Math.floor((Math.random() * 100) + 54);
                                    host = req.get('host');
                                    link = "http://" + host + "/verifly?id=" + rand;
                                    mailOptions = {
                                        to: req.body.email,
                                        subject: "Email verification",
                                        html: "Dear user, <br> Please click the following link to verify your email:<br>" + link
                                    }
                                    console.log(mailOptions);
                                    smtpTransport.sendMail(mailOptions, function (err, res) {
                                        if (err) throw err;
                                        console.log("Message sent: " + res.message);
                                    });
                                    var genRandomString = function (length) {
                                        return crypto.randomBytes(Math.ceil(length / 2))
                                            .toString('hex')
                                            .slice(0, length);
                                    };
                                    var sha512 = function (password, salt) {
                                        var hash = crypto.createHmac('sha512', salt);
                                        hash.update(password);
                                        var value = hash.digest('hex');
                                        return {
                                            salt: salt,
                                            passwordHash: value
                                        };
                                    };
                                    function saltHashPassword(userpassword) {
                                        var salt = genRandomString(16);
                                        var passwordData = sha512(userpassword, salt);
                                        console.log('UserPassword = ' + userpassword);
                                        console.log('Passwordhash = ' + passwordData.passwordHash);
                                        console.log('nSalt = ' + passwordData.salt);
                                        con.query("INSERT INTO logdata (username,password,email,salt) Values('"
                                            + req.body.username + "','"
                                            + passwordData.passwordHash + "','"
                                            + req.body.email + "','"
                                            + passwordData.salt + "')", function (err, result) {
                                                if (err) throw err;
                                                console.log("Inserted");
                                                con.release();
                                                res.redirect("/");
                                            })
                                    }
                                    saltHashPassword(pw);
                                    /*bcrypt.hash(pw,10,function(err,hash){
                                         if(err)throw err;
                                         con.query("INSERT INTO logdata (username,password,email) Values ('"
                                         +req.body.username+"','"
                                         +hash+"','"
                                         +req.body.email+"')",function(err,result){
                                             if(err)throw err;
                                             console.log("Inserted");
                                             con.release();
                                         });
                                     });*/

                                } else {
                                    console.log("Password to long/short");
                                    res.render('register.htm', { error: 'password missed' });
                                    con.release();
                                }
                            } else {
                                console.log("E-Mail taken");
                                res.render('register.htm', { error: 'email taken' });
                                con.release();
                            }
                        });
                } else {
                    console.log("Username taken");
                    res.render('register.htm', { error: 'username taken' });
                    con.release();
                }
            });
    });
});

app.post('/newTest', urlencodedParser, (req, res) => {

})

app.post('/deleteTest', urlencodedParser, (req, res) => {

})

app.post('/editTest', urlencodedParser, (req, res) => {

})

app.post('/insertGrades', urlencodedParser, (req, res) => {

})



function deleteCollectionContent(databaseName, collectionName) {
    console.log('deleteCollectionContent-function is called for database: ' + databaseName + ', Collection: ' + collectionName)
    // build up a connection to the database
    client.connect(url, function (err, db) {
        if (err) {
            console.log('Can not connect to Database: ' + databaseName)
        } else {
            console.log('Connected to Database: ' + databaseName)
            // build up a connection to the collection of the database
            var database = db.db(databaseName)
            var collection = database.collection(collectionName)
            // delete every record in the collection with key:'NameOfCollection' and value: 'collectionName'
            // and because all records have such a key/value pair, all records will be deleted
            collection.deleteMany(
                { NameOfCollection: collectionName },
                function (err, result) {
                    if (err) {
                        console.log('ContentDelete function failed')
                    } else {
                        console.log('ContentDelete function success')
                        db.close()
                    }})}})}

var server = app.listen(8081, ip.address(), function () {
    var host = server.address().address
    console.log(host);
    var port = server.address().port
    console.log("Example app listening at http://%s:%s", host, port)
    // calls deleteCollectionContent with Parameters, databasename: studentDB and collectionName: studentCol
    deleteCollectionContent('studentDB', 'studentCol')
    // create Student Database + 'studentCol' collection
    client.connect(url, function (err, db) {
        if (err) {
            console.log('Unable to create Student Database')
            console.log(err)
        } else {
            console.log('Student Database created')
            // create in Student Database a collection called StudentCol
            var studentDB = db.db('studentDB')
            studentDB.createCollection('studentCol', function (err, res) {
                if (err) {
                    console.log('Unable to create studentCol-collection')
                } else {
                    console.log('studentCol Collection created')
                    // Data for the collection of the student database
                    let studentList = [
                        { studentID: 1, firstname: 'Johannes', lastname: 'Aigner', NameOfCollection: 'studentCol' },
                        { studentID: 2, firstname: 'Simon', lastname: 'Angleitner', NameOfCollection: 'studentCol' },
                        { studentID: 3, firstname: 'Mathias', lastname: 'Asamer', NameOfCollection: 'studentCol' },
                        { studentID: 4, firstname: 'Julian', lastname: 'Bachinger', NameOfCollection: 'studentCol' },
                        { studentID: 5, firstname: 'David', lastname: 'Diermayr', NameOfCollection: 'studentCol' },
                        { studentID: 6, firstname: 'Franziska', lastname: 'Ertl', NameOfCollection: 'studentCol' },
                        { studentID: 7, firstname: 'Lukas', lastname: 'Fehkuehrer', NameOfCollection: 'studentCol' },
                        { studentID: 8, firstname: 'Lukas', lastname: 'Friedl', NameOfCollection: 'studentCol' },
                        { studentID: 9, firstname: 'Stefan', lastname: 'Gruenzinger', NameOfCollection: 'studentCol' },
                        { studentID: 10, firstname: 'Alexander', lastname: 'Kraemer', NameOfCollection: 'studentCol' },
                        { studentID: 11, firstname: 'Alexander', lastname: 'Leimer', NameOfCollection: 'studentCol' },
                        { studentID: 12, firstname: 'Arastu', lastname: 'Moatazedy', NameOfCollection: 'studentCol' },
                        { studentID: 13, firstname: 'Maximilian', lastname: 'Reisecker', NameOfCollection: 'studentCol' },
                        { studentID: 14, firstname: 'Florian', lastname: 'Schachermair', NameOfCollection: 'studentCol' },
                        { studentID: 15, firstname: 'Martin', lastname: 'Schachl', NameOfCollection: 'studentCol' },
                        { studentID: 16, firstname: 'Wolfgang', lastname: 'Schwendtbauer', NameOfCollection: 'studentCol' },
                        { studentID: 17, firstname: 'Leon', lastname: 'Stempfer', NameOfCollection: 'studentCol' },
                        { studentID: 18, firstname: 'Matthias', lastname: 'Weingartner', NameOfCollection: 'studentCol' },
                        { studentID: 19, firstname: 'Philipp', lastname: 'Weiß', NameOfCollection: 'studentCol' },
                        { studentID: 20, firstname: 'Elias', lastname: 'Wollitzer', NameOfCollection: 'studentCol' },
                        { studentID: 21, firstname: 'Michael', lastname: 'Zweimueller', NameOfCollection: 'studentCol' },
                    ]
                    // create accessing to the StudentCol collection
                    studentDB.collection('studentCol', function (err, collection) {
                        if (err) {
                            console.log('Can not resolve studentCol-collection of Student Database')
                        } else {
                            console.log('students-collection of Student Database resolved')
                            // instert data of studentList Array to the StudentCol collection
                            for (let i = 0; i < studentList.length; i++) {
                                collection.insert(studentList[i], function (err, result) {
                                    if (err) {
                                        console.log('Insert data in studentCol-collection failed')
                                    } else {
                                        console.log(result)
                                    }
                                })
                            }
                            db.close()
                        }
                    })
                }
            })
        }
    })
})
})


