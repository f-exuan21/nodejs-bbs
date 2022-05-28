const mysql = require('mysql');

const db_info = {
    host: 'localhost',
    port: '3306',
    user: 'root',
    password: 'chend221!',
    database: 'mydb',
    multipleStatements: true
};

module.exports = {
    init: function() {
        return mysql.createConnection(db_info);
    }
}
