var messages = [
    {
        "message": "hi User, I am a repair shop assistant",
        "identifier": 0
    },
    {
        "message": "I can tell you about the mttf for each component coming-in for repair",
        "identifier": 1
    },
    {
        "message": "I know about 10k components consumed as part of various repair orders",
        "identifier": 2
    },
    {
        "message": "you can tell me a component that you are interested in or you can start typing and select one as we go along",
        "identifier": 3
    },
]

var buttonData = [
    {
        label: 'Failure Symptoms',
        value: 'Failure Symptoms'
    },
    {
        label: 'Reason For Failure',
        value: 'Reason For Failure'
    },
    {
        label: 'Country the component was shipped to?',
        value: 'Country the component was shipped to?'
    }, {
        label: 'Cause for failure',
        value: 'Cause for failure'
    }
]

module.exports = {
    messages,
    buttonData
}