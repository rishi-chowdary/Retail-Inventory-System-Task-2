const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export class ApiError extends Error {
  public code: string;
  public status: number;
  public details?: any;

  constructor(message: string, status: number, code: string, details?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

const getAuthToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('token');
};

const request = async <T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> => {
  const token = getAuthToken();
  const headers = new Headers(options.headers || {});

  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers
  });

  // Handle CSV file stream directly if response is text/csv
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('text/csv')) {
    if (!response.ok) {
      throw new ApiError('Failed to download CSV', response.status, 'DOWNLOAD_FAILED');
    }
    const blob = await response.blob();
    return blob as unknown as T;
  }

  const json = await response.json().catch(() => ({}));

  if (!response.ok || !json.success) {
    const errorMsg = json?.error?.message || `Request failed with status ${response.status}`;
    const errorCode = json?.error?.code || 'UNKNOWN_ERROR';
    const errorDetails = json?.error?.details;
    throw new ApiError(errorMsg, response.status, errorCode, errorDetails);
  }

  return json.data as T;
};

// Auth API endpoints
export const authApi = {
  login: (credentials: { email: string; pass: string }) =>
    request<{ token: string; user: any }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: credentials.email, password: credentials.pass })
    }),
  getMe: () => request<any>('/auth/me')
};

// Products API endpoints
export const productsApi = {
  list: (params: { q?: string; category?: string; stockStatus?: string; page?: number; limit?: number } = {}) => {
    const query = new URLSearchParams();
    if (params.q) query.set('q', params.q);
    if (params.category) query.set('category', params.category);
    if (params.stockStatus) query.set('stockStatus', params.stockStatus);
    if (params.page) query.set('page', params.page.toString());
    if (params.limit) query.set('limit', params.limit.toString());
    return request<{ products: any[]; pagination: any }>(`/products?${query.toString()}`);
  },
  getById: (id: string) => request<any>(`/products/${id}`),
  create: (data: any) =>
    request<any>('/products', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
  update: (id: string, data: any) =>
    request<any>(`/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    }),
  deactivate: (id: string) =>
    request<any>(`/products/${id}/deactivate`, {
      method: 'PATCH'
    })
};

// Inventory API endpoints
export const inventoryApi = {
  getLowStock: () => request<any[]>('/inventory/low-stock'),
  adjustStock: (data: {
    productId: string;
    type: 'received' | 'add' | 'remove';
    quantity: number;
    reason: string;
    reference?: string;
  }) =>
    request<any>('/inventory/adjustments', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
  getMovements: (params: { product?: string; type?: string; from?: string; to?: string; page?: number; limit?: number } = {}) => {
    const query = new URLSearchParams();
    if (params.product) query.set('product', params.product);
    if (params.type) query.set('type', params.type);
    if (params.from) query.set('from', params.from);
    if (params.to) query.set('to', params.to);
    if (params.page) query.set('page', params.page.toString());
    if (params.limit) query.set('limit', params.limit.toString());
    return request<{ movements: any[]; pagination: any }>(`/inventory/movements?${query.toString()}`);
  }
};

// Sales API endpoints
export const salesApi = {
  create: (data: {
    items: { productId: string; quantity: number }[];
    discountType?: 'percentage' | 'fixed' | 'none';
    discountValue?: number;
    taxRate?: number;
  }) =>
    request<any>('/sales', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
  list: (params: { from?: string; to?: string; status?: string; page?: number; limit?: number } = {}) => {
    const query = new URLSearchParams();
    if (params.from) query.set('from', params.from);
    if (params.to) query.set('to', params.to);
    if (params.status) query.set('status', params.status);
    if (params.page) query.set('page', params.page.toString());
    if (params.limit) query.set('limit', params.limit.toString());
    return request<{ sales: any[]; pagination: any }>(`/sales?${query.toString()}`);
  },
  getById: (id: string) => request<{ sale: any; returns: any[] }>(`/sales/${id}`),
  processReturn: (saleId: string, data: { items: { productId: string; quantity: number }[]; reason: string }) =>
    request<any>(`/sales/${saleId}/returns`, {
      method: 'POST',
      body: JSON.stringify(data)
    })
};

// Reports API endpoints
export const reportsApi = {
  getSales: (params: { from?: string; to?: string } = {}) => {
    const query = new URLSearchParams();
    if (params.from) query.set('from', params.from);
    if (params.to) query.set('to', params.to);
    return request<any>(`/reports/sales?${query.toString()}`);
  },
  getProfit: (params: { from?: string; to?: string } = {}) => {
    const query = new URLSearchParams();
    if (params.from) query.set('from', params.from);
    if (params.to) query.set('to', params.to);
    return request<any>(`/reports/profit?${query.toString()}`);
  },
  downloadCsv: async (params: { from?: string; to?: string } = {}) => {
    const query = new URLSearchParams();
    if (params.from) query.set('from', params.from);
    if (params.to) query.set('to', params.to);
    const blob = await request<Blob>(`/reports/sales/export?${query.toString()}`);
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sales-report-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  }
};
