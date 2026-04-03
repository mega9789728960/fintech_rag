import { FileText, Search, Settings, Home, BarChart2 } from 'lucide-react';
import DocumentUploader from './DocumentUploader';
import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';

function cx(...args) {
    return twMerge(clsx(args));
}

export default function Sidebar({ selectedDoc, onSelectDoc, documents, onDocumentUploaded }) {
    return (
        <aside className="w-64 bg-bloomberg-bg text-sm flex flex-col border-r border-bloomberg-border shadow-[4px_0_24px_rgba(0,0,0,0.8)] z-20">
            <div className="p-4 flex items-center gap-3 font-semibold text-bloomberg-primary border-b border-bloomberg-border uppercase tracking-widest text-xs">
                <BarChart2 className="w-5 h-5" />
                FinIntel RAG
            </div>

            <div className="p-3 flex flex-col gap-3">
                <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input
                        type="text"
                        placeholder="Search documents..."
                        className="w-full bg-bloomberg-panel text-bloomberg-text px-9 py-2 rounded-md border border-bloomberg-border focus:border-bloomberg-primary focus:outline-none transition-colors placeholder:text-gray-600 text-xs"
                    />
                </div>
                <DocumentUploader onUploadSuccess={onDocumentUploaded} />
            </div>

            <div className="flex-1 overflow-y-auto px-2 mt-2 custom-scrollbar">
                <div className="text-gray-500 text-[10px] font-bold uppercase tracking-wider mb-2 px-2 mt-1">Uploaded Documents</div>
                {documents.length === 0 ? (
                    <div className="px-3 py-6 text-center text-gray-600 text-xs">
                        No documents yet.<br />Upload a file to get started.
                    </div>
                ) : (
                    <ul className="space-y-1 relative">
                        {documents.map((doc, idx) => {
                            const isSelected = selectedDoc === doc;
                            return (
                                <li key={idx}>
                                    <button
                                        onClick={() => onSelectDoc(doc)}
                                        className={cx(
                                            "flex items-center gap-3 w-full text-left px-3 py-2.5 rounded hover:bg-bloomberg-panel transition-all focus:outline-none focus:bg-bloomberg-panel/80",
                                            isSelected ? "bg-bloomberg-panel text-bloomberg-primary font-medium" : "text-gray-400"
                                        )}
                                    >
                                        <FileText className={cx("w-4 h-4", isSelected ? "text-bloomberg-primary" : "text-gray-500")} />
                                        <span className="truncate flex-1">{doc}</span>
                                        {isSelected && <div className="w-1.5 h-1.5 bg-bloomberg-primary rounded-full animate-pulse" />}
                                    </button>
                                </li>
                            )
                        })}
                    </ul>
                )}
            </div>

            <div className="p-4 border-t border-bloomberg-border flex gap-4 text-gray-500 mt-auto">
                <button className="hover:text-bloomberg-text transition-colors" title="Home"><Home className="w-4 h-4" /></button>
                <button className="hover:text-bloomberg-text transition-colors" title="Settings"><Settings className="w-4 h-4" /></button>
                <div className="flex-1"></div>
                <div className="text-[10px] flex items-center font-mono text-green-500">
                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full mr-1.5 animate-pulse"></span>
                    CONNECTED
                </div>
            </div>

        </aside>
    );
}
