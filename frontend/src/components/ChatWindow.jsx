import { useEffect, useRef } from 'react';
import { FileText } from 'lucide-react';
import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';

function cx(...args) {
    return twMerge(clsx(args));
}

export default function ChatWindow({ messages, isStreaming }) {
    const bottomRef = useRef(null);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isStreaming]);

    return (
        <div className="flex-1 p-4 md:p-8 max-w-4xl mx-auto w-full flex flex-col gap-8 pb-32">
            {messages.map((message, idx) => {
                const isUser = message.role === 'user';
                const isLastMessage = idx === messages.length - 1;

                return (
                    <div key={idx} className={cx(
                        "flex flex-col max-w-[85%]",
                        isUser ? "self-end items-end" : "self-start items-start"
                    )}>
                        <div className="flex items-center gap-2 mb-1.5">
                            {!isUser && (
                                <div className="w-5 h-5 rounded-sm bg-bloomberg-primary text-black flex items-center justify-center font-bold text-[10px]">
                                    AI
                                </div>
                            )}
                            <span className={cx(
                                "text-[10px] uppercase tracking-wider font-semibold",
                                isUser ? "text-gray-500" : "text-bloomberg-primary"
                            )}>
                                {isUser ? 'Terminal User' : 'FinIntel Engine'}
                            </span>
                            {isUser && (
                                <div className="w-5 h-5 rounded-sm bg-gray-700 text-white flex items-center justify-center font-bold text-[10px]">
                                    TU
                                </div>
                            )}
                        </div>

                        {/* Show document context badges for user messages */}
                        {isUser && message.documents && message.documents.length > 0 && (
                            <div className="flex items-center gap-1 flex-wrap mb-1.5">
                                <span className="text-[9px] font-mono text-gray-600 uppercase tracking-wider">Querying:</span>
                                {message.documents.map((doc, dIdx) => (
                                    <span
                                        key={`msg-doc-${dIdx}`}
                                        className="inline-flex items-center gap-1 text-[9px] font-mono text-bloomberg-primary/70 bg-bloomberg-primary/6 px-1.5 py-0.5 rounded border border-bloomberg-primary/15"
                                    >
                                        <FileText className="w-2.5 h-2.5" />
                                        {doc}
                                    </span>
                                ))}
                            </div>
                        )}

                        <div className={cx(
                            "px-5 py-3.5 rounded-lg shadow-sm leading-relaxed text-[14px]",
                            isUser
                                ? "bg-[#1E232D] text-white border border-[#2D333F] rounded-br-[2px]"
                                : "bg-transparent text-[#e2e8f0] font-mono whitespace-pre-wrap -ml-4"
                        )}>
                            {/* 
                   Apply typing-cursor if it's the last message, it's AI, we're streaming 
                */}
                            <span className={cx(
                                !isUser && isStreaming && isLastMessage && "typing-cursor"
                            )}>
                                {message.content}
                            </span>
                        </div>
                    </div>
                );
            })}
            <div ref={bottomRef} />
        </div>
    );
}
