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
  const result = await generateText({
    model: google("gemini-1.5-flash"),
    prompt,
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
