const { openai } = require('../globals');

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

module.exports = { generateEmbeddings }