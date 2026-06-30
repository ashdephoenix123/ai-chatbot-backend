const get_weather_dummy = (city) => {
    return {
        city,
        temperature: 31,
        unit: 'celsius',
        condition: 'Hot and humid'
    }
}

module.exports = { get_weather_dummy }