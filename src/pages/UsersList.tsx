import { useState, useEffect } from 'react';
import { usersApi, warehousesApi, shopsApi, rolesApi } from '../services/api';
import UniversalListPage from '../components/UniversalListPage';
import StatCard from '../components/StatCard';
import Badge from '../components/Badge';
import { type Column } from '../components/Table';
import Button from '../components/Button';

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
    const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
    const [roleFilter, setRoleFilter] = useState<string>('all');

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
    }, [statusFilter, roleFilter]); // Re-fetch when filters change

    const fetchEntities = async () => {
        try {
            const [warehouseRes, shopRes, rolesRes] = await Promise.all([
                warehousesApi.list(),
                shopsApi.list(),
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
            const params: any = { search };
            if (statusFilter !== 'all') params.is_active = statusFilter === 'active';
            if (roleFilter !== 'all') params.role = roleFilter;

            const response = await usersApi.list(params);
            setUsers(response.data?.items || response.data?.data || response.data || []);
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

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this user?')) return;
        try {
            await usersApi.delete(id);
            window.toast?.success('User deleted successfully');
            fetchUsers();
        } catch (error: any) {
            console.error('Failed to delete user:', error);
            const errorMessage = error.response?.data?.detail || 'Failed to delete user';
            window.toast?.error(errorMessage);
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

    // User stats
    const stats = {
        total: users.length,
        active: users.filter(u => u.is_active).length,
        inactive: users.filter(u => !u.is_active).length,
        admins: users.filter(u => u.role === 'admin' || u.role === 'super_admin').length,
    };

    // Filter handlers
    const applyFilter = (status: 'all' | 'active' | 'inactive', role: string = 'all') => {
        setStatusFilter(status);
        setRoleFilter(role);
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
                            onClick={() => handleDelete(user.id)}
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

            {/* Zone 3 & 4 Merged: List Controls Embedded in Table */}
            <UniversalListPage.DataTable
                columns={columns}
                data={users}
                loading={loading}
                emptyMessage="No users found matching your criteria."
                headerSlot={
                    <UniversalListPage.ListControls
                        title="User List"
                        count={users.length}
                        searchProps={{
                            value: search,
                            onChange: (val) => { setSearch(val); fetchUsers(); }
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
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                        Assign to Warehouse *
                                    </label>
                                    <select
                                        value={formData.assigned_warehouse_id}
                                        onChange={(e) => setFormData({ ...formData, assigned_warehouse_id: e.target.value })}
                                        className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                                        required
                                    >
                                        <option value="">Select Warehouse</option>
                                        {warehouses.map(w => (
                                            <option key={w.id} value={w.id}>{w.name}</option>
                                        ))}
                                    </select>
                                </div>
                            )}
                            {assignableRoles.find(r => r.name === formData.role)?.entity_type === 'shop' && (
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                        Assign to Medical Shop *
                                    </label>
                                    <select
                                        value={formData.assigned_shop_id}
                                        onChange={(e) => setFormData({ ...formData, assigned_shop_id: e.target.value })}
                                        className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                                        required
                                    >
                                        <option value="">Select Medical Shop</option>
                                        {shops.map(s => (
                                            <option key={s.id} value={s.id}>{s.name}</option>
                                        ))}
                                    </select>
                                </div>
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
        </UniversalListPage>
    );
}
