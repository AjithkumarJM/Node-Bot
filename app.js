const restify = require('restify');
const express = require('express');
const builder = require('botbuilder');
const botbuilder_azure = require("botbuilder-azure");
const sql = require('mssql')

var { messages } = require('./server/messages/messages')
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
    sql.connect(sqlDbConfig, err => {
        // Stored Procedure
        new sql.Request()
            .input('@type', sql.VarChar)
            .input('@component', sql.VarChar)
            .execute('usp_Mttf_Paretochart', (err, result) => {
                // ... error checks

                console.log(result)
            })
    })

    sql.on('error', err => {
        // ... error handler
    })

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
        messages.map((data, index) => {
            var reply = new builder.Message()
                .address(message.address)
                .text(data.message)
            bot.send(reply);
        })
    }
});

// Make sure you add code to validate these fields
// var luisAppId = process.env.LuisAppId || luisAppId;
// var luisAPIKey = process.env.LuisAPIKey || luisAPIKey;
// var luisAPIHostName = process.env.LuisAPIHostName || 'westus.api.cognitive.microsoft.com';

const LuisModelUrl = 'https://' + luisAPIHostName + '/luis/v2.0/apps/' + luisAppId + '?subscription-key=' + luisAPIKey;

// Create a recognizer that gets intents from LUIS, and add it to the bot
var recognizer = new builder.LuisRecognizer(LuisModelUrl);
bot.recognizer(recognizer);

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
        session.send('You reached the Help intent. You said \'%s\'.', session.message.text);
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
        session.send('You reached the mttf intent. You said \'%s\'.', session.message.text);
        // console.log(session.message)
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
