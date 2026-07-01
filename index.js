require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { chatbot, isThisWorking, travelPlanner, findRestaurants, toolCalling, findEvents, oneToolCallfromMultiple, bookEventToolChaining, bookEventParallelToolChaining } = require('./functions/openai');

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(cors({
    origin: '*'
}))

app.get('/ai', isThisWorking);
app.post('/ai/chatbot', chatbot)
app.post('/ai/travel-planner', travelPlanner)
app.post('/ai/find-restaurants', findRestaurants)
app.post('/ai/tool-calling', toolCalling)
app.post('/ai/find-events', findEvents)
app.post('/ai/multiple-tool-call', oneToolCallfromMultiple)
app.post('/ai/find-and-book-event', bookEventToolChaining)
app.post('/ai/find-and-book-event-in-parallel', bookEventParallelToolChaining)


app.listen(port, () => {
    console.log(`Example app listening on port ${port}`);
});
