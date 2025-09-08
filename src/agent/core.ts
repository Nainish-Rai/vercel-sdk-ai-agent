import { generateText, stepCountIs } from "ai";
import { google } from "@ai-sdk/google";
import { config } from "dotenv";
import { fileTools } from "./tools/file-tools";
import { dbTools } from "./tools/db-tools";
import { apiTools } from "./tools/api-tools";
import { integrationTools } from "./tools/integration-tools";
import { SYSTEM_PROMPTS } from "./prompts/system-prompts";

// Load environment variables from .env.local
config({ path: ".env.local" });

export async function databaseAgent(prompt: string, context?: any) {
  // Enhanced prompt to ensure multi-step execution
  const enhancedPrompt = `${prompt}

IMPORTANT: This request requires completing ALL necessary steps in sequence. Do not stop after just creating a schema file. You must:
1. Create the schema file
2. Generate migrations using run_migration with action "generate"
3. Run the migrations using run_migration with action "migrate"
4. Continue with any additional requested steps

Complete the ENTIRE workflow before finishing your response.`;

  const result = await generateText({
    model: google("gemini-1.5-flash"),
    prompt: enhancedPrompt,
    system: SYSTEM_PROMPTS.DATABASE_AGENT,
    stopWhen: stepCountIs(15), // Increased for more complex operations
    tools: {
      ...fileTools,
      ...dbTools,
      ...apiTools,
      ...integrationTools, // Added integration tools
    },
  });

  return {
    response: result.text,
    steps: result.steps,
    usage: result.usage,
  };
}
