require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { chatbot, isThisWorking, travelPlanner, findRestaurants, toolCalling, findEvents, oneToolCallfromMultiple, bookEventToolChaining, bookEventParallelToolChaining } = require('./functions/openai');
const { generateEmbeddings, pdfParse, ragSearch } = require('./functions/rag');
const multer = require('multer')

const upload = multer({
    storage: multer.memoryStorage()
})

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

app.post('/rag/generate-embeddings', generateEmbeddings)
app.post('/rag/search', ragSearch)
app.post('/rag/parse-pdf', upload.single('file'), pdfParse)


app.listen(port, () => {
    console.log(`Example app listening on port ${port}`);
});
