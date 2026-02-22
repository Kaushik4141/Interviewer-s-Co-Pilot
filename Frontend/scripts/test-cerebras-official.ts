import { model } from '../lib/ai-orchestrator';
import { generateText } from 'ai';
import { config } from 'dotenv';
import path from 'path';

// Load .env.local
config({ path: path.resolve(process.cwd(), '.env.local') });

async function test() {
  console.log('Testing official Cerebras SDK integration...');
  try {
    const { text } = await generateText({
      model,
      prompt: 'Explain Quantum Computing in one sentence.',
    });
    console.log('Cerebras Response:', text);
  } catch (err) {
    console.error('Cerebras test failed:', err);
  }
}

test();
