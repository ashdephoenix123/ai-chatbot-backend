const { OpenAI } = require('openai');
const { zodTextFormat } = require('openai/helpers/zod');
const TravelPlanSchema = require('../schemas/travel_planner');
const RestaurantSchema = require('../schemas/find_restaurant');
const toolFunctions = require('./tools');

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

const toolCalling = async (req, res) => {

    const tools = [{
        type: 'function',
        name: 'get_weather',
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
            const result = await toolFunctions[output.name](args.city);
            if (!result) {
                throw new Error("Function execution failed!")
            }

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

const findEvents = async (req, res) => {

    const eventTools = [{
        type: 'function',
        name: 'search_events',
        description: 'Search events by city and optional category.',
        parameters: {
            type: 'object',
            properties: {
                city: {
                    type: 'string',
                    description: "City where the event takes place."
                },
                category: {
                    type: "string",
                    description: "Optional category filter (e.g., music, food, sports)."
                }
            },
            additionalProperties: false,
            required: ['city']
        }
    }]

    try {
        const { message } = req.body;
        if (!message) {
            return res.status(400).json({ message: 'Message is required!' })
        }
        const response = await openai.responses.create({
            ...openaiConfig,
            input: message,
            instructions: "You are an events curator. Use the search_events tool whenever the user wants to find events. If the city is missing, ask the user for it before calling the tool. If a category is provided, include it in the tool arguments.",
            tools: eventTools
        })

        const toolCall = response.output.find(event => event.type === 'function_call');

        if (toolCall) {

            const args = JSON.parse(toolCall.arguments);
            const tool = toolFunctions[toolCall.name];

            if (!tool) {
                throw new Error(`Unknown tool: ${toolCall.name}`);
            }

            const result = await tool(args);

            const finalResponse = await openai.responses.create({
                ...openaiConfig,
                previous_response_id: response.id,
                input: [{
                    type: 'function_call_output',
                    call_id: toolCall.call_id,
                    output: JSON.stringify(result)
                }]
            })

            res.status(200).json({ message: finalResponse.output_text })


        } else {
            res.status(200).json({ message: response.output_text })
        }


    } catch (error) {
        console.error(error)
        res.status(500).json({ message: error.message })
    }
}

const oneToolCallfromMultiple = async (req, res) => {

    const multipleTools = [{
        type: 'function',
        name: 'get_weather',
        description: 'Get weather of the given city.',
        parameters: {
            type: 'object',
            properties: {
                city: {
                    type: 'string',
                    description: 'name of the city whose weather we need to get.'
                }
            },
            required: ['city'],
            additionalProperties: false
        }
    },
    {
        type: 'function',
        name: 'search_events',
        description: 'Search for events for a given city.',
        parameters: {
            type: 'object',
            properties: {
                city: {
                    type: 'string',
                    description: 'name of the city whose events we need to get.'
                },
                category: {
                    type: 'string',
                    description: 'Categories like Music, Food, etc.'
                }
            },
            required: ['city'],
            additionalProperties: false
        }
    }]

    try {
        const { message } = req.body;
        if (!message) {
            return res.status(400).json({ message: 'Message is required!' })
        }

        const response = await openai.responses.create({
            ...openaiConfig,
            input: message,
            tools: multipleTools
        })

        const toolCall = response.output.find(ev => ev.type === 'function_call')
        if (toolCall) {
            const args = JSON.parse(toolCall.arguments);
            const tool = toolFunctions[toolCall.name];

            if (!tool) {
                throw new Error(`Unknown tool: ${toolCall.name}`)
            }

            const result = await tool(args);
            const finalresponse = await openai.responses.create({
                ...openaiConfig,
                previous_response_id: response.id,
                input: [{
                    type: 'function_call_output',
                    call_id: toolCall.call_id,
                    output: JSON.stringify(result)
                }]
            })

            res.status(200).json({ message: finalresponse.output_text })
        }
        else {
            res.status(200).json({ message: response.output_text })
        }

    } catch (error) {
        console.error(error)
        res.status(500).json({ message: error.message })
    }
}

const bookEventToolChaining = async (req, res) => {
    const multipleTools = [
        {
            type: 'function',
            name: 'search_events',
            description: 'Search for events for a given city.',
            parameters: {
                type: 'object',
                properties: {
                    city: {
                        type: 'string',
                        description: 'name of the city whose events we need to get.'
                    },
                    category: {
                        type: 'string',
                        description: 'Categories like Music, Food, etc.'
                    }
                },
                required: ['city'],
                additionalProperties: false
            }
        },
        {
            type: 'function',
            name: 'book_tickets',
            description: 'book tickets for an event',
            parameters: {
                type: 'object',
                properties: {
                    event_id: {
                        type: 'string',
                        description: 'Unique identifier of the event for which tickets are to be booked.'
                    },
                    quantity: {
                        type: 'integer',
                        description: 'number of tickets to be booked.'
                    }
                },
                additionalProperties: false,
                required: ['event_id', 'quantity']
            }
        }]

    try {
        const { message } = req.body;
        if (!message) {
            return res.status(400).json({ message: 'Message is required!' })
        }

        let response = await openai.responses.create({
            ...openaiConfig,
            input: message,
            tools: multipleTools
        })

        let count = 0;
        const MAX_TOOL_CALLS = 10;

        while (count < MAX_TOOL_CALLS) {
            const toolCall = response.output.find(ev => ev.type === 'function_call')
            if (!toolCall) break;

            const args = JSON.parse(toolCall.arguments);
            const tool = toolFunctions[toolCall.name];

            if (!tool) {
                throw new Error(`Unknown tool: ${toolCall.name}`)
            }

            const result = await tool(args);
            response = await openai.responses.create({
                ...openaiConfig,
                previous_response_id: response.id,
                input: [{
                    type: 'function_call_output',
                    call_id: toolCall.call_id,
                    output: JSON.stringify(result)
                }],
                tools: multipleTools
            })
            count++;
        }

        if (count === MAX_TOOL_CALLS) {
            throw new Error("Maximum tool calls exceeded.");
        }

        res.status(200).json({ message: response.output_text })

    } catch (error) {
        console.error(error)
        res.status(500).json({ message: error.message })
    }
}

const bookEventParallelToolChaining = async (req, res) => {
    const multipleTools = [
        {
            type: 'function',
            name: 'get_weather',
            description: 'Get weather of a city',
            parameters: {
                type: 'object',
                properties: {
                    city: {
                        type: 'string',
                        description: 'name of the city whose weather we need to fetch.'
                    }
                },
                required: ['city'],
                additionalProperties: false
            }
        },
        {
            type: 'function',
            name: 'search_events',
            description: 'Search for events for a given city.',
            parameters: {
                type: 'object',
                properties: {
                    city: {
                        type: 'string',
                        description: 'name of the city whose events we need to get.'
                    },
                    category: {
                        type: 'string',
                        description: 'Categories like Music, Food, etc.'
                    }
                },
                required: ['city'],
                additionalProperties: false
            }
        },
        {
            type: 'function',
            name: 'book_tickets',
            description: 'book tickets for an event',
            parameters: {
                type: 'object',
                properties: {
                    event_id: {
                        type: 'string',
                        description: 'Unique identifier of the event for which tickets are to be booked.'
                    },
                    quantity: {
                        type: 'integer',
                        description: 'number of tickets to be booked.'
                    }
                },
                additionalProperties: false,
                required: ['event_id', 'quantity']
            }
        }]

    try {
        const { message } = req.body;
        if (!message) {
            return res.status(400).json({ message: 'Message is required!' })
        }

        let response = await openai.responses.create({
            ...openaiConfig,
            input: message,
            tools: multipleTools
        })

        let count = 0;
        const MAX_TOOL_CALLS = 10;

        while (count < MAX_TOOL_CALLS) {
            const toolCalls = response.output.filter(ev => ev.type === 'function_call')
            if (!toolCalls.length) break;

            const outputs = await Promise.all(toolCalls.map(async toolCall => { // we could use allSettled
                const args = JSON.parse(toolCall.arguments);
                const tool = toolFunctions[toolCall.name];
                if (!tool) {
                    throw new Error(`Unknown tool: ${toolCall.name}`);
                }
                const result = await tool(args);

                return {
                    type: 'function_call_output',
                    call_id: toolCall.call_id,
                    output: JSON.stringify(result)
                }
            }))

            response = await openai.responses.create({
                ...openaiConfig,
                previous_response_id: response.id,
                input: outputs,
                tools: multipleTools
            })
            count++;
        }

        if (count === MAX_TOOL_CALLS) {
            throw new Error("Maximum tool calls exceeded.");
        }

        res.status(200).json({ message: response.output_text })

    } catch (error) {
        console.error(error)
        res.status(500).json({ message: error.message })
    }
}

module.exports = { isThisWorking, chatbot, travelPlanner, findRestaurants, toolCalling, findEvents, oneToolCallfromMultiple, bookEventToolChaining, bookEventParallelToolChaining };