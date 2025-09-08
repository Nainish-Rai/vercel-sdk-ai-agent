// Core agent types
export interface AgentResponse {
  response: string;
  steps: AgentStep[];
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface AgentStep {
  toolName?: string;
  text?: string;
  result?: any;
}

// Database schema types
export interface FieldDefinition {
  name: string;
  type: "string" | "text" | "number" | "integer" | "boolean" | "timestamp";
  constraints?: ("notNull" | "primaryKey" | "unique")[];
}

export interface SchemaGenerationRequest {
  tableName: string;
  fields: FieldDefinition[];
  schemaPath?: string;
}

// API generation types
export interface ApiEndpointRequest {
  endpoint: string;
  methods: ("GET" | "POST" | "PUT" | "DELETE")[];
  tableName: string;
}

// Project analysis types
export interface ProjectAnalysis {
  hasNextApp: boolean;
  hasComponents: boolean;
  hasDatabase: boolean;
  spotifyComponents: {
    header: boolean;
    sidebar: boolean;
    mainContent: boolean;
    player: boolean;
  };
  packageJson: boolean;
  tsConfig: boolean;
}

// CLI command types
export interface CliOptions {
  verbose?: boolean;
  dryRun?: boolean;
  force?: boolean;
}

// Environment configuration
export interface DatabaseConfig {
  url: string;
  type: "postgres" | "supabase";
}

export interface AIConfig {
  apiKey: string;
  model: string;
}

export interface EnvironmentConfig {
  database: DatabaseConfig;
  ai: AIConfig;
  nodeEnv: "development" | "production" | "test";
}
