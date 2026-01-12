export interface Column<T> {
    key: keyof T | string;
    header: string;
    render?: (item: T) => React.ReactNode;
    align?: 'left' | 'right' | 'center';
    className?: string;
    numeric?: boolean; // Enterprise: auto right-align numeric columns
}

interface TableProps<T> {
    data: T[];
    columns: Column<T>[];
    loading?: boolean;
    emptyMessage?: string;
    zebra?: boolean; // Enterprise: zebra striping option
}

export default function Table<T extends Record<string, any>>({
    data,
    columns,
    loading = false,
    emptyMessage = 'No data available',
    zebra = false
}: TableProps<T>) {
    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    const tableClasses = `w-full text-left text-sm ${zebra ? 'table-zebra' : ''}`;

    return (
        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
            <table className={tableClasses}>
                <thead className="bg-slate-50 dark:bg-slate-800">
                    <tr>
                        {columns.map((column, index) => {
                            const alignClass = column.numeric ? 'text-right' :
                                column.align === 'right' ? 'text-right' :
                                    column.align === 'center' ? 'text-center' : '';
                            return (
                                <th
                                    key={index}
                                    className={`px-4 py-3 font-semibold text-slate-900 dark:text-white ${alignClass} ${column.className || ''}`}
                                >
                                    {column.header}
                                </th>
                            );
                        })}
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700 bg-white dark:bg-slate-900">
                    {data.length === 0 ? (
                        <tr>
                            <td colSpan={columns.length} className="px-4 py-12 text-center text-slate-500">
                                <div className="flex flex-col items-center gap-2">
                                    <span className="material-symbols-outlined text-4xl text-slate-300">inbox</span>
                                    <p>{emptyMessage}</p>
                                </div>
                            </td>
                        </tr>
                    ) : (
                        data.map((item, rowIndex) => (
                            <tr key={rowIndex} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                {columns.map((column, colIndex) => {
                                    const value = column.render
                                        ? column.render(item)
                                        : item[column.key as keyof T];
                                    const alignClass = column.numeric ? 'text-right' :
                                        column.align === 'right' ? 'text-right' :
                                            column.align === 'center' ? 'text-center' : '';

                                    return (
                                        <td
                                            key={colIndex}
                                            className={`px-4 py-3 text-slate-600 dark:text-slate-300 ${alignClass} ${column.className || ''}`}
                                        >
                                            {value}
                                        </td>
                                    );
                                })}
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
    );
}
