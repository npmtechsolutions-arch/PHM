interface SearchBarProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
}

export default function SearchBar({ value, onChange, placeholder = "Search...", className = "" }: SearchBarProps & { className?: string }) {
    return (
        <div className={`search-bar ${className}`}>
            <span className="material-symbols-outlined search-icon">search</span>
            <input
                type="text"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                className="search-input"
            />
            {value && (
                <button
                    onClick={() => onChange('')}
                    className="clear-button"
                    title="Clear search"
                >
                    <span className="material-symbols-outlined">close</span>
                </button>
            )}
            <style>{`
                .search-bar {
                    position: relative;
                    display: flex;
                    align-items: center;
                    width: 100%;
                    max-width: 400px;
                }
                
                .search-icon {
                    position: absolute;
                    left: 12px;
                    color: #9ca3af;
                    font-size: 20px;
                }
                
                .search-input {
                    width: 100%;
                    padding: 10px 40px 10px 44px;
                    border: 1px solid #e5e7eb;
                    border-radius: 8px;
                    font-size: 14px;
                    transition: all 0.2s;
                }
                
                .search-input:focus {
                    outline: none;
                    border-color: #4a6cf7;
                    box-shadow: 0 0 0 3px rgba(74, 108, 247, 0.1);
                }
                
                .clear-button {
                    position: absolute;
                    right: 8px;
                    background: none;
                    border: none;
                    padding: 4px;
                    cursor: pointer;
                    color: #9ca3af;
                    border-radius: 4px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                
                .clear-button:hover {
                    background: #f3f4f6;
                    color: #4b5563;
                }
                
                .clear-button .material-symbols-outlined {
                    font-size: 18px;
                }
            `}</style>
        </div>
    );
}
