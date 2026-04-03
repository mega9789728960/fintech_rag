import { useState, useRef, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import ChatWindow from './components/ChatWindow';
import MessageInput from './components/MessageInput';

const API_BASE = 'http://localhost:5000';

function App() {
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [activeDocuments, setActiveDocuments] = useState([]);
  const [messages, setMessages] = useState([
    { role: 'ai', content: 'Welcome to the Real-Time Financial Intelligence RAG. Upload documents, select them with 📎, and ask a question.' }
  ]);
  const [isStreaming, setIsStreaming] = useState(false);
  const abortControllerRef = useRef(null);

  // Fetch already-uploaded documents from backend on mount
  useEffect(() => {
    const fetchDocuments = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/documents`);
        const data = await res.json();
        if (data.success && data.documents.length > 0) {
          const names = data.documents.map(d => d.displayName);
          setDocuments(names);
        }
      } catch (err) {
        console.warn('Could not fetch existing documents:', err);
      }
    };
    fetchDocuments();
  }, []);

  // Updated to handle array of filenames from multi-file upload
  const handleDocumentUploaded = (filenames) => {
    const names = Array.isArray(filenames) ? filenames : [filenames];

    // Deduplicate against existing documents
    setDocuments(prev => {
      const existing = new Set(prev);
      const newNames = names.filter(n => !existing.has(n));
      return [...prev, ...newNames];
    });

    // Auto-add newly uploaded docs to active context
    setActiveDocuments(prev => {
      const existing = new Set(prev);
      const newNames = names.filter(n => !existing.has(n));
      return [...prev, ...newNames];
    });

    if (names.length > 0) {
      setSelectedDoc(names[0]);
    }
  };

  const handleToggleDoc = (docName) => {
    setActiveDocuments(prev => {
      if (prev.includes(docName)) {
        return prev.filter(d => d !== docName);
      } else {
        return [...prev, docName];
      }
    });
  };

  const handleRemoveActiveDoc = (docName) => {
    setActiveDocuments(prev => prev.filter(d => d !== docName));
  };

  const handleSendMessage = async (text) => {
    if (isStreaming) return;

    // Add User Message with document context info
    const userMsg = {
      role: 'user',
      content: text,
      documents: activeDocuments.length > 0 ? [...activeDocuments] : null
    };
    setMessages(prev => [...prev, userMsg]);
    setIsStreaming(true);

    // Add empty AI Message to be streamed into
    setMessages(prev => [...prev, { role: 'ai', content: '' }]);

    // Build conversation history for context (last 10 messages)
    // Exclude the initial welcome message and ensure history starts with 'user' role
    // (Gemini requires the first message in history to be from 'user')
    const conversationHistory = messages
      .filter(m => (m.role === 'user' || m.role === 'ai') && m.content.trim().length > 0)
      .slice(-10)
      .map(m => ({
        role: m.role === 'user' ? 'user' : 'model',
        content: m.content
      }));

    // Gemini requires history to start with 'user' — drop leading 'model' entries
    while (conversationHistory.length > 0 && conversationHistory[0].role === 'model') {
      conversationHistory.shift();
    }

    try {
      // Create abort controller for cancellation
      abortControllerRef.current = new AbortController();

      const response = await fetch(`${API_BASE}/api/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: text,
          selectedDocuments: activeDocuments,
          conversationHistory,
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }

      // Read the SSE stream
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Parse SSE events from the buffer
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep incomplete line in buffer

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));

              if (data.done) {
                // Stream finished
                break;
              }

              if (data.error) {
                // Error from the server
                setMessages(prev => {
                  const newMessages = [...prev];
                  const lastIndex = newMessages.length - 1;
                  newMessages[lastIndex] = {
                    ...newMessages[lastIndex],
                    content: `⚠️ Error: ${data.message}`
                  };
                  return newMessages;
                });
                break;
              }

              if (data.text) {
                // Append streamed text to the last AI message
                setMessages(prev => {
                  const newMessages = [...prev];
                  const lastIndex = newMessages.length - 1;
                  newMessages[lastIndex] = {
                    ...newMessages[lastIndex],
                    content: newMessages[lastIndex].content + data.text
                  };
                  return newMessages;
                });
              }
            } catch (parseErr) {
              // Skip malformed JSON lines
              console.warn('SSE parse error:', parseErr);
            }
          }
        }
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        console.log('Stream aborted by user.');
      } else {
        console.error('Query error:', error);
        setMessages(prev => {
          const newMessages = [...prev];
          const lastIndex = newMessages.length - 1;
          newMessages[lastIndex] = {
            ...newMessages[lastIndex],
            content: `⚠️ Connection error: ${error.message}. Make sure the backend server is running.`
          };
          return newMessages;
        });
      }
    } finally {
      setIsStreaming(false);
      abortControllerRef.current = null;
    }
  };

  return (
    <div className="flex h-screen w-full bg-bloomberg-bg text-bloomberg-text overflow-hidden selection:bg-bloomberg-primary selection:text-black">
      <Sidebar
        selectedDoc={selectedDoc}
        onSelectDoc={setSelectedDoc}
        documents={documents}
        onDocumentUploaded={handleDocumentUploaded}
      />

      <main className="flex-1 flex flex-col min-w-0 border-l border-bloomberg-border relative bg-gradient-to-br from-[#050608] to-[#0A0C10]">
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <ChatWindow messages={messages} isStreaming={isStreaming} />
        </div>
        <div className="w-full bg-transparent p-4 flex-shrink-0 z-10 backdrop-blur-md">
          <MessageInput
            onSendMessage={handleSendMessage}
            disabled={isStreaming}
            documents={documents}
            activeDocuments={activeDocuments}
            onToggleDoc={handleToggleDoc}
            onRemoveActiveDoc={handleRemoveActiveDoc}
          />
        </div>
      </main>
    </div>
  );
}

export default App;
