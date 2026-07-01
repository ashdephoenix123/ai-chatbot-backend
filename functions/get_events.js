async function searchEvents(city, category) {
    // Query MongoDB

    return [
        {
            id: "1",
            title: "Coldplay Tribute Night",
            city: "City Arena",
            date: "2026-07-12",
        },
        {
            id: "2",
            title: "Arijit Singh Live Concert",
            city: "City Arena",
            date: "2026-07-18",
        },
        {
            id: "3",
            title: "Stand-Up Comedy Night",
            city: "Central Park",
            date: "2026-07-20",
        },
        {
            id: "4",
            title: "Tech Innovators Meetup",
            city: "City Arena",
            date: "2026-07-22",
        },
        {
            id: "5",
            title: "Food & Street Festival",
            city: "City Arena",
            date: "2026-07-25",
        }
    ];
}

async function bookEventTicket({ event_id, quantity }) {

    const availableEvents = await searchEvents();
    const event = availableEvents.find(e => e.id === event_id);

    if (!event) {
        return {
            status: "error",
            message: `Event not found`
        }
    }

    return {
        booking_id: `BK${Math.floor(Math.random() * 10000)}`,
        event_id: event.id,
        quantity: quantity,
        status: "confirmed"
    }
}

module.exports = { searchEvents, bookEventTicket }