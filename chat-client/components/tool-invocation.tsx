'use client';

import { useEffect, useState, useMemo, useCallback, memo } from 'react';
import {
  ChevronDownIcon,
  ChevronUpIcon,
  Loader2,
  CheckCircle2,
  TerminalSquare,
  Code,
  ArrowRight,
  Circle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { UIResourceRenderer, UIActionResult } from '@mcp-ui/client';
import type { UseChatHelpers, Message as TMessage } from '@ai-sdk/react';
import { nanoid } from 'nanoid';

// Define interfaces for better type safety
interface HtmlResourceData {
  uri: string;
  mimeType: 'text/html';
  text?: string;
  blob?: string;
  [key: string]: any; // Allow other fields, like id from example
}

interface ContentItemWithHtmlResource {
  type: 'resource';
  resource: HtmlResourceData;
}

// Generic content item
interface ContentItem {
  type: string;
  [key: string]: any;
}

// Expected structure of the parsed result string
interface ParsedResultContainer {
  content: ContentItem[];
}

interface ToolInvocationProps {
  toolName: string;
  state: string;
  args: any;
  result: any;
  isLatestMessage: boolean;
  status: string;
  append?: UseChatHelpers['append'];
  messageId: string;
  toolIndex: number;
  onToolInvoked?: (parentMessageId: string, parentToolIndex: number) => void;
  isHidden?: boolean;
}

export const ToolInvocation = memo(function ToolInvocation({
  toolName,
  state,
  args,
  result,
  isLatestMessage,
  status,
  append,
  messageId,
  toolIndex,
  onToolInvoked,
  isHidden = false,
}: ToolInvocationProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [htmlResourceContents, setHtmlResourceContents] = useState<HtmlResourceData[]>([]);

  useEffect(() => {
    let processedContainer: ParsedResultContainer | null = null;

    if (result && typeof result === 'object' && result.content && Array.isArray(result.content)) {
      processedContainer = result as ParsedResultContainer;
    } else if (typeof result === 'string') {
      try {
        const parsed = JSON.parse(result);
        if (
          parsed &&
          typeof parsed === 'object' &&
          parsed.content &&
          Array.isArray(parsed.content)
        ) {
          processedContainer = parsed as ParsedResultContainer;
        } else if (parsed) {
          console.warn(
            'Parsed string result does not have the expected .content array structure:',
            parsed
          );
        }
      } catch (error) {
        console.error(
          'Failed to parse string result for HtmlResource:',
          error,
          'Input string was:',
          result
        );
        // Error during parsing, clear content
        setHtmlResourceContents((prev) => (prev.length > 0 ? [] : prev));
        return; // Exit effect early
      }
    } else if (result !== null && result !== undefined) {
      // Result is not an object, not a string, but also not null/undefined.
      // This case implies an unexpected type for 'result'.
      console.warn('Result has an unexpected type or structure:', result);
      // It's safest to clear content here as well.
      setHtmlResourceContents((prev) => (prev.length > 0 ? [] : prev));
      return; // Exit effect early
    }

    if (processedContainer) {
      try {
        const newHtmlResources = processedContainer.content
          .filter(
            (item): item is ContentItemWithHtmlResource =>
              item.type === 'resource' && item.resource && item.resource.uri.startsWith('ui://')
          )
          .map((item) => item.resource);

        setHtmlResourceContents((prevContents) => {
          const newUris = newHtmlResources.map((r) => r.uri).sort();
          const currentUris = prevContents.map((r) => r.uri).sort();

          if (JSON.stringify(newUris) !== JSON.stringify(currentUris)) {
            // Content has actually changed, set it.
            // Also, trigger expansion if new content arrived and we are currently collapsed.
            if (newHtmlResources.length > 0) {
              setIsExpanded((currentExpandedState) => {
                if (!currentExpandedState) return true; // Expand if not already expanded
                return currentExpandedState; // Otherwise, keep current state
              });
            }
            return newHtmlResources;
          }
          return prevContents; // No change to htmlResourceContents
        });
      } catch (error) {
        console.error('Error processing content for HtmlResource:', error);
        // Error during processing, clear content
        setHtmlResourceContents((prev) => (prev.length > 0 ? [] : prev));
      }
    } else {
      // Result is null, undefined (implicitly handled by lack of processedContainer),
      // or became null after initial checks (e.g. string parsed to null).
      // Clear content.
      setHtmlResourceContents((prev) => (prev.length > 0 ? [] : prev));
    }
  }, [result]); // Only re-run if result changes

  const getStatusIcon = () => {
    if (state === 'call') {
      if (isLatestMessage && status !== 'ready') {
        return <Loader2 className="animate-spin h-3.5 w-3.5 text-primary/70" />;
      }
      return <Circle className="h-3.5 w-3.5 fill-muted-foreground/10 text-muted-foreground/70" />;
    }
    return <CheckCircle2 size={14} className="text-primary/90" />;
  };

  const getStatusClass = () => {
    if (state === 'call') {
      if (isLatestMessage && status !== 'ready') {
        return 'text-primary';
      }
      return 'text-muted-foreground';
    }
    return 'text-primary';
  };

  const formatContent = (content: any): string => {
    try {
      if (typeof content === 'string') {
        if (!content.trim().startsWith('{') && !content.trim().startsWith('[')) {
          return content;
        }
        try {
          const parsed = JSON.parse(content);
          return JSON.stringify(parsed, null, 2);
        } catch {
          return content;
        }
      }
      return JSON.stringify(content, null, 2);
    } catch {
      return String(content);
    }
  };

  const resourceStyle =
    toolName == 'show_user_status'
      ? {
          minHeight: 695,
          borderRadius: '0.5rem',
          overflow: 'hidden',
        }
      : {
          minHeight: 425,
          borderRadius: '0.5rem',
          overflow: 'hidden',
        };

  const handleUiAction = useCallback(
    async (result: UIActionResult) => {
      if (append) {
        let userMessageContent = '';
        if (result.type === 'tool') {
          userMessageContent = `Call ${result.payload.toolName} with parameters: ${JSON.stringify(
            result.payload.params
          )}`;

          // Notify parent that this tool invocation triggered a child tool
          // This allows hiding the parent tool when claim_option_* is called
          if (onToolInvoked) {
            onToolInvoked(messageId, toolIndex);
          }
        }
        if (result.type === 'prompt') {
          userMessageContent = result.payload.prompt;
        }
        if (userMessageContent) {
          const newMessage: TMessage = {
            id: nanoid(),
            role: 'user',
            content: userMessageContent,
            // Mark this message as a tool trigger so it can be hidden in the UI
            annotations: [{ type: 'tool-trigger' }],
          };

          append(newMessage);
        }

        return Promise.resolve({
          status: 'ok',
          message: 'User interaction requested via append',
        });
      } else {
        console.warn('append function not available in ToolInvocation for UI action');
        return Promise.resolve({
          status: 'error',
          message: 'Chat context (append) not available for UI action',
        });
      }
    },
    [append, messageId, toolIndex, onToolInvoked]
  );

  const renderedHtmlResources = useMemo(() => {
    return htmlResourceContents.map((resourceData, index) => (
      <UIResourceRenderer
        key={resourceData.uri || `html-resource-${index}`}
        resource={resourceData}
        htmlProps={{
          style: resourceStyle,
          className: 'rounded-lg overflow-hidden',
        }}
        onUIAction={handleUiAction}
      />
    ));
  }, [htmlResourceContents, resourceStyle, handleUiAction]);

  // If there are UI resources, only render them when the message is complete (status is 'ready')
  // This prevents showing the UI while the model is still generating text
  const shouldShowHtmlResources = htmlResourceContents.length > 0 && (!isLatestMessage || status === 'ready');

  if (shouldShowHtmlResources) {
    return (
      <div
        className={cn(
          'mb-2 relative',
          isHidden ? 'opacity-40' : ''
        )}
      >
        {/* Overlay to make it non-interactive when hidden */}
        {isHidden && (
          <div className="absolute inset-0 bg-muted/20 backdrop-blur-[2px] z-10 cursor-not-allowed rounded-lg" />
        )}
        {renderedHtmlResources}
      </div>
    );
  }

  // If we have HTML resources but shouldn't show them yet (still streaming),
  // don't render anything - just wait silently until the message is complete
  if (htmlResourceContents.length > 0 && isLatestMessage && status !== 'ready') {
    return null;
  }

  return (
    <div
      className={cn(
        'flex flex-col mb-2 rounded-md border border-border/50 overflow-hidden relative',
        'bg-gradient-to-b from-background to-muted/30 backdrop-blur-sm',
        'transition-all duration-200 group',
        isHidden ? 'opacity-40' : 'hover:border-border/80'
      )}
    >
      {/* Overlay to make it non-interactive when hidden */}
      {isHidden && (
        <div className="absolute inset-0 bg-muted/20 backdrop-blur-[2px] z-10 cursor-not-allowed" />
      )}
      <div
        className={cn(
          'flex items-center gap-2.5 px-3 py-2 transition-colors',
          isHidden ? 'cursor-not-allowed' : 'cursor-pointer hover:bg-muted/20'
        )}
        onClick={() => !isHidden && setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-center rounded-full w-5 h-5 bg-primary/5 text-primary">
          <TerminalSquare className="h-3.5 w-3.5" />
        </div>
        <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground flex-1">
          <span className="text-foreground font-semibold tracking-tight">{toolName}</span>
          <ArrowRight className="h-3 w-3 text-muted-foreground/50" />
          <span className={cn('font-medium', getStatusClass())}>
            {state === 'call'
              ? isLatestMessage && status !== 'ready'
                ? 'Running'
                : 'Waiting'
              : 'Completed'}
          </span>
        </div>
        <div className="flex items-center gap-2 opacity-70 group-hover:opacity-100 transition-opacity">
          {getStatusIcon()}
          <div className="bg-muted/30 rounded-full p-0.5 border border-border/30">
            {isExpanded ? (
              <ChevronUpIcon className="h-3 w-3 text-foreground/70" />
            ) : (
              <ChevronDownIcon className="h-3 w-3 text-foreground/70" />
            )}
          </div>
        </div>
      </div>

      {isExpanded && (
        <div className="space-y-2 px-3 pb-3">
          {!!args && (
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground/70 pt-1.5">
                <Code className="h-3 w-3" />
                <span className="font-medium">Arguments</span>
              </div>
              <pre
                className={cn(
                  'text-xs font-mono p-2.5 rounded-md overflow-x-auto',
                  'border border-border/40 bg-muted/10'
                )}
              >
                {formatContent(args)}
              </pre>
            </div>
          )}

          {!!result && (
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground/70">
                <ArrowRight className="h-3 w-3" />
                <span className="font-medium">Result</span>
              </div>

              {htmlResourceContents.length > 0 ? (
                renderedHtmlResources
              ) : (
                <pre
                  className={cn(
                    'text-xs font-mono p-2.5 rounded-md overflow-x-auto max-h-[300px] overflow-y-auto',
                    'border border-border/40 bg-muted/10'
                  )}
                >
                  {formatContent(result)}
                </pre>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
});
