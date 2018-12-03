const restify = require('restify');
const express = require('express');
const builder = require('botbuilder');
const botbuilder_azure = require("botbuilder-azure");
const sql = require('mssql');

var { messages, buttonData } = require('./server/messages/messages');
var {
    luisAPIKey,
    luisAppId,
    storageName,
    storageKey,
    appId,
    sqlDbConfig,
    luisAPIHostName,
    appPassword,
    openIdMetadata
} = require('./server/config/config');

// var server = restify.createServer();
var server = express();
var port = process.env.port || process.env.PORT || 3978;

server.listen(port, () => {
    // console.log('%s listening to %s', server.name, server.url);
    console.log('server is running')
});

// Create chat connector for communicating with the Bot Framework Service
var connector = new builder.ChatConnector({
    appId,
    appPassword,
    openIdMetadata
});

// Listen for messages from users 
server.post('/api/messages', connector.listen());

/*----------------------------------------------------------------------------------------
* Bot Storage: This is a great spot to register the private state storage for your bot. 
* We provide adapters for Azure Table, CosmosDb, SQL Azure, or you can implement your own!
* For samples and documentation, see: https://github.com/Microsoft/BotBuilder-Azure
* ---------------------------------------------------------------------------------------- */

var tableName = 'botdata';
var azureTableClient = new botbuilder_azure.AzureTableClient(tableName, process.env.AzureWebJobsStorage || storageName, process.env.AzureTableKey || storageKey); //process.env['AzureWebJobsStorage']
// var azureTableClient = new botbuilder_azure.AzureTableClient(tableName, process.env['AzureWebJobsStorage']);
var tableStorage = new botbuilder_azure.AzureBotStorage({ gzipData: false }, azureTableClient);

// Create your bot with a function to receive messages from the user
// This default message handler is invoked if the user's utterance doesn't
// match any intents handled by other dialogs.

var bot = new builder.UniversalBot(connector, (session, args) => {

    session.send('You reached the default message handler. You said \'%s\'.', session.message.text);
    // If the object for storing notes in session.userData doesn't exist yet, initialize it
    // if (!session.userData.notes) {
    //     session.userData.notes = {};
    //     console.log("initializing userData.notes in default message handler");
    // }
});

bot.set('storage', tableStorage);

// Bot introduces itself and says hello upon conversation start
// for more visit here https://tutorials.botsfloor.com/lets-make-a-chatbot-microsoft-bot-framework-node-js-7da211149c2f
bot.on('conversationUpdate', (message) => {
    if (message.membersAdded[0].id === message.address.bot.id) {
        var initialMessage = new builder.Message()
            .address(message.address)
            .text("hi User, I am a repair shop assistant")
        bot.send(initialMessage);

        var reply1 = new builder.Message()
            .address(message.address)
            .text('I can tell you about the mttf for each component coming-in for repair')
        bot.send(reply1);

        // query to the database and get the records
        sql.connect(sqlDbConfig, (err) => {
            if (err) console.log(err);
            var request = new sql.Request();
            request.execute('usp_Total_Component', (err, response) => {
                let components = response.recordset[0].Total;
                if (err) console.log(err)

                var totalComponent = new builder.Message()
                    .address(message.address)
                    .text(`I know about ${components > 999 ? (components / 1000).toFixed(1) + 'k' : components} components consumed as part of various repair orders`)
                bot.send(totalComponent);

                if (message.attachments && message.attachments.length === 0) {
                    request.execute('usp_List_Component', (err, response) => {
                        if (err) console.log(err);
                        console.log(response)
                        var attachmentMessage = new builder.Message()
                            .address(message.address)
                            .text('I can tell you about the mttf for each component coming-in for repair')
                            .addAttachment(
                                {
                                    contentType: "application/json",
                                    content: {
                                        type: "typeAhead",
                                        payload: {
                                            data: response.recordset,
                                            message: "Unable to find response.",
                                        },
                                    }
                                }
                            )

                        bot.send(attachmentMessage);
                        sql.close();
                    })
                }
                else {
                    var attachmentMessage = new builder.Message()
                        .address(message.address)
                        .text('Oops something went wrong.')

                    bot.send(attachmentMessage)
                }
            })
        })
    }
});

// luis interface
const LuisModelUrl = 'https://' + luisAPIHostName + '/luis/v2.0/apps/' + luisAppId + '?subscription-key=' + luisAPIKey;

// Create a recognizer that gets intents from LUIS, and add it to the bot
var recognizer = new builder.LuisRecognizer(LuisModelUrl);
bot.recognizer(recognizer);

var componentName;

// Add a dialog for each intent that the LUIS app recognizes.
// See https://docs.microsoft.com/en-us/bot-framework/nodejs/bot-builder-nodejs-recognize-intent-luis 
bot.dialog('GreetingDialog',
    (session) => {
        // session.send('You reached the Greeting intent. You said \'%s\'.', session.message.text);
        session.send('Hello!  how can i help you')
        session.endDialog();
    }
).triggerAction({
    matches: 'Greeting'
})

bot.dialog('HelpDialog',
    (session) => {
        componentName = session.message.text;
        sql.connect(sqlDbConfig, (err) => {
            if (err) console.log(err);
            new sql.Request()
                .input('component', sql.VarChar, session.message.text)
                .execute('usp_MTTF_Data', (err, response) => {
                    if (err) console.log(err);
                    console.log(response)
                    // session.send('You reached the Help intent. You said \'%s\'.', session.message.text);
                    session.send(`Found the component ${session.message.text} in a total of ${response.recordset[0].Repair_Orders} repair orders in the past ${response.recordset[0].Months} months.`);
                    session.send(`The  mean time to failure for this component is ${response.recordset[0].MTTF} months.`);
                    session.send(`Are you interested to know more about the repair orders featuring this component?`);
                    var msg = session.message;
                    if (msg.attachments && msg.attachments.length === 0) {
                        session.send({
                            text: "Things like ",
                            attachments: [
                                {
                                    contentType: "application/json",
                                    content: {
                                        type: "button",
                                        payload: {
                                            data: buttonData
                                        }
                                    }
                                }
                            ]
                        });
                    } else {
                        // Echo back users text
                        session.send("Oops something went wrong");
                    }
                    sql.close();
                })
        })
        session.endDialog();
    }
).triggerAction({
    matches: 'Help'
})

bot.dialog('CancelDialog',
    (session) => {
        session.send('You reached the Cancel intent. You said \'%s\'.', session.message.text);
        session.endDialog();
    }
).triggerAction({
    matches: 'Cancel'
})

bot.dialog('mttf symptom',
    (session) => {
        // session.send('You reached the mttf intent. You said \'%s\'.', session.message.text);
        sql.connect(sqlDbConfig, (err) => {
            // let { cause, mean, numberOfFailures, percentage } = []
            let cause = [];
            let mean = [];
            let numberOfFailures = [];
            let percentage = [];

            if (err) console.log(err);
            new sql.Request()
                .input('type', sql.VarChar, session.message.text)
                .input('component', sql.VarChar, componentName)
                .execute('USP_MTTF_PARETOCHART', (err, response) => {
                    if (err) console.log(err);
                    console.log(response)
                    response.recordset.map((data, index) => {
                        cause.push(data.Cause);
                        mean.push(data.Mean);
                        numberOfFailures.push(data.No_Of_Failure);
                        percentage.push(data.Percent_Of_Total);
                    })
                    var msg = session.message;
                    if (msg.attachments && msg.attachments.length === 0) {
                        session.send({
                            text: `showing the results for ${session.message.text}`,
                            attachments: [
                                {
                                    contentType: "application/json",
                                    content: {
                                        type: "paretoChart",
                                        payload: {
                                            data: {
                                                cause,
                                                mean,
                                                numberOfFailures,
                                                percentage
                                            }
                                        }
                                    }
                                }
                            ]
                        });                        
                    } else {
                        // Echo back users text
                        session.send("Oops something went wrong");
                    }
                    sql.close();
                    // session.send('You reached the Help intent. You said \'%s\'.', session.message.text);                    
                })
        })
        session.endDialog();
    }
).triggerAction({
    matches: 'mttf symptom'
})


// qna maker section

// var recognizer = new builder_cognitiveservices.QnAMakerRecognizer({
//     knowledgeBaseId: 'Your-Qna-App-ID', // process.env.QnAKnowledgebaseId, 
//     subscriptionKey: 'Your-Qna-App-Password'
// }); 
// //process.env.QnASubscriptionKey});

// var basicQnAMakerDialog = new builder_cognitiveservices.QnAMakerDialog({
//     recognizers: [recognizer],
//     defaultMessage: 'No match! Try changing the query terms!',
//     qnaThreshold: 0.3
// }
// );
