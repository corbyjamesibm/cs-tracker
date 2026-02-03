/**
 * Configuration for the CS Tracker MCP server
 */

export interface Config {
  apiBaseUrl: string;
  apiToken: string;
}

export function getConfig(): Config {
  const apiBaseUrl = process.env.CS_TRACKER_API_URL || 'http://localhost:8000/api/v1';
  const apiToken = process.env.CS_TRACKER_API_TOKEN || '';

  if (!apiToken) {
    console.warn('Warning: CS_TRACKER_API_TOKEN not set. API calls may fail.');
  }

  return {
    apiBaseUrl,
    apiToken,
  };
}
