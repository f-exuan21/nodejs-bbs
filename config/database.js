const mysql = require('mysql');

const db_info = {
    host: 'localhost',
    port: '3306',
    user: 'root',
    password: '1234',
    database: 'mydb',
    multipleStatements: true
};

module.exports = {
    init: function() {
        return mysql.createConnection(db_info);
    }
}