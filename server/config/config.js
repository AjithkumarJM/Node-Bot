// below credentials are obtained from Azure portal for local env
// ignore this file when you commit

// luis config
var luisAppId = process.env.LuisAppId || '76960afb-7635-4473-a253-896d90c143d8';
var luisAPIKey = process.env.LuisAPIKey || '579560f2bc8f4c8d8393fee9d72aa1d1';
var luisAPIHostName = process.env.LuisAPIHostName || 'westus.api.cognitive.microsoft.com';

// table storage config 
// For samples and documentation, see: https://github.com/Microsoft/BotBuilder-Azure
var storageName = "extronbot9b52";
var storageKey = "WczBpHCap/82GL24HPzbx2KxrzlQufulY9vjKOiXDf7e1Z7mJHUZ5lE7wFj6o4TAE7XoUHfetLwar1iP391cRw==";

// chat connector configuration
var appId = process.env.MicrosoftAppId || "404ce0ad-d5de-4a89-9db8-5ff9ed7c77c3";
var appPassword = process.env.MicrosoftAppPassword || "20K_O080G}?$ewIW";
var openIdMetadata = process.env.BotOpenIdMetadata;

// mssql db config
var sqlDbConfig = {
    user: 'extron',
    password: 'machinelearning@2018',
    server: 'extronforecast.database.windows.net',   
    port: 1433, 
    database: "MachineLearningMS",
    options: {
       encrypt: true,
    }
};

module.exports = {
    luisAPIKey,
    luisAppId,
    storageName,
    storageKey,
    appId,
    appPassword,
    luisAPIHostName,
    sqlDbConfig,
    openIdMetadata
}