const fs = require('fs');
const path = require('path')
const pdf = require('pdf-parse')

const parseitnow = async () => {
    const buffer = fs.readFileSync(path.join(__dirname, 'sample.pdf'));
    const data = await pdf(buffer);
    console.log(data.text);
}

parseitnow()