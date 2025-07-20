import React from 'react';

interface StoryMindMapProps {
  mindMapMarkdown?: string;
  isLoading?: boolean;
}

interface MindMapNode {
  id: string;
  content: string;
  children: MindMapNode[];
  rawMarkdownLine: string; // Store the raw line for styling based on original markdown
}

// Simple Markdown to HTML for inline styles (bold, italic)
function markdownToHtml(markdownText: string): string {
  let htmlText = markdownText;
  // Bold: **text** or __text__
  htmlText = htmlText.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  htmlText = htmlText.replace(/__(.*?)__/g, '<strong>$1</strong>');
  // Italic: *text* or _text_ (ensure not to break URLs if they contain underscores)
  // A more careful regex for italics to avoid issues with multiple underscores in a word.
  htmlText = htmlText.replace(/(?<!\w)_(.*?)_(?!\w)/g, '<em>$1</em>');
  htmlText = htmlText.replace(/\*(.*?)\*/g, '<em>$1</em>');
  return htmlText;
}


// Parser for the specific mind map Markdown structure
function parseSpecificMindMapMarkdown(markdown: string): MindMapNode | null {
  const lines = markdown.split('\n').filter(line => line.trim() !== '' || line.startsWith('#') || line.startsWith('##')); // Keep empty lines if they are H1/H2 (though not expected)
  if (lines.length === 0) return null;

  let rootNode: MindMapNode | null = null;
  let lastH2Node: MindMapNode | null = null;
  let listParentStack: MindMapNode[] = []; // Stack for list item parents

  lines.forEach((line, index) => {
    const uniqueId = `mm-node-${index}-${Math.random().toString(36).substring(2, 7)}`;

    if (line.startsWith('# ')) {
      const content = line.substring(2).trim();
      rootNode = { id: uniqueId, content, children: [], rawMarkdownLine: line };
      listParentStack = [rootNode]; // Root is the initial parent for H2s or top-level lists
      lastH2Node = null;
      return;
    }

    if (!rootNode) {
      // Create a default root if markdown doesn't start with H1
      rootNode = { id: 'default-root', content: "Mind Map Outline", children: [], rawMarkdownLine: "# Mind Map Outline" };
      listParentStack = [rootNode];
    }

    if (line.startsWith('## ')) {
      const content = line.substring(3).trim();
      const h2Node: MindMapNode = { id: uniqueId, content, children: [], rawMarkdownLine: line };
      rootNode.children.push(h2Node);
      lastH2Node = h2Node;
      // H2s are children of the root. Update stack for subsequent list items.
      listParentStack = [rootNode, h2Node];
      return;
    }

    const listItemMatch = line.match(/^(\s*)(?:-|\*)\s(.*)/);
    if (listItemMatch) {
      const indentSpaces = listItemMatch[1].length;
      const content = listItemMatch[2].trim();
      const listItemNode: MindMapNode = { id: uniqueId, content, children: [], rawMarkdownLine: line };

      // Determine parent based on indentation and current stack
      // Level 0: root, Level 1: H2, Level 2: list under H2, Level 3: sub-list under list etc.
      // Expected indent for list under H2 is 0 spaces for the list item itself.
      // Expected indent for sub-list item is 2 spaces.
      const targetLevel = (lastH2Node ? 2 : 1) + Math.floor(indentSpaces / 2);


      while (listParentStack.length > 0 && listParentStack.length >= targetLevel) {
        listParentStack.pop();
      }
      
      const parent = listParentStack.length > 0 ? listParentStack[listParentStack.length -1] : (lastH2Node || rootNode);
      parent.children.push(listItemNode);
      listParentStack.push(listItemNode);
      return;
    }
    
    // Handle multi-line content for the last added node (if it's a list item or H2)
    const trimmedLine = line.trim();
    if (trimmedLine.length > 0) {
        const lastNodeInStack = listParentStack.length > 0 ? listParentStack[listParentStack.length-1] : null;
        const lastParentNode = lastNodeInStack || lastH2Node || rootNode;
        if(lastParentNode && lastParentNode.children.length > 0 && !line.match(/^(\s*)(?:#|##|-|\*)\s/)) {
            // Append to the content of the very last child added to the current effective parent
            const veryLastChild = lastParentNode.children[lastParentNode.children.length - 1];
            if (veryLastChild) {
                 veryLastChild.content += `\n${trimmedLine}`;
                 veryLastChild.rawMarkdownLine += `\n${line}`; // also append raw line
            }
        } else if (lastParentNode && !line.match(/^(\s*)(?:#|##|-|\*)\s/)) {
            // If current parent has no children yet (e.g. H2 node itself), append to parent.
            lastParentNode.content += `\n${trimmedLine}`;
            lastParentNode.rawMarkdownLine += `\n${line}`;
        }
    }
  });
  return rootNode;
}


const MindMapNodeDisplay: React.FC<{ node: MindMapNode; level: number }> = ({ node, level }) => {
  const isRoot = level === 0; // The H1 title node
  const isH2 = level === 1 && node.rawMarkdownLine.startsWith('## '); // Section titles
  const isListItem = node.rawMarkdownLine.match(/^(\s*)(?:-|\*)\s/);
  const indentLevel = isListItem ? (node.rawMarkdownLine.match(/^(\s*)/)?.[0].length || 0) / 2 : 0; // For list items

  let textSizeClass = 'text-sm text-slate-300';
  let fontWeightClass = 'font-normal';
  let paddingLeftClass = `pl-${(isListItem ? indentLevel * 2 : 0) + 2}`; // Base pl-2, plus indent for list items
  let itemMarker = null;

  if (isRoot) {
    textSizeClass = 'text-xl text-purple-200';
    fontWeightClass = 'font-semibold';
    paddingLeftClass = 'pl-0'; // No padding for root
  } else if (isH2) {
    textSizeClass = 'text-lg text-indigo-200';
    fontWeightClass = 'font-medium';
    paddingLeftClass = 'pl-1'; // Minimal padding for H2
  } else if (isListItem) {
    // textSizeClass depends on nesting; could make it smaller for deeper lists
    if (indentLevel === 0) itemMarker = <span className="mr-2 text-slate-500">&bull;</span>; // Bullet for top-level list items
    else if (indentLevel === 1) itemMarker = <span className="mr-2 text-slate-500">&◦;</span>; // Circle for sub-items
    else itemMarker = <span className="mr-2 text-slate-500">-</span>; // Dash for deeper
  }


  return (
    <li className={`my-1.5 ${level > 0 ? 'border-l border-slate-700/70' : ''} ${paddingLeftClass}`}>
      <div className={`${textSizeClass} ${fontWeightClass} flex items-start`}>
        {itemMarker}
        <span
            dangerouslySetInnerHTML={{ __html: markdownToHtml(node.content) }}
            className="leading-relaxed"
        />
      </div>
      {node.children && node.children.length > 0 && (
        <ul className="list-none mt-1">
          {node.children.map(childNode => (
            <MindMapNodeDisplay key={childNode.id} node={childNode} level={level + 1} />
          ))}
        </ul>
      )}
    </li>
  );
};


export const StoryMindMap: React.FC<StoryMindMapProps> = ({ mindMapMarkdown, isLoading }) => {
  const rootNode = React.useMemo(() => {
    if (!mindMapMarkdown) return null;
    return parseSpecificMindMapMarkdown(mindMapMarkdown);
  }, [mindMapMarkdown]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-60 bg-slate-700/30 rounded-md my-4 p-3">
        <p className="text-slate-400 italic">Mind map outline loading...</p>
      </div>
    );
  }

  if (!rootNode) {
    return (
      <div className="flex justify-center items-center h-60 bg-slate-700/30 rounded-md my-4 p-3">
        <p className="text-slate-400 italic">No mind map data available for this idea.</p>
      </div>
    );
  }

  return (
    <div className="my-4 p-4 bg-slate-700/50 rounded-lg border border-slate-600/70">
      <h4 className="text-md font-semibold text-purple-300 mb-4">Story Structure Outline:</h4>
      <ul className="list-none space-y-1">
        <MindMapNodeDisplay node={rootNode} level={0} />
      </ul>
    </div>
  );
};