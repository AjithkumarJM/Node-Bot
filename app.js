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
const { getNoInputSP, getMultipleInputSP } = require('./server/db/queryModels');

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

// for local env
var azureTableClient = new botbuilder_azure.AzureTableClient(tableName, process.env.AzureWebJobsStorage || storageName, process.env.AzureTableKey || storageKey); //process.env['AzureWebJobsStorage']

// for prod env
// var azureTableClient = new botbuilder_azure.AzureTableClient(tableName, process.env['AzureWebJobsStorage']);

var tableStorage = new botbuilder_azure.AzureBotStorage({ gzipData: false }, azureTableClient);

// Create your bot with a function to receive messages from the user
// This default message handler is invoked if the user's utterance doesn't
// match any intents handled by other dialogs.

var bot = new builder.UniversalBot(connector, (session, args) => {

    // session.send('You reached the default message handler. You said \'%s\'.', session.message.text);
    session.send('Hello!  how can i help you')

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
        if (message.membersAdded) {
            message.membersAdded.forEach((identity) => {
                if (identity.id === message.address.bot.id) {
                    var initialMessage = new builder.Message()
                        .address(message.address)
                        .text("hi, I am a repair shop assistant")
                    bot.send(initialMessage);

                    setTimeout(() => {
                        var greetingMessage = new builder.Message()
                            .address(message.address)
                            .text('I can tell you about the mttf for each component coming-in for repair')
                        bot.send(greetingMessage);
                    }, 1500);

                    getNoInputSP('usp_Total_Component', (response) => {                        
                        let components = response.recordset[0].Total;
                        var totalComponent = new builder.Message()
                            .address(message.address)
                            .text(`I know about ${components > 999 ? (components / 1000).toFixed(1) + 'k' : components} components consumed as part of various repair orders`)
                        bot.send(totalComponent);
                    });

                    getNoInputSP('usp_List_Component', (response) => {
                        var attachmentMessage = new builder.Message()
                            .address(message.address)
                            .text('you can tell me a component that you are interested in or you can start typing and select one as we go along')
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
                    });
                }
            });
        }
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
        console.log(session, 'session');
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
                    if (response.recordset[0].MTTF !== null) {
                        session.send(`Found the component ${session.message.text} in a total of ${response.recordset[0].Repair_Orders} repair orders in the past ${response.recordset[0].Months} months.`);
                        setTimeout(() => {
                            session.send(`The  mean time to failure for this component is ${response.recordset[0].MTTF} months.`);
                        }, 1500);

                        setTimeout(() => {
                            session.send(`Are you interested to know more about the repair orders featuring this component?`);
                        }, 2000);

                        var msg = session.message;
                        if (msg.attachments && msg.attachments.length === 0) {
                            setTimeout(() => {
                                session.send({
                                    text: "",
                                    attachments: [
                                        {
                                            contentType: "application/json",
                                            content: {
                                                type: "button",
                                                payload: {
                                                    data: buttonData,
                                                    message: "Things like"

                                                },
                                            }
                                        }
                                    ]
                                });
                            }, 3000);
                        } else {
                            // Echo back users text
                            session.send("Oops something went wrong");
                        }
                        sql.close();
                    }
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
        let cause = [];
        let mean = [];
        let numberOfFailures = [];
        let percentage = [];

        sql.connect(sqlDbConfig, (err) => {

            if (err) console.log(err);

            new sql.Request()
                .input('type', sql.VarChar, session.message.text)
                .input('component', sql.VarChar, componentName)
                .execute('USP_MTTF_PARETOCHART', (err, response) => {
                    if (err) console.log(err);

                    var msg = session.message;
                    if (msg.attachments && msg.attachments.length === 0 && response.recordset !== undefined) {
                        response.recordset.map((data, index) => {
                            cause.push(data.Cause);
                            mean.push(data.Mean);
                            numberOfFailures.push(data.No_Of_Failure);
                            percentage.push(data.Percent_Of_Total);
                        })
                        session.send({
                            text: ``,
                            attachments: [
                                {
                                    contentType: "application/json",
                                    content: {
                                        type: "chart",
                                        chartType: "pareto",
                                        payload: {
                                            data: {
                                                cause,
                                                mean,
                                                numberOfFailures,
                                                percentage
                                            },
                                            message: `showing the results for ${session.message.text}`
                                        },
                                    }
                                }
                            ]
                        });

                        setTimeout(() => {
                            bot.send({
                                text: "",
                                attachments: [
                                    {
                                        contentType: "application/json",
                                        content: {
                                            type: "button",
                                            payload: {
                                                data: buttonData,
                                                message: "Things like"
                                            },
                                        }
                                    }
                                ]
                            })
                        }, 1500);
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
