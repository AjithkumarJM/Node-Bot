const sql = require('mssql');
var { sqlDbConfig } = require('./../config/config');

// for single input type stored procedure
// https://stackoverflow.com/questions/44744946/node-js-global-connection-already-exists-call-sql-close-first // refer this link for more options

getNoInputSP = (spName, callback) => {
    new sql.ConnectionPool(sqlDbConfig)
        .connect()
        .then(pool => {
            new sql.Request(pool)
                .execute(spName, (err, response) => {
                    if (err) console.log(err)

                    callback(response);
                    sql.close();
                });
        })
}

getMultipleInputSP = (input, spName, callback) => {

    // input data structure
    // input = [
    //     {
    //         componentType: "abc",
    //         componentValue: "xyz"
    //     }
    // ]

    new sql.ConnectionPool(sqlDbConfig)
        .connect()
        .then(pool => {
            let overallResponse = input.map((data, index) => {
                new sql.Request(pool)
                    .input(data.componentType, sql.VarChar, data.componentValue)
                    .execute(spName, (err, response) => {
                        if (err) console.log(err)
                        callback(response);                        
                    })
                sql.close();
            })

            return overallResponse;
        })
}

module.exports = {
    getNoInputSP,
    getMultipleInputSP,
}