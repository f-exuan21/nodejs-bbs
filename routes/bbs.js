var express = require('express');
var app = express.Router();

// DB
var db_config = require('../config/database');
var conn = db_config.init();

// parameter를 받기 위한 설정
var bodyParser = require('body-parser');
app.use(bodyParser.urlencoded( {extended:true} ));

// interceptor
app.use(function(req, res, next) {
    //console.log("Interceptor : " + req.originalUrl);
    //console.log("session : " + req.session)

    if(req.session.member == undefined) {
        res.redirect("/login");
    }else {
        next();
    }
});


app.get("/bbslist", (req, res) => {
    res.render('bbslist.ejs', {search: req.query.search, choice: req.query.choice});
});

app.post("/bbslist", (req, res) => {
    var search = req.body.search;
    var choice = req.body.choice;
    var pageNumber = req.body.pageNumber;

    var start = 1 + 10 * (pageNumber - 1);
    var end = 10 + 10 * (pageNumber - 1);

    var sql = `SELECT SEQ, ID, REF, STEP, DEPTH, TITLE, CONTENT, WDATE, DEL, READCOUNT \
                FROM ( \
                    SELECT ROW_NUMBER() OVER(ORDER BY REF DESC, STEP ASC) AS RNUM, \
                    SEQ, ID, REF, STEP, DEPTH, TITLE, CONTENT, WDATE, DEL, READCOUNT \
                        FROM BBS A \
                    WHERE ${choice} LIKE "%${search}%"`
    if(search != '') {
        sql += "AND DEL = 0 ";
    }
    sql += `ORDER BY REF DESC, STEP ASC) B
            WHERE B.RNUM BETWEEN ${start} AND ${end}`;

    conn.query(sql, (err, results, _) => {
        res.send(results);
    });
});

app.post("/getAllPages", (req, res) => {
    var choice = req.body.choice;
    var search = req.body.search;

    var sql = `SELECT COUNT(1) AS CNT FROM BBS WHERE ${choice} LIKE "%${search}%" `;

    if(search != '') {
        sql += "AND DEL = 0 ";
    }

    conn.query(sql, (err, results, _) => {
        res.send({"cnt" : results[0].CNT})
    });


});

app.get("/detail", (req, res) => {

    var sql1 = "SELECT * FROM BBS WHERE SEQ = ? AND DEL = 0;";
    var sql2 = "UPDATE BBS SET READCOUNT = READCOUNT + 1 WHERE SEQ = ? AND DEL = 0;";
    var params = [ req.query.seq ];

    var formatSql1 = conn.format(sql1, params);
    var foramtSql2 = conn.format(sql2, params);

    conn.query(foramtSql2 + formatSql1, params, (err, results, fields) => {
        if(err) console.log(err);
        if(results[1].length == 1){
            res.render("bbsdetail.ejs", {
                seq: results[1][0].SEQ,
                title: results[1][0].TITLE,
                wdate: results[1][0].WDATE,
                info: results[1][0].REF + "-" + results[1][0].STEP + "-" + results[1][0].DEPTH,
                readcount: results[1][0].READCOUNT,
                id: results[1][0].ID,
                content: results[1][0].CONTENT,
                loginId: req.session.member[0].ID});
            }
    });
})

app.get("/write", (req, res) => {
    res.render("bbswrite.ejs", {id: req.session.member[0].ID})
});

app.post("/write", (req, res) => {
    var sql = "INSERT INTO BBS(ID, REF, STEP, DEPTH, TITLE, CONTENT, WDATE, DEL, READCOUNT) \
               VALUES(?, (SELECT IFNULL(MAX(REF), 0)+1 FROM BBS a), 0, 0, ?, ?, NOW(), 0, 0)";
    var params = [ req.session.member[0].ID, req.body.title, req.body.content ];

    conn.query(sql, params, (err, results, fields) => {
        if(err) console.log(err);
        if(results.affectedRows == 1) {
            res.send({result: "OK"});
        }else {
            res.send({result: "NO"});
        }
    });
});

app.post("/delete", (req, res) => {
    var sql = "UPDATE BBS SET DEL=1 WHERE ID = ? AND SEQ = ?";
    var params = [ req.session.member[0].ID, req.body.seq ];

    conn.query(sql, params, (err, results, _) => {
        if(err) console.log(err);

        if(results.affectedRows == 1) {
            res.send({result: "OK"});
        }else {
            res.send({result: "NO"});
        }
    });
});

app.get("/update", (req, res) => {
    var sql = "SELECT * FROM BBS WHERE SEQ = ? AND ID = ?";
    var params = [ req.query.seq, req.session.member[0].ID ];

    conn.query(sql, params, (err, results, _) => {
        if(err) console.log(err);

        if(results.length == 1) {
            res.render("bbsupdate.ejs", {
                id: results[0].ID,
                title: results[0].TITLE,
                content: results[0].CONTENT,
                seq: results[0].SEQ
            });
        }
    });
});

app.post("/update", (req, res) => {
    var sql = "UPDATE BBS SET TITLE = ?, CONTENT = ? WHERE ID = ? AND SEQ = ? AND DEL = 0";
    var params = [ req.body.title, req.body.content, req.session.member[0].ID, req.body.seq ];

    conn.query(sql, params, (err, results, _) => {
        if(err) console.log(err);

        if(results.affectedRows == 1) {
            res.send({result: "OK"});
        }else {
            res.send({result: "NO"});
        }
    });
});

app.get("/answer", (req, res) => {
    var sql = "SELECT * FROM BBS WHERE SEQ = ? AND DEL = 0";
    var params = [ req.query.seq ];

    conn.query(sql, params, (err, results, _) => {
        if(err) console.log(err);
        res.render("bbsanswer.ejs", {
                seq: results[0].SEQ,
                title: results[0].TITLE,
                wdate: results[0].WDATE,
                info: results[0].REF + "-" + results[0].STEP + "-" + results[0].DEPTH,
                readcount: results[0].READCOUNT,
                id: results[0].ID,
                content: results[0].CONTENT,
                loginId: req.session.member[0].ID
            });
    });
});

app.post("/answer", (req, res) => {
    var sql1 = "UPDATE BBS \
                   SET STEP = STEP + 1 \
                 WHERE REF = (SELECT REF FROM (SELECT REF FROM BBS a WHERE SEQ = ?) A) \
                   AND STEP > (SELECT STEP FROM (SELECT STEP FROM BBS b WHERE SEQ = ?) B); ";
    var sql2 = "INSERT INTO BBS(ID, REF, STEP, DEPTH, TITLE, CONTENT, WDATE, DEL, READCOUNT) "
            +  "VALUES (?, "
            +           "(SELECT REF FROM BBS a WHERE SEQ = ?), "
            +           "(SELECT STEP FROM BBS a WHERE SEQ = ?) + 1, "
            +           "(SELECT DEPTH FROM BBS a WHERE SEQ = ?) + 1, "
            +           "?, "
            +           "?, "
            +           "NOW(), "
            +           "0, "
            +           "0);";
    var params1 = [ req.body.seq, req.body.seq ];
    var params2 = [ req.session.member[0].ID, req.body.seq, req.body.seq, req.body.seq,
                    req.body.title, req.body.content ];

    var formatSql1 = conn.format(sql1, params1);
    var formatSql2 = conn.format(sql2, params2);

    conn.query(formatSql1 + formatSql2, (err, results, _) => {
        if(err) console.log(err);
        if(results[1].affectedRows == 1)
            res.send({result: "OK", seq: results[1].insertId});
        else
            res.send({result: "NO"});
    });
});

app.post("/save-comment", (req, res) => {
    var sql = "INSERT INTO COMMENT(ID, BOARD_SEQ, CONTENT, DEL, WDATE) \
               VALUES (?, ?, ?, 0, NOW())";
    var params = [ req.session.member[0].ID, req.body.board_seq, req.body.content ];

    conn.query(sql, params, (err, results, _) => {
        if(err) console.log(err);
        if(results.affectedRows == 1) {
            res.send({result: "OK"});
        }else {
            res.send({result: "NO"});
        }
    });
});

app.post("/get-comment-list", (req, res) => {
    var sql = "SELECT * FROM COMMENT WHERE BOARD_SEQ = ? ORDER BY WDATE DESC";
    var params = [ req.body.board_seq ];

    conn.query(sql, params, (err, results, _) => {
        if(err) console.log(err);
        if(results.length > 0) {
            res.send({result: "OK", datas: results, loginID: req.session.member[0].ID});
        }else {
            res.send({result: "NO"});
        }
    })
});

app.post("/delete-comment", (req, res) => {
    var sql = "UPDATE COMMENT SET DEL = 1 WHERE SEQ = ? AND ID = ?";
    console.log(req.body.seq, req.session.member[0].ID );
    var params = [ req.body.seq, req.session.member[0].ID ];

    conn.query(sql, params, (err, results, _) => {
        if(err) console.log(err);
        console.log(results);
        if(results.affectedRows == 1) {
            res.send({result: "OK"});
        }else {
            res.send({result: "NO"});
        }
    });
})

module.exports = app;
