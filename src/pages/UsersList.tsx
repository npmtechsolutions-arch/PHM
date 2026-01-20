import { useState, useEffect } from 'react';
import { usersApi, warehousesApi, shopsApi, rolesApi } from '../services/api';
import UniversalListPage from '../components/UniversalListPage';
import StatCard from '../components/StatCard';
import Badge from '../components/Badge';
import { type Column } from '../components/Table';
import Button from '../components/Button';
import SearchableSelect from '../components/SearchableSelect';

interface User {
    id: string;
    email: string;
    full_name: string;
    phone?: string;
    role: string;
    is_active: boolean;
    last_login?: string;
    created_at: string;
    assigned_warehouse_id?: string;
    assigned_shop_id?: string;
}

import { useUser } from '../contexts/UserContext';

export default function UsersList() {
    const { user: currentUser } = useUser();
    const userRole = currentUser?.role || '';

    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [showPassword, setShowPassword] = useState(false);

    // Filter states
    const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('active');
    const [roleFilter, setRoleFilter] = useState<string>('all');

    // Pagination states
    const [currentPage, setCurrentPage] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const [pageSize, setPageSize] = useState(10);

    const [formData, setFormData] = useState({
        email: '',
        full_name: '',
        phone: '',
        role: '',
        role_id: '',
        password: '',
        assigned_warehouse_id: '',
        assigned_shop_id: '',
    });

    // Entity lists for assignment
    const [warehouses, setWarehouses] = useState<{ id: string, name: string }[]>([]);
    const [shops, setShops] = useState<{ id: string, name: string }[]>([]);
    const [assignableRoles, setAssignableRoles] = useState<{ id: string, name: string, entity_type: string | null }[]>([]);

    useEffect(() => {
        fetchUsers();
        fetchEntities();
    }, [statusFilter, roleFilter, currentPage, pageSize]); // Re-fetch when filters or pagination change

    const fetchEntities = async () => {
        try {
            const [warehouseRes, shopRes, rolesRes] = await Promise.all([
                warehousesApi.list({ size: 500 }),  // Fetch all warehouses for dropdown
                shopsApi.list({ size: 500 }),        // Fetch all shops for dropdown
                rolesApi.listAssignable()
            ]);
            setWarehouses(warehouseRes.data?.items || warehouseRes.data || []);
            setShops(shopRes.data?.items || shopRes.data || []);
            const rawRoles = rolesRes.data?.roles || rolesRes.data?.items || (Array.isArray(rolesRes.data) ? rolesRes.data : []);
            setAssignableRoles(rawRoles.filter((r: any) => r.name !== 'super_admin'));
        } catch (error) {
            console.error('Failed to fetch entities:', error);
            setAssignableRoles([]);
        }
    };

    const fetchUsers = async () => {
        try {
            setLoading(true);
            // Construct query params
            const params: any = { search, page: currentPage, size: pageSize };
            if (statusFilter !== 'all') params.is_active = statusFilter === 'active';
            if (roleFilter !== 'all') params.role = roleFilter;

            const response = await usersApi.list(params);
            setUsers(response.data?.items || response.data?.data || response.data || []);
            setTotalItems(response.data?.total || (response.data?.items || response.data?.data || response.data || []).length);
        } catch (error) {
            console.error('Failed to fetch users:', error);
        } finally {
            setLoading(false);
        }
    };

    // ... [Preserved logic: handleSearch, openCreateModal, openEditModal, handleSubmit, handleDelete] ...
    const openCreateModal = () => {
        setEditingUser(null);
        setFormData({ email: '', full_name: '', phone: '', role: '', role_id: '', password: '', assigned_warehouse_id: '', assigned_shop_id: '' });
        setShowModal(true);
    };

    const openEditModal = (user: User) => {
        setEditingUser(user);
        const roleObj = assignableRoles.find(r => r.name === user.role);
        setFormData({
            email: user.email || '',
            full_name: user.full_name || '',
            phone: user.phone || '',
            role: user.role,
            role_id: roleObj?.id || '',
            password: '',
            assigned_warehouse_id: user.assigned_warehouse_id || '',
            assigned_shop_id: user.assigned_shop_id || '',
        });
        setShowModal(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            console.log('Submitting user data:', formData);
            if (editingUser) {
                await usersApi.update(editingUser.id, formData);
                window.toast?.success('User updated successfully');
            } else {
                await usersApi.create(formData);
                window.toast?.success('User created successfully');
            }
            setShowModal(false);
            fetchUsers();
        } catch (error: any) {
            console.error('Failed to save user:', error);
            console.error('Error response:', error.response?.data);
            console.error('Error status:', error.response?.status);
            const errorMessage = error.response?.data?.detail
                ? (Array.isArray(error.response.data.detail)
                    ? error.response.data.detail.map((err: any) => `${err.loc.join('.')}: ${err.msg}`).join(', ')
                    : error.response.data.detail)
                : error.message || 'Failed to save user';
            window.toast?.error(errorMessage);
        }
    };

    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [userToDelete, setUserToDelete] = useState<User | null>(null);

    const handleDeleteClick = (user: User) => {
        setUserToDelete(user);
        setDeleteModalOpen(true);
    };

    const confirmDelete = async () => {
        if (!userToDelete) return;

        try {
            await usersApi.delete(userToDelete.id);
            window.toast?.success('User deleted successfully');
            fetchUsers();
        } catch (error: any) {
            console.error('Failed to delete user:', error);
            const errorMessage = error.response?.data?.detail || 'Failed to delete user';
            window.toast?.error(errorMessage);
        } finally {
            setDeleteModalOpen(false);
            setUserToDelete(null);
        }
    };

    const getRoleBadgeColor = (role: string) => {
        switch (role) {
            case 'super_admin': return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300';
            case 'admin': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300';
            case 'manager': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300';
            default: return 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300';
        }
    };

    // User stats - use totalItems for accurate count when using server-side pagination
    const stats = {
        total: totalItems || users.length,
        active: users.filter(u => u.is_active).length,
        inactive: users.filter(u => !u.is_active).length,
        admins: users.filter(u => u.role === 'admin' || u.role === 'super_admin').length,
    };

    // Filter handlers
    const applyFilter = (status: 'all' | 'active' | 'inactive', role: string = 'all') => {
        setStatusFilter(status);
        setRoleFilter(role);
        setCurrentPage(1); // Reset to page 1 when filters change
    };

    const columns: Column<User>[] = [
        {
            header: 'User',
            key: 'full_name',
            render: (user) => (
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-sm font-medium shadow-sm">
                        {user.full_name?.charAt(0) || user.email.charAt(0).toUpperCase()}
                    </div>
                    <div>
                        <div className="font-medium text-slate-900 dark:text-white">{user.full_name || 'N/A'}</div>
                        <div className="text-xs text-slate-500">{user.email}</div>
                    </div>
                </div>
            )
        },
        {
            header: 'Role',
            key: 'role',
            render: (user) => (
                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium uppercase tracking-wide ${getRoleBadgeColor(user.role)}`}>
                    {user.role.replace('_', ' ')}
                </span>
            )
        },
        {
            header: 'Location',
            key: 'assigned_shop_id', // pseudo-key
            render: (user) => {
                if (user.role === 'super_admin') return <span className="text-slate-400 italic">Global Access</span>;

                if (user.assigned_shop_id) {
                    const shop = shops.find(s => s.id === user.assigned_shop_id);
                    return (
                        <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                            <span className="material-symbols-outlined text-[16px] text-blue-500">store</span>
                            <span className="text-sm font-medium truncate max-w-[150px]" title={shop?.name}>{shop?.name || 'Unknown Shop'}</span>
                        </div>
                    );
                }

                if (user.assigned_warehouse_id) {
                    const wh = warehouses.find(w => w.id === user.assigned_warehouse_id);
                    return (
                        <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                            <span className="material-symbols-outlined text-[16px] text-amber-500">warehouse</span>
                            <span className="text-sm font-medium truncate max-w-[150px]" title={wh?.name}>{wh?.name || 'Unknown Warehouse'}</span>
                        </div>
                    );
                }

                return <span className="text-slate-400">-</span>;
            }
        },
        {
            header: 'Status',
            key: 'is_active',
            render: (user) => (
                <Badge variant={user.is_active ? 'success' : 'error'}>
                    {user.is_active ? 'Active' : 'Inactive'}
                </Badge>
            ),
            align: 'center'
        },
        {
            header: 'Last Login',
            key: 'last_login',
            render: (user) => (
                <span className="text-slate-500">
                    {user.last_login ? new Date(user.last_login).toLocaleDateString() : 'Never'}
                </span>
            )
        },
        {
            header: 'Actions',
            key: 'id',
            align: 'right',
            render: (user) => (
                <div className="flex justify-end gap-1">
                    <Button
                        variant="secondary"
                        onClick={() => openEditModal(user)}
                        className="!p-1.5 h-8 w-8 justify-center"
                        title="Edit User"
                    >
                        <span className="material-symbols-outlined text-[18px]">edit</span>
                    </Button>
                    {(userRole === 'super_admin') && (
                        <Button
                            variant="secondary"
                            onClick={() => handleDeleteClick(user)}
                            className="!p-1.5 h-8 w-8 justify-center text-red-600 hover:bg-red-50 hover:text-red-700"
                            title="Delete User"
                        >
                            <span className="material-symbols-outlined text-[18px]">delete</span>
                        </Button>
                    )}
                </div>
            )
        }
    ];

    return (
        <UniversalListPage>
            <UniversalListPage.Header
                title="User Management"
                subtitle={`Manage ${stats.total} users across your organization`}
                actions={
                    <Button variant="primary" onClick={openCreateModal}>
                        <span className="material-symbols-outlined text-[20px] mr-2">person_add</span>
                        Add User
                    </Button>
                }
            />

            <UniversalListPage.KPICards>
                <StatCard
                    title="Total Users"
                    value={stats.total}
                    icon="groups"
                    onClick={() => applyFilter('all')}
                    isActive={statusFilter === 'all' && roleFilter === 'all'}
                />
                <StatCard
                    title="Active Users"
                    value={stats.active}
                    icon="check_circle"
                    onClick={() => applyFilter('active')}
                    isActive={statusFilter === 'active'}
                    change={((stats.active / stats.total) * 100).toFixed(0) + '%'}
                    changeType="up"
                />
                <StatCard
                    title="Inactive Users"
                    value={stats.inactive}
                    icon="cancel"
                    onClick={() => applyFilter('inactive')}
                    isActive={statusFilter === 'inactive'}
                    changeType="down"
                />
                <StatCard
                    title="Administrators"
                    value={stats.admins}
                    icon="admin_panel_settings"
                    onClick={() => applyFilter('all', 'admin')}
                    isActive={roleFilter === 'admin'}
                />
            </UniversalListPage.KPICards>

            <UniversalListPage.DataTable
                columns={columns}
                data={users}
                loading={loading}
                emptyMessage="No users found matching your criteria."
                pagination={{
                    currentPage: currentPage,
                    totalPages: Math.ceil(totalItems / pageSize),
                    onPageChange: setCurrentPage,
                    totalItems: totalItems,
                    pageSize: pageSize,
                    onPageSizeChange: (size) => { setPageSize(size); setCurrentPage(1); }
                }}
                headerSlot={
                    <UniversalListPage.ListControls
                        title="User List"
                        count={totalItems || users.length}
                        searchProps={{
                            value: search,
                            onChange: (val) => { setSearch(val); setCurrentPage(1); fetchUsers(); }
                        }}
                        onFilterClick={fetchUsers}
                        embedded={true}
                    />
                }
            />

            {/* Modal - keeping existing inline style for now, but wrapped in container */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-md shadow-2xl border border-slate-200 dark:border-slate-700 animate-scaleIn">
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">
                            {editingUser ? 'Edit User' : 'Add User'}
                        </h2>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Full Name</label>
                                <input
                                    type="text"
                                    value={formData.full_name}
                                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Email</label>
                                <input
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Phone</label>
                                <input
                                    type="tel"
                                    value={formData.phone}
                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Role</label>
                                <select
                                    value={formData.role}
                                    onChange={(e) => {
                                        const selectedName = e.target.value;
                                        const selectedRole = assignableRoles.find(r => r.name === selectedName);
                                        setFormData({
                                            ...formData,
                                            role: selectedName,
                                            role_id: selectedRole?.id || '',
                                            assigned_warehouse_id: '',
                                            assigned_shop_id: ''
                                        });
                                    }}
                                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                                >
                                    <option value="">Select Role</option>
                                    {assignableRoles.map(role => (
                                        <option key={role.id} value={role.name}>
                                            {role.name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {assignableRoles.find(r => r.name === formData.role)?.entity_type === 'warehouse' && (
                                <SearchableSelect
                                    label="Assign to Warehouse"
                                    value={formData.assigned_warehouse_id}
                                    onChange={(val) => setFormData({ ...formData, assigned_warehouse_id: val })}
                                    options={warehouses.map(w => ({ value: w.id, label: w.name }))}
                                    placeholder="Search and select warehouse..."
                                    required
                                />
                            )}
                            {assignableRoles.find(r => r.name === formData.role)?.entity_type === 'shop' && (
                                <SearchableSelect
                                    label="Assign to Medical Shop"
                                    value={formData.assigned_shop_id}
                                    onChange={(val) => setFormData({ ...formData, assigned_shop_id: val })}
                                    options={shops.map(s => ({ value: s.id, label: s.name }))}
                                    placeholder="Search and select shop..."
                                    required
                                />
                            )}

                            {!editingUser && (
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                        Password <span className="text-xs text-slate-500">(min. 8 characters)</span>
                                    </label>
                                    <div className="relative">
                                        <input
                                            type={showPassword ? "text" : "password"}
                                            value={formData.password}
                                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                            className="w-full px-3 pr-10 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                                            required={!editingUser}
                                            minLength={8}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                                            title={showPassword ? "Hide password" : "Show password"}
                                        >
                                            <span className="material-symbols-outlined text-[18px]">
                                                {showPassword ? 'visibility_off' : 'visibility'}
                                            </span>
                                        </button>
                                    </div>
                                </div>
                            )}
                            <div className="flex gap-3 pt-4">
                                <button type="button" onClick={() => setShowModal(false)} className="flex-1 px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">
                                    Cancel
                                </button>
                                <button type="submit" className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                                    {editingUser ? 'Update' : 'Create'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {deleteModalOpen && userToDelete && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-sm shadow-2xl border border-slate-200 dark:border-slate-700 animate-scaleIn">
                        <div className="flex flex-col items-center text-center mb-6">
                            <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 flex items-center justify-center mb-4">
                                <span className="material-symbols-outlined text-[24px]">warning</span>
                            </div>
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Delete User?</h3>
                            <p className="text-slate-500 dark:text-slate-400 text-sm">
                                Are you sure you want to delete <strong>{userToDelete.full_name}</strong>? This action cannot be undone.
                            </p>
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setDeleteModalOpen(false)}
                                className="flex-1 px-4 py-2.5 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-600 font-medium transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmDelete}
                                className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-xl hover:bg-red-700 font-medium transition-colors shadow-lg shadow-red-500/20"
                            >
                                Delete User
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </UniversalListPage>
    );
}
