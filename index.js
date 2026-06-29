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
        const payload = {
            model: 'gpt-5.5',
            instructions: "You are Nova, an AI assistant. User can ask you anything, Answer hilariously.",
            input: message,
            ...(previousResponseId ? { previous_response_id: previousResponseId } : {})
        };

        console.log("payload", payload)

        const stream = await openai.responses.stream(payload);
        res.setHeader('Content-Type', "text/plain; charset=utf-8");

        for await (const event of stream) {
            if (event.type === 'response.output_text.delta') {
                res.write(event.delta)
            }
        }
        res.end();
    } catch (error) {
        console.error(error);
        if (!res.headersSent) {
            res.status(500).json({ error: 'Something went wrong.' });
        } else {
            res.end()
        }

    }
})


app.listen(port, () => {
    console.log(`Example app listening on port ${port}`);
});
