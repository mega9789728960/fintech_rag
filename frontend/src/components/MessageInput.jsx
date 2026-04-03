import { useState, useRef, useEffect } from 'react';
import { Send, Terminal, FileText, X, Paperclip, ChevronDown, Check, Search } from 'lucide-react';
import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';

function cx(...args) {
    return twMerge(clsx(args));
}

export default function MessageInput({ onSendMessage, disabled, documents = [], activeDocuments = [], onToggleDoc, onRemoveActiveDoc }) {
    const [text, setText] = useState('');
    const [isPickerOpen, setIsPickerOpen] = useState(false);
    const [searchFilter, setSearchFilter] = useState('');
    const pickerRef = useRef(null);
    const pickerButtonRef = useRef(null);

    // Close picker on outside click
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (
                pickerRef.current && !pickerRef.current.contains(e.target) &&
                pickerButtonRef.current && !pickerButtonRef.current.contains(e.target)
            ) {
                setIsPickerOpen(false);
                setSearchFilter('');
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (text.trim() && !disabled) {
            onSendMessage(text.trim());
            setText('');
        }
    };

    const filteredDocs = documents.filter(doc =>
        doc.toLowerCase().includes(searchFilter.toLowerCase())
    );

    const toggleDoc = (doc) => {
        onToggleDoc?.(doc);
    };

    const selectAll = () => {
        documents.forEach(doc => {
            if (!activeDocuments.includes(doc)) {
                onToggleDoc?.(doc);
            }
        });
    };

    const deselectAll = () => {
        activeDocuments.forEach(doc => {
            onRemoveActiveDoc?.(doc);
        });
    };

    return (
        <div className="max-w-4xl mx-auto w-full relative">
            {/* Active documents context bar */}
            {activeDocuments.length > 0 && (
                <div className="mb-2 flex items-center gap-1.5 flex-wrap animate-[chip-enter_0.2s_ease-out]">
                    <span className="text-[10px] font-mono text-gray-500 uppercase tracking-wider mr-1">Context:</span>
                    {activeDocuments.map((doc, index) => (
                        <div
                            key={`${doc}-${index}`}
                            className="flex items-center gap-1.5 bg-bloomberg-primary/8 text-bloomberg-primary text-[11px] font-mono px-2 py-1 rounded border border-bloomberg-primary/20 hover:border-bloomberg-primary/40 transition-all group animate-[chip-enter_0.15s_ease-out]"
                            style={{ animationDelay: `${index * 40}ms`, animationFillMode: 'backwards' }}
                        >
                            <FileText className="w-3 h-3 opacity-70 flex-shrink-0" />
                            <span className="truncate max-w-[120px]">{doc}</span>
                            <button
                                onClick={() => onRemoveActiveDoc?.(doc)}
                                className="p-0.5 rounded hover:bg-red-500/20 text-bloomberg-primary/50 hover:text-red-400 transition-colors flex-shrink-0 opacity-0 group-hover:opacity-100"
                                title="Remove from context"
                            >
                                <X className="w-3 h-3" />
                            </button>
                        </div>
                    ))}
                </div>
            )}

            <form
                onSubmit={handleSubmit}
                className="relative flex items-center bg-[#0d1017] rounded-lg border border-[#252a36] shadow-[0_4px_30px_rgba(0,0,0,0.5)] overflow-visible focus-within:border-bloomberg-primary focus-within:shadow-[0_0_15px_rgba(255,140,0,0.15)] transition-all"
            >
                <div className="pl-4 flex items-center justify-center text-gray-500">
                    <Terminal className="w-4 h-4" />
                </div>
                <input
                    type="text"
                    value={text}
                    onChange={e => setText(e.target.value)}
                    placeholder={
                        activeDocuments.length > 0
                            ? `Query ${activeDocuments.length} selected document(s)...`
                            : documents.length > 0
                                ? "Attach documents with 📎 then ask a question..."
                                : "Upload documents first, then ask questions..."
                    }
                    disabled={disabled}
                    className="w-full bg-transparent text-gray-200 placeholder:text-gray-500 px-4 py-4 focus:outline-none text-sm font-mono disabled:opacity-50"
                />

                {/* Document Picker Button */}
                <div className="relative">
                    <button
                        ref={pickerButtonRef}
                        type="button"
                        onClick={() => {
                            setIsPickerOpen(!isPickerOpen);
                            setSearchFilter('');
                        }}
                        disabled={documents.length === 0}
                        className={cx(
                            "flex items-center gap-1 px-3 py-2 rounded-md mr-1 transition-all text-xs font-mono",
                            documents.length === 0
                                ? "text-gray-600 cursor-not-allowed"
                                : isPickerOpen
                                    ? "text-bloomberg-primary bg-bloomberg-primary/10 border border-bloomberg-primary/30"
                                    : activeDocuments.length > 0
                                        ? "text-bloomberg-primary hover:bg-bloomberg-primary/10"
                                        : "text-gray-400 hover:text-bloomberg-primary hover:bg-bloomberg-panel"
                        )}
                        title={documents.length === 0 ? "No documents uploaded yet" : "Select documents for context"}
                    >
                        <Paperclip className="w-4 h-4" />
                        {activeDocuments.length > 0 && (
                            <span className="min-w-[18px] h-[18px] flex items-center justify-center bg-bloomberg-primary text-black text-[10px] font-bold rounded-full">
                                {activeDocuments.length}
                            </span>
                        )}
                        <ChevronDown className={cx(
                            "w-3 h-3 transition-transform duration-200",
                            isPickerOpen && "rotate-180"
                        )} />
                    </button>

                    {/* Document Picker Dropdown */}
                    {isPickerOpen && (
                        <div
                            ref={pickerRef}
                            className="absolute bottom-full right-0 mb-2 w-72 bg-[#0d1017] border border-bloomberg-border rounded-lg shadow-[0_8px_40px_rgba(0,0,0,0.8)] z-50 animate-[picker-enter_0.2s_ease-out] overflow-hidden"
                        >
                            {/* Header */}
                            <div className="px-3 py-2.5 border-b border-bloomberg-border/60 flex items-center justify-between">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-bloomberg-primary">
                                    Select Documents
                                </span>
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={selectAll}
                                        className="text-[10px] font-mono text-gray-400 hover:text-bloomberg-primary transition-colors uppercase tracking-wider"
                                    >
                                        All
                                    </button>
                                    <span className="text-gray-600">|</span>
                                    <button
                                        type="button"
                                        onClick={deselectAll}
                                        className="text-[10px] font-mono text-gray-400 hover:text-red-400 transition-colors uppercase tracking-wider"
                                    >
                                        None
                                    </button>
                                </div>
                            </div>

                            {/* Search filter */}
                            {documents.length > 3 && (
                                <div className="px-3 py-2 border-b border-bloomberg-border/40">
                                    <div className="relative">
                                        <Search className="w-3 h-3 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500" />
                                        <input
                                            type="text"
                                            value={searchFilter}
                                            onChange={e => setSearchFilter(e.target.value)}
                                            placeholder="Filter documents..."
                                            className="w-full bg-[#1a1f2e] text-gray-300 text-[11px] font-mono pl-8 pr-3 py-1.5 rounded border border-bloomberg-border/40 focus:border-bloomberg-primary/50 focus:outline-none transition-colors placeholder:text-gray-600"
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Document list */}
                            <div className="max-h-48 overflow-y-auto custom-scrollbar py-1">
                                {filteredDocs.length === 0 ? (
                                    <div className="px-3 py-4 text-center text-gray-500 text-[11px] font-mono">
                                        {searchFilter ? 'No matching documents' : 'No documents available'}
                                    </div>
                                ) : (
                                    filteredDocs.map((doc, index) => {
                                        const isActive = activeDocuments.includes(doc);
                                        return (
                                            <button
                                                key={`picker-${doc}-${index}`}
                                                type="button"
                                                onClick={() => toggleDoc(doc)}
                                                className={cx(
                                                    "flex items-center gap-2.5 w-full text-left px-3 py-2 transition-all",
                                                    isActive
                                                        ? "bg-bloomberg-primary/8 hover:bg-bloomberg-primary/12"
                                                        : "hover:bg-[#1a1f2e]"
                                                )}
                                            >
                                                {/* Custom checkbox */}
                                                <div className={cx(
                                                    "w-4 h-4 rounded flex items-center justify-center flex-shrink-0 border transition-all",
                                                    isActive
                                                        ? "bg-bloomberg-primary border-bloomberg-primary"
                                                        : "border-gray-600 hover:border-gray-400"
                                                )}>
                                                    {isActive && <Check className="w-2.5 h-2.5 text-black" strokeWidth={3} />}
                                                </div>

                                                <FileText className={cx(
                                                    "w-3.5 h-3.5 flex-shrink-0",
                                                    isActive ? "text-bloomberg-primary" : "text-gray-500"
                                                )} />

                                                <span className={cx(
                                                    "text-[12px] font-mono truncate",
                                                    isActive ? "text-bloomberg-primary font-medium" : "text-gray-400"
                                                )}>
                                                    {doc}
                                                </span>

                                                {isActive && (
                                                    <div className="ml-auto w-1.5 h-1.5 bg-bloomberg-primary rounded-full animate-pulse flex-shrink-0" />
                                                )}
                                            </button>
                                        );
                                    })
                                )}
                            </div>

                            {/* Footer */}
                            <div className="px-3 py-2 border-t border-bloomberg-border/40 flex items-center justify-between">
                                <span className="text-[10px] font-mono text-gray-500">
                                    {activeDocuments.length}/{documents.length} selected
                                </span>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsPickerOpen(false);
                                        setSearchFilter('');
                                    }}
                                    className="text-[10px] font-mono text-bloomberg-primary hover:text-bloomberg-primary/80 transition-colors uppercase tracking-wider font-bold"
                                >
                                    Done
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                <button
                    type="submit"
                    disabled={disabled || !text.trim()}
                    className={cx(
                        "px-5 h-full flex items-center justify-center transition-colors",
                        text.trim() && !disabled ? "text-bloomberg-primary hover:bg-bloomberg-panel" : "text-gray-600 bg-transparent"
                    )}
                >
                    <Send className="w-5 h-5" />
                </button>
            </form>
            <div className="mt-2 text-center text-[10px] text-gray-600 font-mono tracking-widest uppercase">
                [ Press Enter to Execute ]
            </div>
        </div>
    );
}
