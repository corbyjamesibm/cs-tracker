/**
 * API client for communicating with CS Tracker backend
 */

import { getConfig } from './config.js';

interface ApiResponse<T> {
  data?: T;
  error?: string;
}

class ApiClient {
  private baseUrl: string;
  private token: string;

  constructor() {
    const config = getConfig();
    this.baseUrl = config.apiBaseUrl;
    this.token = config.apiToken;
  }

  private async request<T>(
    method: string,
    endpoint: string,
    body?: unknown
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    try {
      const response = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      });

      if (!response.ok) {
        const errorText = await response.text();
        return { error: `API error ${response.status}: ${errorText}` };
      }

      if (response.status === 204) {
        return { data: undefined as T };
      }

      const data = await response.json();
      return { data };
    } catch (error) {
      return { error: `Request failed: ${error}` };
    }
  }

  // Customers
  async getCustomers(params?: {
    skip?: number;
    limit?: number;
    health_status?: string;
    csm_owner_id?: number;
  }): Promise<ApiResponse<any>> {
    const queryParams = new URLSearchParams();
    if (params?.skip) queryParams.set('skip', params.skip.toString());
    if (params?.limit) queryParams.set('limit', params.limit.toString());
    if (params?.health_status) queryParams.set('health_status', params.health_status);
    if (params?.csm_owner_id) queryParams.set('csm_owner_id', params.csm_owner_id.toString());

    const query = queryParams.toString();
    return this.request('GET', `/customers${query ? '?' + query : ''}`);
  }

  async getCustomer(id: number): Promise<ApiResponse<any>> {
    return this.request('GET', `/customers/${id}`);
  }

  // Tasks
  async getTasks(params?: {
    customer_id?: number;
    status?: string;
    assignee_id?: number;
  }): Promise<ApiResponse<any>> {
    const queryParams = new URLSearchParams();
    if (params?.customer_id) queryParams.set('customer_id', params.customer_id.toString());
    if (params?.status) queryParams.set('status', params.status);
    if (params?.assignee_id) queryParams.set('assignee_id', params.assignee_id.toString());

    const query = queryParams.toString();
    return this.request('GET', `/tasks${query ? '?' + query : ''}`);
  }

  async createTask(data: {
    title: string;
    description?: string;
    customer_id?: number;
    priority?: string;
    due_date?: string;
    assignee_id?: number;
  }): Promise<ApiResponse<any>> {
    return this.request('POST', '/tasks', data);
  }

  async completeTask(id: number, notes?: string): Promise<ApiResponse<any>> {
    return this.request('POST', `/tasks/${id}/complete`, { completion_notes: notes });
  }

  // Engagements
  async getEngagements(params?: { customer_id?: number }): Promise<ApiResponse<any>> {
    const queryParams = new URLSearchParams();
    if (params?.customer_id) queryParams.set('customer_id', params.customer_id.toString());

    const query = queryParams.toString();
    return this.request('GET', `/engagements${query ? '?' + query : ''}`);
  }

  async createEngagement(data: {
    customer_id: number;
    engagement_type: string;
    title: string;
    summary?: string;
    engagement_date?: string;
  }): Promise<ApiResponse<any>> {
    return this.request('POST', '/engagements', data);
  }

  // Risks
  async getRisks(params?: {
    customer_id?: number;
    severity?: string;
    status?: string;
    open_only?: boolean;
  }): Promise<ApiResponse<any>> {
    const queryParams = new URLSearchParams();
    if (params?.customer_id) queryParams.set('customer_id', params.customer_id.toString());
    if (params?.severity) queryParams.set('severity', params.severity);
    if (params?.status) queryParams.set('status', params.status);
    if (params?.open_only !== undefined) queryParams.set('open_only', params.open_only.toString());

    const query = queryParams.toString();
    return this.request('GET', `/risks${query ? '?' + query : ''}`);
  }

  async getRiskSummary(): Promise<ApiResponse<any>> {
    return this.request('GET', '/risks/summary');
  }

  async createRisk(data: {
    customer_id: number;
    title: string;
    description?: string;
    severity?: string;
    category?: string;
    mitigation_plan?: string;
  }): Promise<ApiResponse<any>> {
    return this.request('POST', '/risks', data);
  }

  // Meeting Notes
  async getMeetingNotes(params?: { customer_id?: number }): Promise<ApiResponse<any>> {
    const queryParams = new URLSearchParams();
    if (params?.customer_id) queryParams.set('customer_id', params.customer_id.toString());

    const query = queryParams.toString();
    return this.request('GET', `/meeting-notes${query ? '?' + query : ''}`);
  }

  async createMeetingNote(data: {
    customer_id: number;
    title: string;
    meeting_date?: string;
    attendees?: string;
    notes?: string;
    action_items?: string;
    next_steps?: string;
  }): Promise<ApiResponse<any>> {
    return this.request('POST', '/meeting-notes', data);
  }
}

export const apiClient = new ApiClient();
