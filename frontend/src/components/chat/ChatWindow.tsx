import { useState, useRef, useEffect, useCallback } from "react";
import { Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface ChatWindowProps {
  applicationId: string;
  onDocumentUpdated?: (docType: string, html: string) => void;
}

export default function ChatWindow({
  applicationId,
  onDocumentUpdated,
}: ChatWindowProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [connected, setConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const currentResponseRef = useRef("");

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages]);

  const connect = useCallback(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const ws = new WebSocket(`${protocol}//${window.location.host}/api/chat/${applicationId}`);

    ws.onopen = () => setConnected(true);
    ws.onclose = () => setConnected(false);

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);

      switch (data.type) {
        case "history":
          setMessages((prev) => [...prev, { role: data.role, content: data.content }]);
          break;

        case "token":
          currentResponseRef.current += data.content;
          setMessages((prev) => {
            const updated = [...prev];
            const last = updated[updated.length - 1];
            if (last?.role === "assistant") {
              updated[updated.length - 1] = {
                ...last,
                content: currentResponseRef.current,
              };
            } else {
              updated.push({ role: "assistant", content: currentResponseRef.current });
            }
            return updated;
          });
          break;

        case "document_updated":
          onDocumentUpdated?.(data.doc_type, data.html);
          break;

        case "done":
          setIsStreaming(false);
          currentResponseRef.current = "";
          break;

        case "error":
          setMessages((prev) => [
            ...prev,
            { role: "assistant", content: `Error: ${data.content}` },
          ]);
          setIsStreaming(false);
          break;
      }
    };

    wsRef.current = ws;

    return () => {
      ws.close();
    };
  }, [applicationId, onDocumentUpdated]);

  useEffect(() => {
    const cleanup = connect();
    return cleanup;
  }, [connect]);

  const sendMessage = () => {
    if (!input.trim() || !wsRef.current || isStreaming) return;

    const content = input.trim();
    setInput("");
    setIsStreaming(true);
    currentResponseRef.current = "";

    setMessages((prev) => [...prev, { role: "user", content }]);
    wsRef.current.send(JSON.stringify({ content }));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Chat Refinement</span>
          <span
            className={`h-2 w-2 rounded-full ${connected ? "bg-green-500" : "bg-red-500"}`}
          />
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Messages */}
        <div className="h-80 overflow-y-auto space-y-3 border rounded-lg p-3">
          {messages.length === 0 && (
            <p className="text-muted-foreground text-sm text-center py-8">
              Ask questions or request changes to your document...
            </p>
          )}
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted"
                }`}
              >
                <pre className="whitespace-pre-wrap font-sans">{msg.content}</pre>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="flex gap-2">
          <Textarea
            placeholder="Type a message..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={2}
            className="resize-none"
          />
          <Button
            onClick={sendMessage}
            disabled={!input.trim() || isStreaming || !connected}
            className="self-end"
          >
            {isStreaming ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
