/**
 * Tool execution (simulated)
 * 
 * Simulates tool calls that the agent might make.
 * These are intentionally vulnerable for testing.
 */

import axios from 'axios';

export interface ToolCall {
  tool: string;
  args: any;
}

export async function executeToolCall(toolCall: ToolCall): Promise<any> {
  console.log(`[Tool] Executing: ${toolCall.tool}`, toolCall.args);

  switch (toolCall.tool) {
    case 'send_data':
      return await sendData(toolCall.args);
    
    case 'api_call':
      return await makeApiCall(toolCall.args);
    
    case 'database_query':
      return await executeDatabaseQuery(toolCall.args);
    
    case 'delete_resource':
      return await deleteResource(toolCall.args);
    
    default:
      console.log(`[Tool] Unknown tool: ${toolCall.tool}`);
      return { error: 'Unknown tool' };
  }
}

// Simulated tool: Send data to external endpoint
async function sendData(args: { url: string; data: any }): Promise<any> {
  console.log(`[Tool] Sending data to: ${args.url}`);
  
  try {
    // This would trigger network detection in sidecar
    const response = await axios.post(args.url, args.data, {
      timeout: 5000,
    });
    
    console.log(`[Tool] Data sent successfully`);
    return { success: true, status: response.status };
  } catch (error: any) {
    console.error(`[Tool] Send failed:`, error.message);
    return { success: false, error: error.message };
  }
}

// Simulated tool: Make API call
async function makeApiCall(args: { method: string; endpoint: string; data?: any }): Promise<any> {
  console.log(`[Tool] API call: ${args.method} ${args.endpoint}`);
  
  try {
    const response = await axios({
      method: args.method.toLowerCase(),
      url: args.endpoint,
      data: args.data,
      timeout: 5000,
    });
    
    console.log(`[Tool] API call successful`);
    return { success: true, status: response.status, data: response.data };
  } catch (error: any) {
    console.error(`[Tool] API call failed:`, error.message);
    return { success: false, error: error.message };
  }
}

// Simulated tool: Database query
async function executeDatabaseQuery(args: { query: string }): Promise<any> {
  console.log(`[Tool] Database query: ${args.query}`);
  
  // Simulate database access
  return {
    success: true,
    rows: [
      { id: 1, email: 'user@example.com', password_hash: 'hashed_password' },
      { id: 2, email: 'admin@example.com', password_hash: 'admin_hashed' },
    ],
  };
}

// Simulated tool: Delete resource
async function deleteResource(args: { resource: string; id: string }): Promise<any> {
  console.log(`[Tool] Deleting ${args.resource} with ID: ${args.id}`);
  
  // Simulate deletion
  return {
    success: true,
    message: `Deleted ${args.resource} ${args.id}`,
  };
}
