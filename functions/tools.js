const { get_weather_dummy, get_weather } = require('./get_weather_dummy')
const { searchEvents } = require('./get_events')

const toolFunctions = {
    get_weather_dummy,
    get_weather,
    search_events: searchEvents
}

module.exports = toolFunctions