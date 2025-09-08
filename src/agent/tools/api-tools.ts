import { tool } from "ai";
import { z } from "zod";
import fs from "fs";

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

      try {
        const imports = `import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/database/connection';
import { ${tableName} } from '@/database/schemas/${tableName}';
import { eq } from 'drizzle-orm';`;

        const methodHandlers = methods
          .map((method) => {
            switch (method) {
              case "GET":
                return `export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (id) {
      const result = await db.select().from(${tableName}).where(eq(${tableName}.id, parseInt(id)));
      return NextResponse.json(result[0] || null);
    }

    const results = await db.select().from(${tableName});
    return NextResponse.json(results);
  } catch (error) {
    console.error('Error fetching ${tableName}:', error);
    return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 });
  }
}`;

              case "POST":
                return `export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = await db.insert(${tableName}).values(body).returning();
    return NextResponse.json(result[0], { status: 201 });
  } catch (error) {
    console.error('Error creating ${tableName}:', error);
    return NextResponse.json({ error: 'Failed to create data' }, { status: 500 });
  }
}`;

              case "PUT":
                return `export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    const body = await request.json();
    const result = await db
      .update(${tableName})
      .set(body)
      .where(eq(${tableName}.id, parseInt(id)))
      .returning();

    return NextResponse.json(result[0] || null);
  } catch (error) {
    console.error('Error updating ${tableName}:', error);
    return NextResponse.json({ error: 'Failed to update data' }, { status: 500 });
  }
}`;

              case "DELETE":
                return `export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    await db.delete(${tableName}).where(eq(${tableName}.id, parseInt(id)));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting ${tableName}:', error);
    return NextResponse.json({ error: 'Failed to delete data' }, { status: 500 });
  }
}`;

              default:
                return "";
            }
          })
          .join("\n\n");

        const apiContent = `${imports}

${methodHandlers}
`;

        // Create API directory if it doesn't exist
        const apiDir = "src/app/api";
        const endpointDir = `${apiDir}/${endpoint}`;

        if (!fs.existsSync(apiDir)) {
          fs.mkdirSync(apiDir, { recursive: true });
        }

        if (!fs.existsSync(endpointDir)) {
          fs.mkdirSync(endpointDir, { recursive: true });
        }

        const filePath = `${endpointDir}/route.ts`;
        fs.writeFileSync(filePath, apiContent);

        return {
          success: true,
          endpoint: `/api/${endpoint}`,
          methods,
          tableName,
          filePath,
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : String(error),
          endpoint,
        };
      }
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

      try {
        const typeName = endpoint
          .split("-")
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
          .join("");

        const typeContent = `// API Types for ${endpoint} endpoint

export interface ${typeName}Response {
${Object.entries(responseShape)
  .map(([key, value]) => {
    let type = "unknown";
    if (typeof value === "string") type = "string";
    else if (typeof value === "number") type = "number";
    else if (typeof value === "boolean") type = "boolean";
    else if (Array.isArray(value)) type = "any[]";
    else if (value instanceof Date) type = "Date";

    return `  ${key}: ${type};`;
  })
  .join("\n")}
}

export interface ${typeName}CreateRequest {
${Object.entries(responseShape)
  .filter(([key]) => key !== "id" && key !== "createdAt" && key !== "updatedAt")
  .map(([key, value]) => {
    let type = "unknown";
    if (typeof value === "string") type = "string";
    else if (typeof value === "number") type = "number";
    else if (typeof value === "boolean") type = "boolean";
    else if (Array.isArray(value)) type = "any[]";

    return `  ${key}: ${type};`;
  })
  .join("\n")}
}

export interface ${typeName}UpdateRequest extends Partial<${typeName}CreateRequest> {}
`;

        const typesDir = "src/types";
        if (!fs.existsSync(typesDir)) {
          fs.mkdirSync(typesDir, { recursive: true });
        }

        const filePath = `${typesDir}/${endpoint}-api.ts`;
        fs.writeFileSync(filePath, typeContent);

        return {
          success: true,
          endpoint,
          typesGenerated: true,
          filePath,
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : String(error),
          endpoint,
        };
      }
    },
  }),

  create_api_client_hook: tool({
    description: "Generate a custom React hook for API interaction.",
    inputSchema: z.object({
      endpoint: z.string().describe("API endpoint name"),
      tableName: z.string().describe("Database table name"),
    }),
    execute: async ({ endpoint, tableName }) => {
      console.log(`🪝 Creating API client hook for: ${endpoint}`);

      try {
        const hookName = `use${endpoint
          .split("-")
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
          .join("")}`;

        const hookContent = `import { useState, useEffect } from 'react';
import { ${
          tableName.charAt(0).toUpperCase() + tableName.slice(1)
        } } from '@/database/schemas/${tableName}';

export function ${hookName}() {
  const [data, setData] = useState<${
    tableName.charAt(0).toUpperCase() + tableName.slice(1)
  }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/${endpoint}');
      if (!response.ok) {
        throw new Error('Failed to fetch data');
      }
      const result = await response.json();
      setData(result);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const createItem = async (item: Omit<${
    tableName.charAt(0).toUpperCase() + tableName.slice(1)
  }, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const response = await fetch('/api/${endpoint}', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(item),
      });

      if (!response.ok) {
        throw new Error('Failed to create item');
      }

      const newItem = await response.json();
      setData(prev => [...prev, newItem]);
      return newItem;
    } catch (err) {
      throw err;
    }
  };

  const updateItem = async (id: number, updates: Partial<${
    tableName.charAt(0).toUpperCase() + tableName.slice(1)
  }>) => {
    try {
      const response = await fetch(\`/api/${endpoint}?id=\${id}\`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        throw new Error('Failed to update item');
      }

      const updatedItem = await response.json();
      setData(prev => prev.map(item => item.id === id ? updatedItem : item));
      return updatedItem;
    } catch (err) {
      throw err;
    }
  };

  const deleteItem = async (id: number) => {
    try {
      const response = await fetch(\`/api/${endpoint}?id=\${id}\`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete item');
      }

      setData(prev => prev.filter(item => item.id !== id));
    } catch (err) {
      throw err;
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return {
    data,
    loading,
    error,
    refetch: fetchData,
    create: createItem,
    update: updateItem,
    delete: deleteItem,
  };
}
`;

        const hooksDir = "src/hooks";
        if (!fs.existsSync(hooksDir)) {
          fs.mkdirSync(hooksDir, { recursive: true });
        }

        const filePath = `${hooksDir}/${hookName.toLowerCase()}.ts`;
        fs.writeFileSync(filePath, hookContent);

        return {
          success: true,
          endpoint,
          hookName,
          filePath,
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : String(error),
          endpoint,
        };
      }
    },
  }),
};
