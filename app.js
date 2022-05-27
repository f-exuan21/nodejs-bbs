var express = require('express');
var path = require('path');
var member = require('./routes/member');
var bbs = require('./routes/bbs');
var ejs = require('ejs');

var app = express();

// member를 사용하기 위해 export 한 것을 import 한다. == router 등록
app.use(member);

// 정적 파일 사용 선언
app.use(express.static(path.join(__dirname, 'public')));

// bbs 사용
app.use(bbs);

// views 폴더(html, ejs)를 인식
app.set("views", __dirname + "/views");

// html, ejs를 사용
app.engine("html", ejs.renderFile);
app.set("view engine", "ejs");

app.get("/", (req, res) => {
    res.redirect("./login");
})

var port = 8090;
var server = app.listen(port, (req, res) => {
    console.log(`server is running... port: ${port}`);
});

