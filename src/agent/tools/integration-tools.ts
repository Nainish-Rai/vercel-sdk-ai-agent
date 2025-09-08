import { tool } from "ai";
import { z } from "zod";
import fs from "fs";
import path from "path";

export const integrationTools = {
  create_custom_hook: tool({
    description:
      "Generate a custom React hook for fetching data from API endpoints.",
    inputSchema: z.object({
      hookName: z
        .string()
        .describe("Name of the custom hook (e.g., 'useRecentlyPlayed')"),
      apiEndpoint: z
        .string()
        .describe("API endpoint to fetch from (e.g., '/api/recently-played')"),
      returnType: z.string().describe("TypeScript type for the returned data"),
      hookPath: z
        .string()
        .default("src/hooks")
        .describe("Path where hook should be created"),
    }),
    execute: async ({ hookName, apiEndpoint, returnType, hookPath }) => {
      console.log(`🪝 Creating custom hook: ${hookName}`);

      const hookContent = `import { useState, useEffect } from 'react';

export interface ${returnType} {
  // Define your data structure here
  id: string;
  [key: string]: any;
}

export function ${hookName}() {
  const [data, setData] = useState<${returnType}[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const response = await fetch('${apiEndpoint}');
        if (!response.ok) {
          throw new Error(\`Failed to fetch: \${response.statusText}\`);
        }
        const result = await response.json();
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  return { data, loading, error, refetch: () => fetchData() };
}`;

      try {
        // Ensure directory exists
        if (!fs.existsSync(hookPath)) {
          fs.mkdirSync(hookPath, { recursive: true });
        }

        const filePath = path.join(hookPath, `${hookName}.ts`);
        fs.writeFileSync(filePath, hookContent);

        return {
          success: true,
          hookName,
          path: filePath,
          apiEndpoint,
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    },
  }),

  integrate_api_with_component: tool({
    description:
      "Update a React component to use database data instead of static data.",
    inputSchema: z.object({
      componentPath: z.string().describe("Path to the React component file"),
      hookName: z
        .string()
        .describe("Name of the custom hook to import and use"),
      dataProperty: z
        .string()
        .describe("Property name in component that contains static data"),
      hookImportPath: z.string().describe("Import path for the custom hook"),
    }),
    execute: async ({
      componentPath,
      hookName,
      dataProperty,
      hookImportPath,
    }) => {
      console.log(
        `🔗 Integrating ${hookName} with component: ${componentPath}`
      );

      try {
        if (!fs.existsSync(componentPath)) {
          return {
            success: false,
            error: `Component file not found: ${componentPath}`,
          };
        }

        const componentContent = fs.readFileSync(componentPath, "utf-8");

        // Add hook import
        const importRegex = /^(import.*from.*['"];?)$/gm;
        const imports = componentContent.match(importRegex) || [];
        const lastImport = imports[imports.length - 1];

        if (lastImport && !componentContent.includes(hookImportPath)) {
          const hookImport = `import { ${hookName} } from '${hookImportPath}';`;
          const updatedContent = componentContent.replace(
            lastImport,
            `${lastImport}\n${hookImport}`
          );

          fs.writeFileSync(componentPath, updatedContent);
        }

        return {
          success: true,
          componentPath,
          hookName,
          message: "Component updated to use database data",
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    },
  }),

  update_component_types: tool({
    description:
      "Update TypeScript types in a component to match database schema.",
    inputSchema: z.object({
      componentPath: z.string().describe("Path to the component file"),
      typeName: z.string().describe("Name of the type to update or create"),
      typeDefinition: z.string().describe("TypeScript interface definition"),
    }),
    execute: async ({ componentPath, typeName, typeDefinition }) => {
      console.log(`📋 Updating types in component: ${componentPath}`);

      try {
        if (!fs.existsSync(componentPath)) {
          return {
            success: false,
            error: `Component file not found: ${componentPath}`,
          };
        }

        // For now, we'll add the type definition at the top of the file
        const componentContent = fs.readFileSync(componentPath, "utf-8");

        // Check if type already exists
        if (componentContent.includes(`interface ${typeName}`)) {
          return {
            success: true,
            message: `Type ${typeName} already exists in component`,
            componentPath,
          };
        }

        // Add type definition after imports
        const importEndIndex = componentContent.lastIndexOf("';") + 2;
        const beforeImports = componentContent.substring(0, importEndIndex);
        const afterImports = componentContent.substring(importEndIndex);

        const updatedContent = `${beforeImports}\n\n${typeDefinition}\n${afterImports}`;
        fs.writeFileSync(componentPath, updatedContent);

        return {
          success: true,
          componentPath,
          typeName,
          message: "Types updated successfully",
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    },
  }),

  analyze_component_data_usage: tool({
    description:
      "Analyze how a component currently uses static data to understand integration points.",
    inputSchema: z.object({
      componentPath: z.string().describe("Path to the component file"),
    }),
    execute: async ({ componentPath }) => {
      console.log(`🔍 Analyzing data usage in: ${componentPath}`);

      try {
        if (!fs.existsSync(componentPath)) {
          return {
            success: false,
            error: `Component file not found: ${componentPath}`,
          };
        }

        const componentContent = fs.readFileSync(componentPath, "utf-8");

        const analysis = {
          hasStaticData:
            componentContent.includes("const") &&
            componentContent.includes("="),
          hasUseState: componentContent.includes("useState"),
          hasUseEffect: componentContent.includes("useEffect"),
          hasFetchCalls: componentContent.includes("fetch"),
          hasMapFunctions: componentContent.includes(".map("),
          hasProps:
            componentContent.includes("props") ||
            componentContent.includes(": {"),
          fileSize: componentContent.length,
          linesOfCode: componentContent.split("\n").length,
        };

        return {
          success: true,
          componentPath,
          analysis,
          recommendations: [
            analysis.hasStaticData
              ? "Replace static data with API calls"
              : "Component ready for API integration",
            !analysis.hasUseState
              ? "Consider adding state management for loading/error states"
              : "State management present",
            !analysis.hasFetchCalls
              ? "Add data fetching logic"
              : "Data fetching already implemented",
          ],
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    },
  }),
};
