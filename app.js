const restify = require('restify');
const express = require('express');
const builder = require('botbuilder');
const botbuilder_azure = require("botbuilder-azure");

const sql = require('mssql')

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
// var bot = new builder.UniversalBot(connector, (session, args) => {
//     session.send('hi User, I am a repair shop assistant')
//     session.send('I can tell you about the mttf for each component coming-in for repair')
//     session.send('I know about 10k components consumed as part of various repair orders')
//     session.send('you can tell me a component that you are interested in or you can start typing and select one as we go along')

//     console.log(session.library)
//     // If the object for storing notes in session.userData doesn't exist yet, initialize it
//     // if (!session.userData.notes) {
//     //     session.userData.notes = {};
//     //     console.log("initializing userData.notes in default message handler");
//     // }
// });

var bot = new builder.UniversalBot(connector, function (session, args) {
    session.send('You reached the default message handler. You said \'%s\'.', session.message.text);
});

bot.set('storage', tableStorage);

// Hook into the conversationUpdate event and check when the bot is added
// for more visit https://stackoverflow.com/questions/43048088/microsoft-bot-framework-sending-message-on-connect/43050305#43050305
bot.on('conversationUpdate', (message) => {
    if (message.membersAdded) {
        message.membersAdded.forEach((identity) => {
            if (identity.id === message.address.bot.id) {
                bot.beginDialog(message.address, '/');
            }
        });
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

        (async () => {
            try {
                let pool = await sql.connect(sqlDbConfig)
                // query
                // let result1 = await pool.request()
                //     .input('input_parameter', sql.Int, value)
                //     .query('select * from mytable where id = @input_parameter')                                

                // Stored procedure
                let storedProcedure = await pool.request()
                    .input('@type', sql.VarChar)
                    .input('@component', sql.VarChar)

                    // .output('output_parameter', sql.VarChar(50))
                    .execute('usp_Mttf_Paretochart')

                console.dir(storedProcedure)
            } catch (err) {
                // ... error checks
            }
        })()

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
