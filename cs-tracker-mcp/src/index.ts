#!/usr/bin/env node
/**
 * CS Tracker MCP Server
 *
 * An MCP server that provides tools for interacting with CS Tracker.
 * Enables Claude Desktop and Claude Code to query and act on customer data.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

import { customerTools } from './tools/customers.js';
import { taskTools } from './tools/tasks.js';
import { engagementTools } from './tools/engagements.js';
import { riskTools } from './tools/risks.js';
import { analyticsTools } from './tools/analytics.js';

// Combine all tools
const allTools = {
  ...customerTools,
  ...taskTools,
  ...engagementTools,
  ...riskTools,
  ...analyticsTools,
};

// Create server
const server = new Server(
  {
    name: 'cs-tracker-mcp',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// List tools handler
server.setRequestHandler(ListToolsRequestSchema, async () => {
  const tools = Object.entries(allTools).map(([name, tool]) => ({
    name,
    description: tool.description,
    inputSchema: tool.inputSchema,
  }));

  return { tools };
});

// Call tool handler
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  const tool = allTools[name as keyof typeof allTools];
  if (!tool) {
    return {
      content: [
        {
          type: 'text',
          text: `Unknown tool: ${name}`,
        },
      ],
      isError: true,
    };
  }

  try {
    const result = await tool.handler(args as any);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error executing tool: ${error}`,
        },
      ],
      isError: true,
    };
  }
});

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('CS Tracker MCP server running on stdio');
}

main().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});
