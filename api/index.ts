import { readFileSync } from 'fs';
import { join } from 'path';

export default function handler(req: any, res: any) {
  // Serve the landing page HTML
  const htmlPath = join(process.cwd(), 'public', 'index.html');
  const html = readFileSync(htmlPath, 'utf-8');
  
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.status(200).send(html);
}