/**
 * Created by mio4kon on 17/6/30.
 */
mysql = require('mysql')
export function connect(host, port, user, password, database) {
    const connection = mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: 'root',
        port: '3306',
        database: 'test',
    });

    return new Promise((resolve, reject) => {
        // connection.connect(())
    })

}