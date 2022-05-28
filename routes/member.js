var express = require('express');
var app = express.Router();
var session = require('express-session');

// session 사용
app.use(session({
    secret: '12345',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }
}));

// DB
var db_config = require('../config/database');
var conn = db_config.init();

// parameter를 받기 위한 설정
var bodyParser = require('body-parser');
app.use(bodyParser.urlencoded( {extended:true} ));

app.get('/login', (req, res) => {
    res.render('login.html');
});

app.post('/login', (req, res) => {
    var sql = "SELECT ID, NAME, EMAIL FROM MEMBER WHERE ID = ? AND PWD = ?";
    var params = [ req.body.id, req.body.pwd ];

    conn.query(sql, params, (err, results, fields) => {
        if(err) console.log(err);

        if(results.length == 0) {
            res.send({result: "NO"});
        }else {
            req.session.member = results[0];
            res.send({result: "OK",
                    member: results[0]});
        }
    });
});

app.get('/regi', (req, res) => {
    res.render('regi.html');
});

app.post('/regi', (req, res) => {
    var sql = "INSERT INTO MEMBER VALUE(?, ?, ?, ?, 3)";
    var params = [ req.body.id, req.body.pwd, req.body.name, req.body.email ];

    conn.query(sql, params, (err, result, fields) => {
        if(err) {
            res.send({result: "NO"});
        }else {
            res.send({result: "OK"});
        }
    });
});

app.post('/checkId', (req, res) => {

    var sql = 'SELECT COUNT(1) AS cnt FROM MEMBER WHERE ID = ?';
    var param = [ req.body.id ];

    conn.query(sql, param, (err, result, fields) => {
        if(err) throw err;

        if(result[0].cnt == 0) {
            res.send({result: "OK"});
        }else {
            res.send({result: "NO"});
        }
    });
});

app.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        if(err) console.log(err);
        res.redirect("./login");
    });
})

module.exports = app;
