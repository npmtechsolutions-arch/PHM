import { useState } from 'react';
import { customersApi } from '../services/api';
import { toast } from './Toast';
import Modal from './Modal';
import Button from './Button';
import Input from './Input';

interface CustomerCreateModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (customer: any) => void;
    shopId: string;
}

export default function CustomerCreateModal({ isOpen, onClose, onSuccess, shopId }: CustomerCreateModalProps) {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        email: '',
        address: '',
        city: '',
        pincode: ''
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await customersApi.create({
                ...formData,
                shop_id: shopId,
                customer_type: 'regular'
            });
            toast.success('Customer created successfully');
            // Fetch full customer object if API returns only ID, but usually we prefer full object.
            // API returns { id: ... }. We might need to construct the object or fetch it.
            // For now, construct it optimisticly.
            onSuccess({
                id: res.data.id,
                ...formData,
                shop_id: shopId
            });
            onClose();
        } catch (error: any) {
            console.error(error);
            toast.error(error.response?.data?.detail || 'Failed to create customer');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Add New Customer"
            maxWidth="md"
        >
            <form onSubmit={handleSubmit} className="space-y-4">
                <Input
                    label="Customer Name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    placeholder="Enter full name"
                />

                <div className="grid grid-cols-2 gap-4">
                    <Input
                        label="Phone Number"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        required
                        placeholder="10-digit mobile"
                        type="tel"
                    />
                    <Input
                        label="Email (Optional)"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        placeholder="email@example.com"
                        type="email"
                    />
                </div>

                <Input
                    label="Address"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="Street, locality"
                />

                <div className="grid grid-cols-2 gap-4">
                    <Input
                        label="City"
                        value={formData.city}
                        onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                        placeholder="City"
                    />
                    <Input
                        label="Pincode"
                        value={formData.pincode}
                        onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                        placeholder="Pincode"
                    />
                </div>

                <div className="flex gap-3 pt-2">
                    <Button
                        type="button"
                        variant="secondary"
                        onClick={onClose}
                        className="flex-1"
                    >
                        Cancel
                    </Button>
                    <Button
                        type="submit"
                        variant="primary"
                        loading={loading}
                        className="flex-1"
                    >
                        Create Customer
                    </Button>
                </div>
            </form>
        </Modal>
    );
}
