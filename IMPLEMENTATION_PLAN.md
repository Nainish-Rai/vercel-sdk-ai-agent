# Orchids Database Agent Implementation Plan

## Project Overview

Building a CLI tool that serves as a "database agent" for Next.js projects. The agent will automatically implement database features, set up schemas, create API endpoints, and integrate database functionality into the frontend using the Vercel AI SDK tool-based pattern.

## Tech Stack

- **Frontend**: Next.js 15 + TypeScript + React 19
- **Database ORM**: Drizzle ORM (TypeScript-first)
- **Database Provider**: PostgreSQL with Supabase
- **AI Framework**: Vercel AI SDK with tool system
- **AI Model**: Google Gemini 2.0 Flash (via @ai-sdk/google)
- **CLI Framework**: Commander.js
- **Database**: PostgreSQL
- **Validation**: Zod (already available in project)

## Architecture Overview

```
CLI Tool
├── Agent Core (AI SDK with tools)
├── Database Manager (Drizzle ORM)
├── File System Manager (AI SDK tools)
├── Project Context Analyzer
└── Frontend Integrator
```

## Implementation Plan

### Phase 1: Project Setup & CLI Foundation

#### 1.1 Dependencies Installation

```bash
npm install @ai-sdk/google ai commander inquirer chalk drizzle-orm drizzle-kit postgres dotenv
npm install -D @types/node @types/inquirer @types/pg
```

#### 1.2 Project Structure (Updated for AI SDK Pattern)

```
src/
├── agent/
│   ├── core.ts               # Main agent using AI SDK generateText
│   ├── tools/
│   │   ├── file-tools.ts     # list_files, read_file, edit_file
│   │   ├── db-tools.ts       # Database operation tools
│   │   ├── schema-tools.ts   # Schema generation tools
│   │   ├── api-tools.ts      # API endpoint generation tools
│   │   └── integration-tools.ts # Frontend integration tools
│   └── prompts/
│       └── system-prompts.ts # System prompts for different contexts
├── cli/
│   ├── index.ts              # CLI entry point
│   ├── commands/
│   │   ├── init.ts           # Initialize database setup
│   │   ├── query.ts          # Execute natural language queries
│   │   └── status.ts         # Show project status
│   └── utils/
│       ├── logger.ts         # Enhanced CLI logging
│       ├── spinner.ts        # Loading indicators
│       └── progress.ts       # Progress tracking
├── database/
│   ├── connection.ts         # Database connection setup
│   ├── schemas/              # Generated schema files
│   └── migrations/           # Migration files
├── utils/
│   ├── project-analyzer.ts   # Analyze project structure
│   ├── spotify-context.ts    # Spotify-specific context
│   └── test.ts               # Test script
└── types/
    └── index.ts              # TypeScript definitions
```

### Phase 2: AI Agent Core (Using Vercel AI SDK Pattern)

#### 2.1 Core Agent Implementation

```typescript
// src/agent/core.ts
import { generateText, stepCountIs } from "ai";
import { google } from "@ai-sdk/google";
import { fileTools } from "./tools/file-tools";
import { dbTools } from "./tools/db-tools";
import { schemaTools } from "./tools/schema-tools";
import { apiTools } from "./tools/api-tools";
import { integrationTools } from "./tools/integration-tools";
import { SYSTEM_PROMPTS } from "./prompts/system-prompts";

export async function databaseAgent(prompt: string, context?: any) {
  const result = await generateText({
    model: google("models/gemini-2.0-flash-exp"),
    prompt,
    system: SYSTEM_PROMPTS.DATABASE_AGENT,
    stopWhen: stepCountIs(20), // Allow more steps for complex operations
    tools: {
      ...fileTools,
      ...dbTools,
      ...schemaTools,
      ...apiTools,
      ...integrationTools,
    },
  });

  return {
    response: result.text,
    steps: result.steps,
    usage: result.usage,
  };
}
```

#### 2.2 File Management Tools (Following AI SDK Pattern)

```typescript
// src/agent/tools/file-tools.ts
import { tool } from "ai";
import { z } from "zod";
import fs from "fs";
import path from "path";

export const fileTools = {
  list_files: tool({
    description:
      "List files and directories at a given path. If no path is provided, lists files in the current directory.",
    inputSchema: z.object({
      path: z
        .string()
        .nullable()
        .describe(
          "Optional relative path to list files from. Defaults to current directory if not provided."
        ),
    }),
    execute: async ({ path: generatedPath }) => {
      if (generatedPath === ".git" || generatedPath === "node_modules") {
        return { error: "You cannot read the path: " + generatedPath };
      }
      const targetPath = generatedPath?.trim() ? generatedPath : ".";
      try {
        console.log(`📁 Listing files at '${targetPath}'`);
        const output = fs.readdirSync(targetPath, { recursive: false });
        return { path: targetPath, output };
      } catch (e) {
        console.error(`❌ Error listing files:`, e);
        return { error: e };
      }
    },
  }),

  read_file: tool({
    description:
      "Read the contents of a given relative file path. Use this when you want to see what's inside a file.",
    inputSchema: z.object({
      path: z
        .string()
        .describe("The relative path of a file in the working directory."),
    }),
    execute: async ({ path }) => {
      try {
        console.log(`📖 Reading file at '${path}'`);
        const output = fs.readFileSync(path, "utf-8");
        return { path, output };
      } catch (error) {
        console.error(`❌ Error reading file at ${path}:`, error.message);
        return { path, error: error.message };
      }
    },
  }),

  edit_file: tool({
    description:
      "Make edits to a text file or create a new file. Replaces 'old_str' with 'new_str' in the given file.",
    inputSchema: z.object({
      path: z.string().describe("The path to the file"),
      old_str: z
        .string()
        .nullable()
        .describe("Text to search for - must match exactly"),
      new_str: z.string().describe("Text to replace old_str with"),
    }),
    execute: async ({ path, old_str, new_str }) => {
      try {
        const fileExists = fs.existsSync(path);
        if (fileExists && old_str !== null) {
          console.log(`✏️ Editing file '${path}'`);
          const fileContents = fs.readFileSync(path, "utf-8");
          const newContents = fileContents.replace(old_str, new_str);
          fs.writeFileSync(path, newContents);
          return { path, success: true, action: "edit" };
        } else {
          console.log(`📝 Creating file '${path}'`);
          // Ensure directory exists
          const dir = path.dirname(path);
          if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
          }
          fs.writeFileSync(path, new_str);
          return { path, success: true, action: "create" };
        }
      } catch (e) {
        console.error(`❌ Error editing file ${path}:`, e);
        return { error: e, success: false };
      }
    },
  }),

  analyze_project_structure: tool({
    description:
      "Analyze the current Next.js project structure to understand components, pages, and architecture.",
    inputSchema: z.object({
      focus: z
        .string()
        .optional()
        .describe("Optional focus area like 'components', 'pages', 'api'"),
    }),
    execute: async ({ focus }) => {
      console.log(
        `🔍 Analyzing project structure${focus ? ` (focus: ${focus})` : ""}`
      );
      // Implementation for project analysis
      // This will analyze the project structure and return relevant information
      return { analysis: "Project structure analyzed", focus };
    },
  }),
};
```

#### 2.3 Database Tools

```typescript
// src/agent/tools/db-tools.ts
import { tool } from "ai";
import { z } from "zod";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export const dbTools = {
  create_schema: tool({
    description:
      "Generate a Drizzle ORM schema file for the specified table structure.",
    inputSchema: z.object({
      tableName: z.string().describe("Name of the table to create"),
      fields: z
        .array(
          z.object({
            name: z.string(),
            type: z.string(),
            constraints: z.array(z.string()).optional(),
          })
        )
        .describe("Array of field definitions"),
      schemaPath: z
        .string()
        .default("src/database/schemas")
        .describe("Path where schema file should be created"),
    }),
    execute: async ({ tableName, fields, schemaPath }) => {
      console.log(`🗃️ Creating schema for table: ${tableName}`);
      // Implementation for schema generation
      return {
        success: true,
        tableName,
        path: `${schemaPath}/${tableName}.ts`,
      };
    },
  }),

  run_migration: tool({
    description: "Execute database migrations using Drizzle Kit.",
    inputSchema: z.object({
      action: z
        .enum(["generate", "migrate", "push"])
        .describe("Migration action to perform"),
    }),
    execute: async ({ action }) => {
      console.log(`🚀 Running migration: ${action}`);
      try {
        const { stdout, stderr } = await execAsync(`npx drizzle-kit ${action}`);
        return { success: true, output: stdout, error: stderr };
      } catch (error) {
        return { success: false, error: error.message };
      }
    },
  }),

  seed_database: tool({
    description: "Populate database tables with sample data.",
    inputSchema: z.object({
      tableName: z.string().describe("Name of the table to seed"),
      sampleData: z
        .array(z.record(z.any()))
        .describe("Array of sample data objects"),
    }),
    execute: async ({ tableName, sampleData }) => {
      console.log(
        `🌱 Seeding table: ${tableName} with ${sampleData.length} records`
      );
      // Implementation for database seeding
      return { success: true, tableName, recordsInserted: sampleData.length };
    },
  }),
};
```

#### 2.4 API Generation Tools

```typescript
// src/agent/tools/api-tools.ts
import { tool } from "ai";
import { z } from "zod";

export const apiTools = {
  create_api_endpoint: tool({
    description: "Generate Next.js API route for database operations.",
    inputSchema: z.object({
      endpoint: z
        .string()
        .describe("API endpoint path (e.g., 'recently-played')"),
      methods: z
        .array(z.enum(["GET", "POST", "PUT", "DELETE"]))
        .describe("HTTP methods to implement"),
      tableName: z
        .string()
        .describe("Database table this endpoint will interact with"),
    }),
    execute: async ({ endpoint, methods, tableName }) => {
      console.log(
        `🔗 Creating API endpoint: /api/${endpoint} for table: ${tableName}`
      );
      // Implementation for API endpoint generation
      return { success: true, endpoint, methods, tableName };
    },
  }),

  update_api_types: tool({
    description: "Generate or update TypeScript types for API responses.",
    inputSchema: z.object({
      endpoint: z.string().describe("API endpoint name"),
      responseShape: z.record(z.any()).describe("Shape of the API response"),
    }),
    execute: async ({ endpoint, responseShape }) => {
      console.log(`📋 Updating types for API endpoint: ${endpoint}`);
      return { success: true, endpoint, typesGenerated: true };
    },
  }),
};
```

#### 2.5 System Prompts

```typescript
// src/agent/prompts/system-prompts.ts
export const SYSTEM_PROMPTS = {
  DATABASE_AGENT: `You are an expert database agent for Next.js projects. Your role is to:

1. **Analyze** existing Next.js project structures and understand the codebase
2. **Design** database schemas using Drizzle ORM with PostgreSQL
3. **Generate** type-safe API endpoints for database operations
4. **Integrate** database functionality into existing React components
5. **Ensure** type safety throughout the application

**Current Project Context:**
- Framework: Next.js 15 with TypeScript and React 19
- Database: PostgreSQL with Drizzle ORM
- UI: Custom Spotify clone with shadcn/ui components
- Styling: Tailwind CSS

**Key Principles:**
- Always use Drizzle ORM for database operations
- Generate type-safe API routes
- Maintain existing component structure and styling
- Provide clear progress updates for each step
- Handle errors gracefully and suggest solutions

**Available Tools:**
- File operations: list_files, read_file, edit_file
- Database operations: create_schema, run_migration, seed_database
- API generation: create_api_endpoint, update_api_types
- Project analysis: analyze_project_structure
- Frontend integration: integrate_api_with_component

When implementing database features:
1. First analyze the existing project structure
2. Understand the data requirements from the user query
3. Design appropriate database schemas
4. Generate API endpoints
5. Integrate with existing React components
6. Provide sample data for testing

Be concise but thorough in your responses. Always explain what you're doing at each step.`,

  SPOTIFY_CONTEXT: `This is a Spotify clone project with the following key components:
- spotify-header.tsx: Top navigation and search
- spotify-sidebar.tsx: Left navigation with playlists
- spotify-main-content.tsx: Main content area with music lists
- spotify-player.tsx: Bottom music player

The project currently uses static/mock data. Your job is to replace this with real database-backed functionality while preserving the existing UI/UX.`,
};
```

### Phase 3: CLI Implementation

#### 3.1 CLI Entry Point

```typescript
// src/cli/index.ts
#!/usr/bin/env node
import { Command } from 'commander';
import { initCommand } from './commands/init';
import { queryCommand } from './commands/query';
import { statusCommand } from './commands/status';
import chalk from 'chalk';

const program = new Command();

program
  .name('orchids-db-agent')
  .description('AI-powered database agent for Next.js projects')
  .version('1.0.0');

program
  .command('init')
  .description('Initialize database setup for the project')
  .action(initCommand);

program
  .command('query <text>')
  .description('Execute a natural language database query')
  .action(queryCommand);

program
  .command('status')
  .description('Show current database and project status')
  .action(statusCommand);

program.parse();
```

#### 3.2 Query Command Implementation

```typescript
// src/cli/commands/query.ts
import { databaseAgent } from "../../agent/core";
import { createSpinner } from "../utils/spinner";
import { logger } from "../utils/logger";
import chalk from "chalk";

export async function queryCommand(text: string) {
  const spinner = createSpinner("Processing your query...");

  try {
    spinner.start();
    logger.info(`Executing query: "${text}"`);

    const result = await databaseAgent(text);

    spinner.stop();

    logger.success("Query completed successfully!");
    logger.info("\nAgent Response:");
    console.log(chalk.cyan(result.response));

    if (result.steps && result.steps.length > 0) {
      logger.info("\nSteps taken:");
      result.steps.forEach((step, index) => {
        console.log(
          `${index + 1}. ${step.type}: ${step.description || "Processing..."}`
        );
      });
    }
  } catch (error) {
    spinner.stop();
    logger.error("Failed to process query:", error.message);
    process.exit(1);
  }
}
```

### Phase 4: Test Queries Implementation

#### 4.1 Test Query 1: Recently Played Songs

**User Input**: `"Can you store the recently played songs in a table"`

**Expected Agent Flow**:

1. Analyze project structure to understand current Spotify components
2. Design `recently_played_songs` table schema
3. Generate Drizzle schema file
4. Create migration and run it
5. Generate `/api/recently-played` endpoint
6. Seed table with sample Spotify-like data
7. Identify component that displays recently played (likely spotify-main-content.tsx)
8. Create custom hook for data fetching
9. Update component to use real database data

#### 4.2 Test Query 2: Made For You & Popular Albums

**User Input**: `"Can you store the 'Made for you' and 'Popular albums' in a table"`

**Expected Agent Flow**:

1. Parse request for multiple table requirements
2. Design schemas for `made_for_you_playlists` and `popular_albums`
3. Generate Drizzle schemas for both tables
4. Create and run migrations
5. Generate API endpoints: `/api/made-for-you` and `/api/popular-albums`
6. Seed both tables with sample data
7. Update relevant components to fetch from database
8. Ensure proper loading states and error handling

### Phase 5: Development Setup

#### 5.1 Environment Setup

Create `.env.local`:

```env
# Database
DATABASE_URL=postgresql://username:password@host:port/database

# AI
GOOGLE_GENERATIVE_AI_API_KEY=your_gemini_api_key

# Development
NODE_ENV=development
```

#### 5.2 Package.json Scripts

```json
{
  "scripts": {
    "dev": "next dev --turbopack",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "db:generate": "drizzle-kit generate",
    "db:migrate": "drizzle-kit migrate",
    "db:studio": "drizzle-kit studio",
    "agent:test": "tsx src/utils/test.ts",
    "agent:init": "tsx src/cli/index.ts init",
    "agent:query": "tsx src/cli/index.ts query"
  }
}
```

### Phase 6: Implementation Timeline

#### Week 1: Foundation (Sept 8-14)

- [x] Project analysis and planning
- [ ] Install dependencies and setup base structure
- [ ] Implement core AI agent with basic file tools
- [ ] Create CLI framework with commander.js

#### Week 2: Database Infrastructure (Sept 15-21)

- [ ] Implement database tools (schema, migration, seeding)
- [ ] Setup Drizzle ORM with PostgreSQL
- [ ] Create API generation tools
- [ ] Test basic database operations

#### Week 3: Integration & Test Queries (Sept 22-28)

- [ ] Implement frontend integration tools
- [ ] Execute test query 1: Recently played songs
- [ ] Execute test query 2: Made for you & Popular albums
- [ ] Ensure proper component integration

#### Week 4: Polish & Documentation (Sept 29 - Oct 5)

- [ ] Enhanced error handling and recovery
- [ ] CLI UX improvements with better logging
- [ ] Create demonstration video
- [ ] Final testing and bug fixes

### Success Metrics

1. ✅ **CLI Functionality**: Tool can be invoked and processes queries
2. ✅ **Database Integration**: Schemas are created and migrations run successfully
3. ✅ **API Generation**: Type-safe API endpoints are generated
4. ✅ **Frontend Integration**: Components successfully use database data
5. ✅ **User Experience**: Clear progress indicators and error handling

This updated plan leverages the Vercel AI SDK's powerful tool system exactly as you've demonstrated, making the agent more reliable and easier to extend.
