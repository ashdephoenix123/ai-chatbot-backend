const { openai } = require('../globals');
const { PDFParse } = require('pdf-parse');
const { supabase } = require('../db/config')

const generateEmbeddings = async (req, res) => {
    try {
        const { text } = req.body;
        if (!text) {
            throw new Error("Text is required!")
        }
        const response = await openai.embeddings.create({
            model: 'text-embedding-3-small',
            input: text
        })

        res.status(200).json(response)

    } catch (error) {
        res.status(500).json({ message: error.message })
    }
}

const chunkText = (text, size = 500) => {
    let chunks = [];

    for (let i = 0; i < text.length; i += size) {
        chunks.push(text.slice(i, i + size))
    }

    return chunks
}

const pdfParse = async (req, res) => {
    try {
        const uint8 = new Uint8Array(req.file.buffer);
        const parser = new PDFParse({ data: uint8 });
        const { text } = await parser.getText();

        const chunks = chunkText(text)

        const response = await openai.embeddings.create({
            model: 'text-embedding-3-small',
            input: chunks
        })

        const rows = chunks.map((chunk, index) => {
            return {
                content: chunk,
                embedding: response.data[index].embedding,
                source: req.file.originalname
            }
        })

        const { error, success, statusText, count, status, data } = await supabase
            .from("documents")
            .insert(rows);

        if (error) {
            throw error;
        }

        res.status(200).json({ error, success, statusText, count, status, data })
    } catch (error) {
        res.status(500).json({ message: error.message })
    }
}

const ragSearch = async (req, res) => {
    try {
        const { question } = req.body;

        if (!question) {
            throw new Error("question is requried!")
        }

        const queryEmbedding = await openai.embeddings.create({
            model: 'text-embedding-3-small',
            input: question
        })

        const { data } = await supabase.rpc(
            "match_documents",
            {
                query_embedding: queryEmbedding.data[0].embedding,
                match_count: 10
            }
        );

        const context = data.map((item) => item.content).join("\n\n")

        const finalResponse = await openai.responses.create({
            model: 'gpt-5.5',
            input: [
                {
                    role: "developer",
                    content: `Answer using ONLY the provided context.
                    
                    Context: ${context}
                    
                    If the answer isn't in the context, say you don't know.`
                },
                {
                    role: "user",
                    content: question
                }
            ]
        })

        res.write(finalResponse.output_text)
        res.end()
    } catch (error) {
        res.status(500).json({ message: error.message })
    }
}

module.exports = { generateEmbeddings, pdfParse, ragSearch }