import React, { useState } from "react";
import { cn } from "@/src/lib/utils";
import { ChevronRight, ChevronDown, Folder, FileText, Globe, CheckCircle2, Sparkles } from "lucide-react";

export interface ContentTreeNode {
  id: string;
  name: string;
  displayName?: string;
  path: string;
  template: "Site" | "Page" | "Folder" | "App";
  children?: ContentTreeNode[];
  isNew?: boolean;
  isUpdated?: boolean;
}

interface TreeViewProps {
  nodes: ContentTreeNode[];
  selectedPath?: string;
  onSelectNode?: (node: ContentTreeNode) => void;
  onExpandNode?: (node: ContentTreeNode) => Promise<void>;
  className?: string;
}

export function TreeView({ nodes, selectedPath, onSelectNode, onExpandNode, className }: TreeViewProps) {
  return (
    <div className={cn("select-none text-sm font-sans space-y-1", className)}>
      {nodes.map((node) => (
        <TreeNodeItem
          key={node.id}
          node={node}
          selectedPath={selectedPath}
          onSelectNode={onSelectNode}
          onExpandNode={onExpandNode}
          level={0}
        />
      ))}
    </div>
  );
}

function TreeNodeItem({
  node,
  selectedPath,
  onSelectNode,
  onExpandNode,
  level = 0,
}: {
  node: ContentTreeNode;
  selectedPath?: string;
  onSelectNode?: (node: ContentTreeNode) => void;
  onExpandNode?: (node: ContentTreeNode) => Promise<void>;
  level: number;
}) {
  const [isExpanded, setIsExpanded] = useState<boolean>(Boolean(node.children?.length));
  const [isLoaded, setIsLoaded] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadError, setLoadError] = useState<string>("");
  const hasChildren = node.children && node.children.length > 0;
  const isSelected = selectedPath === node.path;

  const toggleExpanded = async () => {
    if (hasChildren) {
      setIsExpanded(!isExpanded);
    } else if (onExpandNode && !isLoading) {
      setIsLoading(true);
      setLoadError("");
      try {
        await onExpandNode(node);
        setIsLoaded(true);
        setIsExpanded(true);
      } catch (error) {
        setLoadError(error instanceof Error ? error.message : "Could not load child pages.");
      } finally {
        setIsLoading(false);
      }
    }
  };

  const getIcon = () => {
    switch (node.template) {
      case "Site":
      case "App":
        return <Globe className="h-4 w-4 text-primary-500 shrink-0" />;
      case "Folder":
        return <Folder className="h-4 w-4 text-warning-500 shrink-0 fill-warning-100" />;
      case "Page":
      default:
        return <FileText className="h-4 w-4 text-blue-500 shrink-0" />;
    }
  };

  return (
    <div>
      <div
        onClick={() => onSelectNode?.(node)}
        style={{ paddingLeft: `${level * 16 + 8}px` }}
        className={cn(
          "group flex items-center justify-between py-1.5 pr-2.5 rounded-lg cursor-pointer transition-colors text-xs",
          isSelected
            ? "bg-primary-50 text-primary-900 font-semibold border-l-2 border-primary-500"
            : "hover:bg-neutral-100/80 text-neutral-700"
        )}
      >
        <div className="flex items-center gap-1.5 min-w-0">
          {(hasChildren || (onExpandNode && !isLoaded)) ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                void toggleExpanded();
              }}
              title={loadError || (hasChildren ? "Expand or collapse pages" : "Load child pages")}
              aria-label={hasChildren ? "Expand or collapse pages" : "Load child pages"}
              aria-expanded={Boolean(hasChildren && isExpanded)}
              disabled={isLoading}
              className="p-0.5 hover:bg-neutral-200/60 rounded text-neutral-400 hover:text-neutral-700"
            >
              {hasChildren && isExpanded ? (
                <ChevronDown className="h-3.5 w-3.5" />
              ) : (
                <ChevronRight className={cn("h-3.5 w-3.5", isLoading && "animate-pulse")} />
              )}
            </button>
          ) : (
            <span className="w-4.5" />
          )}

          {getIcon()}

          <span className="truncate">{node.displayName || node.name}</span>
        </div>

        <div className="flex items-center gap-1 ml-2 shrink-0">
          {node.isNew && (
            <span className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.2 font-medium bg-success-100 text-success-800 rounded-full animate-pulse">
              <Sparkles className="h-2.5 w-2.5" /> New
            </span>
          )}
          {node.isUpdated && (
            <span className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.2 font-medium bg-warning-100 text-warning-800 rounded-full">
              <CheckCircle2 className="h-2.5 w-2.5" /> Updated
            </span>
          )}
          <span className="text-[10px] text-neutral-400 group-hover:text-neutral-500">
            {node.template}
          </span>
        </div>
      </div>

      {loadError && <p className="pl-8 text-xs text-red-600" role="alert">{loadError}</p>}

      {hasChildren && isExpanded && (
        <div className="mt-0.5">
          {node.children!.map((child) => (
            <TreeNodeItem
              key={child.id}
              node={child}
              selectedPath={selectedPath}
              onSelectNode={onSelectNode}
              onExpandNode={onExpandNode}
              level={level + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}
