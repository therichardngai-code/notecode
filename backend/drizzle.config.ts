import { defineConfig } from 'drizzle-kit';
import { homedir } from 'os';
import { join } from 'path';

const dbPath = join(homedir(), '.notecode', 'data', 'app.db');

export default defineConfig({
  schema: './src/infrastructure/database/schema.ts',
  out: './drizzle',
  dialect: 'sqlite',
  dbCredentials: {
    url: dbPath,
  },
});
