import { useState, useRef } from 'react';
import { UploadCloud, CheckCircle2, Loader2, File, X, Plus } from 'lucide-react';
import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';

function cx(...args) {
    return twMerge(clsx(args));
}

export default function DocumentUploader({ onUploadSuccess }) {
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadSuccess, setUploadSuccess] = useState(false);
    const [statusText, setStatusText] = useState('Upload Financial Docs');
    const fileInputRef = useRef(null);

    const handleButtonClick = () => {
        if (!isUploading) {
            fileInputRef.current?.click();
        }
    };

    const handleFileSelect = (e) => {
        const newFiles = Array.from(e.target.files || []);
        if (newFiles.length === 0) return;

        // Merge with existing, deduplicate by name+size, cap at 10
        setSelectedFiles(prev => {
            const existing = new Set(prev.map(f => `${f.name}-${f.size}`));
            const unique = newFiles.filter(f => !existing.has(`${f.name}-${f.size}`));
            return [...prev, ...unique].slice(0, 10);
        });

        // Clear input so the same file(s) can be re-selected if removed
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const removeFile = (index) => {
        setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    };

    const handleUploadAll = async () => {
        if (selectedFiles.length === 0 || isUploading) return;

        setIsUploading(true);
        setStatusText('Ingesting...');
        setUploadSuccess(false);

        const formData = new FormData();
        // CRITICAL: append each file with the SAME key for multer.array()
        selectedFiles.forEach(file => {
            formData.append('financialDocuments', file);
        });

        try {
            const response = await fetch('http://localhost:5000/api/upload', {
                method: 'POST',
                body: formData,
            });

            const data = await response.json();

            if (data.success) {
                setUploadSuccess(true);
                setStatusText(`${data.files.length} doc(s) ingested`);

                // Notify parent with all uploaded file names
                const fileNames = data.files.map(f =>
                    f.originalName.replace(/\.[^/.]+$/, '')
                );
                onUploadSuccess?.(fileNames);

                // Clear selected files after successful upload
                setSelectedFiles([]);

                setTimeout(() => {
                    setUploadSuccess(false);
                    setStatusText('Upload Financial Docs');
                }, 3000);
            } else {
                setStatusText('Upload Failed');
                setTimeout(() => setStatusText('Upload Financial Docs'), 3000);
            }
        } catch (error) {
            console.error('Upload error:', error);
            setStatusText('Connection Error');
            setTimeout(() => setStatusText('Upload Financial Docs'), 3000);
        } finally {
            setIsUploading(false);
        }
    };

    const formatFileSize = (bytes) => {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    return (
        <div className="w-full space-y-2">
            <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                className="hidden"
                accept=".pdf,.txt,.doc,.docx"
                multiple
            />

            {/* Selected files chip list */}
            {selectedFiles.length > 0 && (
                <div className="flex flex-wrap gap-1.5 p-2 bg-[#0d1017] rounded-md border border-bloomberg-border/50 animate-[chip-enter_0.2s_ease-out]">
                    {selectedFiles.map((file, index) => (
                        <div
                            key={`${file.name}-${file.size}-${index}`}
                            className="flex items-center gap-1.5 bg-[#1a1f2e] text-gray-300 text-[11px] font-mono px-2 py-1 rounded-md border border-bloomberg-border/40 hover:border-bloomberg-primary/40 transition-all group animate-[chip-enter_0.2s_ease-out]"
                            style={{ animationDelay: `${index * 50}ms`, animationFillMode: 'backwards' }}
                        >
                            <File className="w-3 h-3 text-bloomberg-primary/70 flex-shrink-0" />
                            <span className="truncate max-w-[100px]" title={file.name}>{file.name}</span>
                            <span className="text-gray-600 text-[9px]">{formatFileSize(file.size)}</span>
                            <button
                                onClick={() => removeFile(index)}
                                className="ml-0.5 p-0.5 rounded hover:bg-red-500/20 text-gray-500 hover:text-red-400 transition-colors flex-shrink-0"
                                title="Remove file"
                            >
                                <X className="w-3 h-3" />
                            </button>
                        </div>
                    ))}
                    {selectedFiles.length < 10 && (
                        <button
                            onClick={handleButtonClick}
                            className="flex items-center gap-1 text-[11px] text-gray-500 hover:text-bloomberg-primary px-2 py-1 rounded-md border border-dashed border-bloomberg-border/40 hover:border-bloomberg-primary/40 transition-all"
                            title="Add more files"
                        >
                            <Plus className="w-3 h-3" />
                            Add
                        </button>
                    )}
                </div>
            )}

            <div className="flex gap-2">
                {/* Select files button */}
                <button
                    onClick={handleButtonClick}
                    disabled={isUploading}
                    className={cx(
                        "flex items-center justify-center gap-2 flex-1 px-3 py-2.5 rounded text-xs font-semibold tracking-wide transition-all uppercase",
                        isUploading
                            ? "bg-[#1E232D] text-bloomberg-primary border border-bloomberg-border opacity-80 cursor-not-allowed"
                            : uploadSuccess
                                ? "bg-bloomberg-panel text-green-500 border border-green-500/30 shadow-[0_0_10px_rgba(0,204,0,0.1)]"
                                : "bg-bloomberg-panel text-bloomberg-text hover:bg-bloomberg-panel/80 hover:text-bloomberg-primary border border-bloomberg-border hover:border-bloomberg-primary/50 shadow-[0_2px_10px_rgba(0,0,0,0.5)] active:scale-[0.98]"
                    )}
                >
                    {isUploading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                    ) : uploadSuccess ? (
                        <CheckCircle2 className="w-4 h-4" />
                    ) : (
                        <UploadCloud className="w-4 h-4" />
                    )}
                    <span className="truncate">{statusText}</span>
                </button>

                {/* Upload All button — appears only when files are selected */}
                {selectedFiles.length > 0 && !uploadSuccess && (
                    <button
                        onClick={handleUploadAll}
                        disabled={isUploading}
                        className={cx(
                            "flex items-center justify-center gap-1.5 px-4 py-2.5 rounded text-xs font-semibold tracking-wide transition-all uppercase",
                            isUploading
                                ? "bg-[#1E232D] text-bloomberg-primary border border-bloomberg-border opacity-80 cursor-not-allowed"
                                : "bg-bloomberg-primary/10 text-bloomberg-primary border border-bloomberg-primary/30 hover:bg-bloomberg-primary/20 hover:border-bloomberg-primary/50 shadow-[0_0_15px_rgba(255,140,0,0.1)] active:scale-[0.98]"
                        )}
                    >
                        {isUploading ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                            <UploadCloud className="w-3.5 h-3.5" />
                        )}
                        <span>{selectedFiles.length}</span>
                    </button>
                )}
            </div>
        </div>
    );
}
