import type { Message as TMessage, UseChatHelpers } from "@ai-sdk/react";
import { Message } from "./message";
import { useScrollToBottom } from "@/lib/hooks/use-scroll-to-bottom";
import { useState, useCallback, useEffect, useRef } from "react";

export const Messages = ({
  messages,
  isLoading,
  status,
  append,
}: {
  messages: TMessage[];
  isLoading: boolean;
  status: "error" | "submitted" | "streaming" | "ready";
  append: UseChatHelpers['append'];
}) => {
  const [containerRef, endRef] = useScrollToBottom();
  const [hiddenTools, setHiddenTools] = useState<Set<string>>(new Set());
  const lastToolCallRef = useRef<{ messageId: string; toolIndex: number } | null>(null);

  // Called when a tool invocation triggers a child tool (e.g., button click in get_options)
  const handleToolInvoked = useCallback((parentMessageId: string, parentToolIndex: number) => {
    const toolKey = `${parentMessageId}-${parentToolIndex}`;
    setHiddenTools((prev) => {
      const newSet = new Set(prev);
      newSet.add(toolKey);
      return newSet;
    });
  }, []);

  // Detect new tool calls and hide all previous tool invocations
  useEffect(() => {
    // Collect all tool invocations in order
    const allToolInvocations: Array<{ messageId: string; toolIndex: number }> = [];

    for (const message of messages) {
      if (message.role === 'assistant' && message.parts) {
        message.parts.forEach((part: any, index: number) => {
          if (part.type === 'tool-invocation') {
            allToolInvocations.push({ messageId: message.id, toolIndex: index });
          }
        });
      }
    }

    if (allToolInvocations.length === 0) {
      return;
    }

    // Get the most recent tool invocation
    const latestTool = allToolInvocations[allToolInvocations.length - 1];

    // Check if this is a new tool call
    if (
      lastToolCallRef.current &&
      (lastToolCallRef.current.messageId !== latestTool.messageId ||
       lastToolCallRef.current.toolIndex !== latestTool.toolIndex)
    ) {
      // New tool call detected - hide ALL previous tool invocations
      setHiddenTools((prev) => {
        const newSet = new Set(prev);
        // Add all tool invocations except the latest one
        for (let i = 0; i < allToolInvocations.length - 1; i++) {
          const tool = allToolInvocations[i];
          newSet.add(`${tool.messageId}-${tool.toolIndex}`);
        }
        return newSet;
      });
    }

    // Update the reference
    lastToolCallRef.current = latestTool;
  }, [messages]);

  return (
    <div
      className="h-full overflow-y-auto no-scrollbar"
      ref={containerRef}
    >
      <div className="max-w-lg sm:max-w-3xl mx-auto py-4">
        {messages.map((m, i) => (
          <Message
            key={i}
            isLatestMessage={i === messages.length - 1}
            isLoading={isLoading}
            message={m}
            status={status}
            append={append}
            hiddenTools={hiddenTools}
            onToolInvoked={handleToolInvoked}
          />
        ))}
        <div className="h-1" ref={endRef} />
      </div>
    </div>
  );
};
