// Renders public/og.png (1200x630) for Open Graph / Twitter cards.
import { Resvg } from '@resvg/resvg-js';
import { writeFileSync } from 'node:fs';

const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="#f5efe4"/>
  <text x="60" y="78" font-family="Menlo, Courier New, monospace" font-size="20" letter-spacing="1" fill="#75685a">SOFTWARE · AI · AUTOMATION</text>
  <text x="1140" y="78" text-anchor="end" font-family="Menlo, Courier New, monospace" font-size="20" fill="#75685a">01</text>
  <text x="48" y="430" font-family="Helvetica Neue, Helvetica, Arial, sans-serif" font-size="360" font-weight="700" letter-spacing="-22" fill="#d9632c">AI</text>
  <text x="60" y="500" font-family="Helvetica Neue, Helvetica, Arial, sans-serif" font-size="40" font-weight="300" fill="#2a231d">Software with intelligence built in.</text>
  <text x="60" y="572" font-family="Menlo, Courier New, monospace" font-size="20" fill="#75685a">AI CODE STUDIO</text>
  <text x="1140" y="572" text-anchor="end" font-family="Menlo, Courier New, monospace" font-size="20" fill="#75685a">aicodestudio.dev</text>
</svg>`;

const png = new Resvg(svg, { fitTo: { mode: 'width', value: 1200 }, font: { loadSystemFonts: true } }).render().asPng();
writeFileSync(new URL('../public/og.png', import.meta.url), png);
console.log(`og.png written (${png.length} bytes)`);
