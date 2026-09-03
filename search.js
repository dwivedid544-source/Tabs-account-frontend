const fs = require('fs');
const path = require('path');

const content = fs.readFileSync(path.join(__dirname, 'src/pages/company/Sales/Invoice/Invoice.jsx'), 'utf8');
const lines = content.split('\n');

let results = [];
results.push("=== SEARCHING FOR UPLOAD/FILE IN INVOICE.JSX ===");
lines.forEach((line, idx) => {
    if (line.toLowerCase().includes('upload') || line.toLowerCase().includes('logo') || line.toLowerCase().includes('file') || line.toLowerCase().includes('image') || line.toLowerCase().includes('photo') || line.toLowerCase().includes('attachment')) {
        results.push(`${idx + 1}: ${line.trim()}`);
    }
});

fs.writeFileSync(path.join(__dirname, 'search_results.txt'), results.join('\n'), 'utf8');
console.log("Written search_results.txt");
