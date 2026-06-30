const get_weather_dummy = (city) => {
    return {
        city,
        temperature: 31,
        unit: 'celsius',
        condition: 'Hot and humid'
    }
}

const get_weather = async (city) => {
    const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${process.env.OPEN_WEATHER_API_KEY}&units=metric`;

    try {
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();

        return {
            city: data.name,
            country: data.sys.country,
            temperature: data.main.temp,
            feelsLike: data.main.feels_like,
            humidity: data.main.humidity,
            description: data.weather[0].description,
            windSpeed: data.wind.speed,
        };
    } catch (error) {
        console.error("Error fetching weather:", error.message);
        return null;
    }
}

module.exports = { get_weather_dummy, get_weather }