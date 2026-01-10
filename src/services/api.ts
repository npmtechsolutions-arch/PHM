import axios from 'axios';

// API Base URL from environment variable
// Local: http://localhost:8000/api/v1
// Production: https://your-api.com/api/v1
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1';

// Create axios instance with base configuration
const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request interceptor - add auth token
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('access_token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Response interceptor - handle errors
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        // Handle 401 - token expired
        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;

            try {
                const refreshToken = localStorage.getItem('refresh_token');
                if (refreshToken) {
                    const response = await axios.post('/api/v1/auth/refresh', {
                        refresh_token: refreshToken,
                    });

                    const { access_token } = response.data;
                    localStorage.setItem('access_token', access_token);

                    originalRequest.headers.Authorization = `Bearer ${access_token}`;
                    return api(originalRequest);
                }
            } catch (refreshError) {
                // Refresh failed - logout user
                localStorage.removeItem('access_token');
                localStorage.removeItem('refresh_token');
                window.location.href = '/login';
            }
        }

        return Promise.reject(error);
    }
);

export default api;

// Auth API
export const authApi = {
    login: (email: string, password: string) => {
        // OAuth2 requires form-urlencoded with 'username' field
        const formData = new URLSearchParams();
        formData.append('username', email);
        formData.append('password', password);

        return api.post('/auth/login', formData, {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
        });
    },

    logout: () => api.post('/auth/logout'),

    refreshToken: (refreshToken: string) =>
        api.post('/auth/refresh', { refresh_token: refreshToken }),

    me: () => api.get('/auth/me'),
};

// Users API
export const usersApi = {
    list: (params?: { page?: number; size?: number; search?: string }) =>
        api.get('/users', { params }),

    get: (id: string) => api.get(`/users/${id}`),

    create: (data: any) => api.post('/users', data),

    update: (id: string, data: any) => api.put(`/users/${id}`, data),

    delete: (id: string) => api.delete(`/users/${id}`),
};

// Warehouses API
export const warehousesApi = {
    list: (params?: { page?: number; size?: number; search?: string; status?: string }) =>
        api.get('/warehouses', { params }),

    get: (id: string) => api.get(`/warehouses/${id}`),

    create: (data: any) => api.post('/warehouses', data),

    update: (id: string, data: any) => api.put(`/warehouses/${id}`, data),

    delete: (id: string) => api.delete(`/warehouses/${id}`),

    getShops: (id: string) => api.get(`/warehouses/${id}/shops`),

    getStock: (id: string, params?: { page?: number; size?: number }) =>
        api.get(`/warehouses/${id}/stock`, { params }),
};

// Shops API
export const shopsApi = {
    list: (params?: { page?: number; size?: number; search?: string; status?: string; warehouse_id?: string }) =>
        api.get('/shops', { params }),

    get: (id: string) => api.get(`/shops/${id}`),

    create: (data: any) => api.post('/shops', data),

    update: (id: string, data: any) => api.put(`/shops/${id}`, data),

    delete: (id: string) => api.delete(`/shops/${id}`),

    getStock: (id: string, params?: { page?: number; size?: number; low_stock?: boolean }) =>
        api.get(`/shops/${id}/stock`, { params }),
};

// Medicines API
export const medicinesApi = {
    list: (params?: { page?: number; size?: number; search?: string; category?: string; manufacturer?: string }) =>
        api.get('/medicines', { params }),

    get: (id: string) => api.get(`/medicines/${id}`),

    create: (data: any) => api.post('/medicines', data),

    update: (id: string, data: any) => api.put(`/medicines/${id}`, data),

    delete: (id: string) => api.delete(`/medicines/${id}`),

    getBatches: (id: string) => api.get(`/medicines/${id}/batches`),

    createBatch: (id: string, data: any) => api.post(`/medicines/${id}/batches`, data),
};

// Inventory API
export const inventoryApi = {
    getMovements: (params?: { page?: number; size?: number; location_type?: string; location_id?: string; movement_type?: string }) =>
        api.get('/stock/movements', { params }),

    // Stock Entry - creates batch implicitly
    stockEntry: (data: {
        warehouse_id: string;
        medicine_id: string;
        batch_number: string;
        expiry_date: string;
        quantity: number;
        rack_name?: string;
        rack_number?: string;
    }) => api.post('/stock/entry', data),

    adjustStock: (data: any) => api.post('/stock/adjust', data),

    getAlerts: (alertType?: string) =>
        api.get('/stock/alerts', { params: { alert_type: alertType } }),
};

// Purchase Requests API
export const purchaseRequestsApi = {
    list: (params?: { page?: number; size?: number; status?: string; shop_id?: string; warehouse_id?: string }) =>
        api.get('/purchase-requests', { params }),

    get: (id: string) => api.get(`/purchase-requests/${id}`),

    create: (data: any) => api.post('/purchase-requests', data),

    approve: (id: string, data: any) => api.put(`/purchase-requests/${id}/approve`, data),

    reject: (id: string) => api.put(`/purchase-requests/${id}/reject`),
};

// Dispatches API
export const dispatchesApi = {
    list: (params?: { page?: number; size?: number; status?: string; warehouse_id?: string; shop_id?: string }) =>
        api.get('/dispatches', { params }),

    get: (id: string) => api.get(`/dispatches/${id}`),

    create: (data: any) => api.post('/dispatches', data),

    updateStatus: (id: string, status: string) => api.put(`/dispatches/${id}/status`, { status }),
};

// Invoices API
export const invoicesApi = {
    list: (params?: { page?: number; size?: number; shop_id?: string; customer_id?: string; status?: string }) =>
        api.get('/invoices', { params }),

    get: (id: string) => api.get(`/invoices/${id}`),

    create: (data: any) => api.post('/invoices', data),

    getItems: (id: string) => api.get(`/invoices/${id}/items`),

    processReturn: (id: string, data: any) => api.post(`/invoices/${id}/returns`, data),
};

// Customers API
export const customersApi = {
    list: (params?: { page?: number; size?: number; search?: string; shop_id?: string }) =>
        api.get('/customers', { params }),

    get: (id: string) => api.get(`/customers/${id}`),

    create: (data: any) => api.post('/customers', data),

    update: (id: string, data: any) => api.put(`/customers/${id}`, data),

    getFollowups: (id: string) => api.get(`/customers/${id}/followups`),

    createFollowup: (id: string, data: any) => api.post(`/customers/${id}/followups`, data),
};

// Employees API
export const employeesApi = {
    list: (params?: { page?: number; size?: number; search?: string; department?: string; shop_id?: string }) =>
        api.get('/employees', { params }),

    get: (id: string) => api.get(`/employees/${id}`),

    create: (data: any) => api.post('/employees', data),

    update: (id: string, data: any) => api.put(`/employees/${id}`, data),

    markAttendance: (data: any) => api.post('/employees/attendance', data),

    getAttendance: (id: string, params?: { month?: number; year?: number }) =>
        api.get(`/employees/attendance/${id}`, { params }),

    processSalary: (data: any) => api.post('/employees/salary/process', data),
};

// Reports API
export const reportsApi = {
    getSales: (params?: { shop_id?: string; date_from?: string; date_to?: string }) =>
        api.get('/reports/sales', { params }),

    getDailySales: (params?: { shop_id?: string; date?: string }) =>
        api.get('/reports/sales/daily', { params }),

    getMonthlySales: (params?: { shop_id?: string; month?: number; year?: number }) =>
        api.get('/reports/sales/monthly', { params }),

    getInventory: (params?: { warehouse_id?: string; shop_id?: string }) =>
        api.get('/reports/inventory', { params }),

    getProfitLoss: (params?: { shop_id?: string; month?: number; year?: number }) =>
        api.get('/reports/profit-loss', { params }),

    getExpiry: (params?: { warehouse_id?: string; shop_id?: string; days_ahead?: number }) =>
        api.get('/reports/expiry', { params }),
};

// Notifications API
export const notificationsApi = {
    list: (params?: { page?: number; size?: number; is_read?: boolean; notification_type?: string }) =>
        api.get('/notifications', { params }),

    markRead: (id: string) => api.put(`/notifications/${id}/read`),

    markAllRead: () => api.put('/notifications/read-all'),

    delete: (id: string) => api.delete(`/notifications/${id}`),
};

// Settings API
export const settingsApi = {
    get: () => api.get('/settings'),

    update: (data: any) => api.put('/settings', data),

    getTax: () => api.get('/settings/tax'),

    updateTax: (data: any) => api.put('/settings/tax', data),

    getTaxSummary: (params?: { month?: number; year?: number }) =>
        api.get('/settings/tax/summary', { params }),

    getGstReport: (params?: { month?: number; year?: number }) =>
        api.get('/settings/tax/gst', { params }),
};

// Roles API
export const rolesApi = {
    list: () => api.get('/roles'),

    get: (id: string) => api.get(`/roles/${id}`),

    create: (data: any) => api.post('/roles', data),

    update: (id: string, data: any) => api.put(`/roles/${id}`, data),

    delete: (id: string) => api.delete(`/roles/${id}`),

    assignToUser: (roleId: string, userId: string) =>
        api.post(`/roles/${roleId}/users/${userId}`),

    removeFromUser: (roleId: string, userId: string) =>
        api.delete(`/roles/${roleId}/users/${userId}`),
};

// Tax API
export const taxApi = {
    getSummary: (params?: { shop_id?: string; month?: number; year?: number }) =>
        api.get('/tax/summary', { params }),

    getGstReport: (params: { month: number; year: number; shop_id?: string }) =>
        api.get('/tax/gst', { params }),

    getVatReport: (params: { month: number; year: number; shop_id?: string }) =>
        api.get('/tax/vat', { params }),

    getPeriodReport: (year: number, month: number, shop_id?: string) =>
        api.get(`/tax/period/${year}/${month}`, { params: { shop_id } }),

    getSettings: () => api.get('/tax/settings'),

    updateSettings: (data: any) => api.put('/tax/settings', data),
};

// Rack Master API
export const racksApi = {
    list: (params?: { page?: number; size?: number; search?: string; warehouse_id?: string; shop_id?: string }) =>
        api.get('/racks', { params }),

    get: (id: string) => api.get(`/racks/${id}`),

    create: (data: any) => api.post('/racks', data),

    update: (id: string, data: any) => api.put(`/racks/${id}`, data),

    delete: (id: string) => api.delete(`/racks/${id}`),
};

// Audit Logs API (Read-Only)
export const auditLogsApi = {
    list: (params?: { page?: number; size?: number; action?: string; entity_type?: string; user_id?: string; date_from?: string; date_to?: string }) =>
        api.get('/audit-logs', { params }),

    getStats: () => api.get('/audit-logs/stats'),
};

// Login Activity API (Read-Only)
export const loginActivityApi = {
    list: (params?: { page?: number; size?: number; action?: string; status?: string; user_id?: string; date_from?: string; date_to?: string }) =>
        api.get('/login-activity', { params }),

    getStats: () => api.get('/login-activity/stats'),
};

// Masters API (Categories, Units, HSN)
export const mastersApi = {
    // Categories
    listCategories: () => api.get('/masters/categories'),
    createCategory: (data: any) => api.post('/masters/categories', data),
    updateCategory: (id: string, data: any) => api.put(`/masters/categories/${id}`, data),
    deleteCategory: (id: string) => api.delete(`/masters/categories/${id}`),

    // Units
    listUnits: () => api.get('/masters/units'),
    createUnit: (data: any) => api.post('/masters/units', data),
    updateUnit: (id: string, data: any) => api.put(`/masters/units/${id}`, data),
    deleteUnit: (id: string) => api.delete(`/masters/units/${id}`),

    // HSN Codes
    listHSN: () => api.get('/masters/hsn'),
    createHSN: (data: any) => api.post('/masters/hsn', data),
    updateHSN: (id: string, data: any) => api.put(`/masters/hsn/${id}`, data),
    deleteHSN: (id: string) => api.delete(`/masters/hsn/${id}`),
};


