const { get_weather } = require('./get_weather')
const { searchEvents, bookEventTicket } = require('./get_events')

const toolFunctions = {
    get_weather,
    search_events: searchEvents,
    book_tickets: bookEventTicket
}

module.exports = toolFunctions