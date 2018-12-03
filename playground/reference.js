const db = require("./../db");
const logger = require("../../config/logger");

let getSingleResult = async (request) => {
    logger.info("Execute Single result");

    const connection = db.connection;
    var responseObj = {};
    var dataset = [];
    return new Promise((resolve) => {

        request.on('row', function (columns) {
            columns.forEach(function (column) {
                // console.log("rows");
                /* dataset.push({
                // responseObj[column.metadata.colName] = column.value
                colName:column.metadata.colName
                ,value:column.value
                    
                }); */
                responseObj[column.metadata.colName] = column.value;
            });

        });
        request.on('requestCompleted', function () {

            resolve(responseObj);
        });
        connection.callProcedure(request);
    }).then((response) => {
        // console.log("sp execu resp")
        // console.log(response);
        return response;
    }).catch((err) => {

        throw err;
    });
};

let getSPResult = async (request) => {
    logger.info("Execute SP");

    const connection = db.connection;

    var dataset = [];
    var i = 0;
    return new Promise((resolve) => {

        request.on('row', function (columns) {
            var responseObj = {};
            // console.log(columns);
            columns.forEach(function (column) {

                // console.log("rows");
                /* dataset.push({
                // responseObj[column.metadata.colName] = column.value
                colName:column.metadata.colName
                ,value:column.value
                
                }); */
                responseObj[column.metadata.colName] = column.value;
            });
            // var temp = responseObj;
            // console.log(temp);
            dataset.push(responseObj);
            // console.log(dataset);
        });
        request.on('requestCompleted', function () {
            resolve(dataset);
        });
        connection.callProcedure(request);
    }).then((response) => {
        // console.log("sp execu resp")
        // console.log(response);
        return response;
    }).catch((err) => {

        throw err;
    });
};
let executeRequest = async (request) => {
    logger.info("Execute Request");
    const connection = db.connection;
    return new Promise((resolve) => {
        request.on('row', function (columns) {
            logger.info("Request Processing");
        });
        request.on('requestCompleted', function () {
            logger.info('Request Completed');
            resolve();
        });
        connection.execSql(request);
    }).then(() => {
        return true;
    }).catch((err) => {
        throw err;
    });
};
exports.executeRequest = executeRequest;
exports.getSPResult = getSPResult;
exports.getSingleResult = getSingleResult;