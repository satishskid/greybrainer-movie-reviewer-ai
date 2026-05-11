function extractJsonPayloadFromModelText(responseText) {
  if (!responseText) return '';
  let cleaned = responseText.trim();
  
  const blockRegex = /```(?:json)?\s*([\s\S]*?)\s*```/ig;
  let match;
  let foundBlock = false;
  if ((match = blockRegex.exec(cleaned)) !== null) {
    cleaned = match[1];
    foundBlock = true;
  }
  if (!foundBlock) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, '');
    cleaned = cleaned.replace(/\s*```$/i, '');
  }

  const firstBrace = cleaned.indexOf('{');
  const firstBracket = cleaned.indexOf('[');
  let first = -1;
  if (firstBrace !== -1 && firstBracket !== -1) {
    first = Math.min(firstBrace, firstBracket);
  } else {
    first = Math.max(firstBrace, firstBracket);
  }

  const lastBrace = cleaned.lastIndexOf('}');
  const lastBracket = cleaned.lastIndexOf(']');
  let last = -1;
  if (lastBrace !== -1 && lastBracket !== -1) {
    last = Math.max(lastBrace, lastBracket);
  } else {
    last = Math.max(lastBrace, lastBracket);
  }
  
  if (first !== -1) {
    if (last !== -1 && last >= first) {
      cleaned = cleaned.substring(first, last + 1);
    } else {
      cleaned = cleaned.substring(first);
    }
  }

  // REPAIR LOGIC
  cleaned = cleaned.replace(/(": "\s*)([\s\S]*?)("\s*[,}\]])/g, (match, p1, p2, p3) => {
    const fixedContent = p2.replace(/(?<!\\)"/g, '\\"');
    return p1 + fixedContent + p3;
  });

  cleaned = cleaned.replace(/"([^"\\]*(?:\\.[^"\\]*)*)"/g, (m) => {
    return m.replace(/\n/g, '\\n').replace(/\r/g, '\\r');
  });

  cleaned = cleaned.replace(/,\s*}/g, '}').replace(/,\s*\]/g, ']');

  return cleaned;
}

// User's failing case (simplified)
const failing = '{ "content": "what he terms \\"propaganda films\\" that \\"monetise hate\\". Even", "next": "topic" }';
// Wait, the above already has escaped quotes because it's a JS string literal.
// Let's use raw unescaped quotes in the string.
const rawFailing = '{ "content": "what he terms "propaganda films" that "monetise hate". Even", "next": "topic" }';

console.log('Original:', rawFailing);
const fixed = extractJsonPayloadFromModelText(rawFailing);
console.log('Fixed:', fixed);

try {
  const parsed = JSON.parse(fixed);
  console.log('JSON.parse SUCCESS!');
  console.log('Content value:', parsed.content);
} catch (e) {
  console.error('JSON.parse FAIL:', e.message);
}
