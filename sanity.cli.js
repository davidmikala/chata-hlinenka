// Konfigurace pro příkazy `npx sanity …` (např. nahrání výchozích fotek, CORS)
import { defineCliConfig } from 'sanity/cli';
import project from './src/content/sanity-project.js';

export default defineCliConfig({
  api: { projectId: project.projectId, dataset: project.dataset },
});
