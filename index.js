require('dotenv').config();
const express = require('express');
const { OpenAI } = require('openai');
const cors = require('cors')

const app = express();
const port = process.env.PORT || 3000;
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
})

app.use(express.json());
app.use(cors({
    origin: '*'
}))

app.get('/', (req, res) => {
    res.send('Hello World!');
});

app.post('/chat', async (req, res) => {
    try {
        const { message, previousResponseId } = req.body;
        const stream = await openai.responses.create({
            model: 'gpt-5.5',
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
})


app.listen(port, () => {
    console.log(`Example app listening on port ${port}`);
});
