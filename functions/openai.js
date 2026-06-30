const { OpenAI } = require('openai');
const { zodTextFormat } = require('openai/helpers/zod');
const TravelPlanSchema = require('../schemas/travel_planner');
const RestaurantSchema = require('../schemas/find_restaurant');
const { get_weather_dummy } = require('./get_weather_dummy');

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
})

const openaiConfig = {
    model: 'gpt-5.5'
}

const isThisWorking = (req, res) => {
    res.send('Yes, It is!');
}

const chatbot = async (req, res) => {
    try {
        const { message, previousResponseId } = req.body;
        const stream = await openai.responses.create({
            ...openaiConfig,
            instructions: "You are Nova, an AI assistant. User can ask you anything, Answer hilariously under 100 words.",
            input: message,
            stream: true,
            ...(previousResponseId && { previous_response_id: previousResponseId })
        });

        res.setHeader('Content-Type', "text/event-stream");
        res.setHeader('Cache-Control', "no-cache")
        res.setHeader("Connection", 'Keep-alive')

        res.flushHeaders?.();

        for await (const event of stream) {
            switch (event.type) {
                case 'response.output_text.delta':
                    res.write(`event: delta\ndata: ${JSON.stringify(event.delta)}\n\n`);
                    break;

                case 'response.completed':
                    res.write(`event: done\ndata: ${JSON.stringify({
                        responseId: event.response.id
                    })}\n\n`);
                    break;
            }
        }
        res.end();
    } catch (error) {
        console.error(error);
        if (!res.headersSent) {
            res.status(500).json({ error: 'Something went wrong.' });
        } else {
            res.write(`event: error\ndata: ${JSON.stringify({
                message: 'Something went wrong here!'
            })}\n\n`)
            res.end()
        }

    }
}

const travelPlanner = async (req, res) => {
    try {
        const { message } = req.body;
        if (!message) {
            res.status(400).json({ message: 'Message cannot be empty!' })
        }
        const response = await openai.responses.parse({
            ...openaiConfig,
            input: [
                {
                    role: 'developer',
                    content: "You are an AI travel itinary generator. User will ask you for travel plans. You should return a travel plan based on their input."
                },
                {
                    role: 'user',
                    content: message
                }
            ],
            text: {
                format: zodTextFormat(TravelPlanSchema, 'plan')
            }
        })

        res.status(200).json({ message: response.output_parsed })
    } catch (error) {
        console.error(error)
        res.status(500).json({ message: 'Something went wrong!' })
    }
}


const findRestaurants = async (req, res) => {
    try {
        const { message } = req.body;
        if (!message) {
            res.status(400).json({ message: 'Message cannot be empty!' })
        }
        const response = await openai.responses.parse({
            ...openaiConfig,
            instructions: `Extract the city and cuisine. If the user's message doesn't contain enough information or is gibberish, set status to "needs_clarification" and provide a friendly clarificationMessage`,
            input: message,
            text: {
                format: zodTextFormat(RestaurantSchema, 'plan')
            }
        })

        res.status(200).json(response.output_parsed)
    } catch (error) {
        console.error(error)
        res.status(500).json({ message: 'Something went wrong!' })
    }
}

const toolFunctions = {
    get_weather_dummy
}

const toolCalling = async (req, res) => {

    const tools = [{
        type: 'function',
        name: 'get_weather_dummy',
        description: 'Get current weather for a city.',
        parameters: {
            type: 'object',
            properties: {
                city: {
                    type: 'string',
                    description: 'The name of the city'
                }
            },
            required: ['city'],
            additionalProperties: false,
        }
    }]

    try {
        const { message } = req.body;
        if (!message) {
            res.status(400).json({ message: 'Message is required!' })
        }

        const response = await openai.responses.create({
            ...openaiConfig,
            input: message,
            tools
        })

        const output = response.output[0];

        if (output.type === 'function_call') {
            const args = JSON.parse(output.arguments)
            const result = await toolFunctions[output.name](args.city)

            const finalResponse = await openai.responses.create({
                ...openaiConfig,
                previous_response_id: response.id,
                input: [{
                    type: 'function_call_output',
                    call_id: output.call_id,
                    output: JSON.stringify(result)
                }]
            })

            res.status(200).json({ message: finalResponse.output_text })

        } else {
            res.status(200).json({ message: response.output_text })
        }

    } catch (error) {
        console.error(error)
        res.status(500).json({ message: 'Something went wrong!' })
    }
}


module.exports = { isThisWorking, chatbot, travelPlanner, findRestaurants, toolCalling };