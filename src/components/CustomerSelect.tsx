import { useState, useEffect, useRef } from 'react';
import { customersApi } from '../services/api';
import Button from './Button';

interface Customer {
    id: string;
    name: string;
    phone: string;
    email?: string;
    total_purchases?: number;
    loyalty_points?: number;
}

interface CustomerSelectProps {
    onSelect: (customer: Customer) => void;
    onNewCustomer: () => void;
    selectedCustomer?: Customer | null;
}

export default function CustomerSelect({ onSelect, onNewCustomer, selectedCustomer }: CustomerSelectProps) {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<Customer[]>([]);
    const [loading, setLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [wrapperRef]);

    useEffect(() => {
        const timer = setTimeout(() => {
            if (query.length >= 2) {
                searchCustomers();
            } else {
                setResults([]);
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [query]);

    const searchCustomers = async () => {
        setLoading(true);
        try {
            const res = await customersApi.list({ search: query, size: 5 });
            setResults(res.data?.items || res.data || []);
            setIsOpen(true);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleSelect = (customer: Customer) => {
        onSelect(customer);
        setIsOpen(false);
        setQuery('');
    };


    if (selectedCustomer) {
        return (
            <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-800 flex items-center justify-center text-blue-600 dark:text-blue-300 font-bold">
                        {selectedCustomer.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                        <p className="font-semibold text-slate-900 dark:text-white">{selectedCustomer.name}</p>
                        <p className="text-xs text-slate-500">{selectedCustomer.phone}</p>
                    </div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => onSelect(null as any)}>Change</Button>
            </div>
        );
    }

    return (
        <div className="relative" ref={wrapperRef}>
            <div className="flex gap-2">
                <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-slate-400">search</span>
                    <input
                        type="text"
                        placeholder="Search customer by name or phone..."
                        value={query}
                        onChange={(e) => {
                            setQuery(e.target.value);
                            setIsOpen(true);
                        }}
                        onFocus={() => query.length >= 2 && setIsOpen(true)}
                        className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                    {loading && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                    )}
                </div>
                <Button onClick={onNewCustomer} className="whitespace-nowrap">
                    <span className="material-symbols-outlined text-[20px] mr-1">person_add</span>
                    New
                </Button>
            </div>

            {isOpen && query.length >= 2 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl z-50 max-h-64 overflow-y-auto">
                    {results.length > 0 ? (
                        <div className="py-1">
                            {results.map(c => (
                                <button
                                    key={c.id}
                                    onClick={() => handleSelect(c)}
                                    className="w-full px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-3 border-b border-slate-50 dark:border-slate-700 last:border-b-0"
                                >
                                    <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-500 text-xs font-bold">
                                        {c.name.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-slate-900 dark:text-white">{c.name}</p>
                                        <p className="text-xs text-slate-500">{c.phone}</p>
                                    </div>
                                    {c.loyalty_points && c.loyalty_points > 0 && (
                                        <div className="ml-auto text-xs text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                                            {c.loyalty_points} pts
                                        </div>
                                    )}
                                </button>
                            ))}
                        </div>
                    ) : (
                        <div className="p-4 text-center text-slate-500 text-sm">
                            <p>No customers found.</p>
                            <button onClick={onNewCustomer} className="text-blue-600 font-medium mt-1 hover:underline">
                                Create new customer?
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
