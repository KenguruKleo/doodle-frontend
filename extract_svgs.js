const fs = require('fs');
const html = fs.readFileSync('/Users/kostiantyn.yemelianov/.cursor/projects/Users-kostiantyn-yemelianov-workspace-doodle-frontend/agent-tools/5eb2428b-f7bc-4878-8933-175de397512f.txt', 'utf8');

const svgRegex = /<svg[^>]*>.*?<\/svg>/g;
const matches = html.match(svgRegex) || [];

let sprite = '<svg xmlns="http://www.w3.org/2000/svg">\n';
matches.forEach((svg, index) => {
    // Extract inner content of svg
    const innerMatch = svg.match(/<svg[^>]*>(.*?)<\/svg>/);
    const viewBoxMatch = svg.match(/viewBox="([^"]+)"/) || ['', '0 0 24 24'];
    if (innerMatch) {
        sprite += `  <symbol id="icon-${index}" viewBox="${viewBoxMatch[1]}">\n    ${innerMatch[1]}\n  </symbol>\n`;
    }
});
sprite += '</svg>\n';

fs.writeFileSync('public/icons.svg', sprite);
console.log(`Extracted ${matches.length} SVGs to public/icons.svg`);
