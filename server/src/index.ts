import { createApp } from './app.js';
import { loadConfig } from './config.js';

const config = loadConfig();
const app = createApp({ config });

if (!process.env['VERCEL']) {
  app.listen(config.port, '0.0.0.0', () => {
    console.log(`HawaHisaab server listening on port ${String(config.port)}`);
  });
}

export default app;
