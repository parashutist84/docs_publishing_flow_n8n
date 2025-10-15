// n8n Code Block Script
// Formats unreadable HTML into a human-readable format with proper indentation

const inputHtml = $input.item.json.html; // Adjust based on your n8n input structure

function formatHtml(html) {
  const indentSize = 2;
  
  // Inline tags that should keep content on same line
  const inlineTags = new Set(['a', 'b', 'i', 'u', 'strong', 'em', 'span', 'code', 'small', 'sup', 'sub']);
  
  // Self-closing tags
  const selfClosingTags = new Set(['img', 'br', 'hr', 'input', 'meta', 'link', 'area', 'base', 'col']);
  
  // Block tags that should always be on separate lines
  const blockTags = new Set(['div', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'table', 'tr', 'td', 'th', 'ul', 'ol', 'thead', 'tbody']);
  
  // Find matching closing tag for an opening tag
  function findMatchingClosingTag(html, startPos, tagName) {
    let depth = 1;
    let pos = startPos;
    const openPattern = new RegExp(`<${tagName}[\\s>]`, 'gi');
    const closePattern = new RegExp(`</${tagName}>`, 'gi');
    
    while (depth > 0 && pos < html.length) {
      openPattern.lastIndex = pos;
      closePattern.lastIndex = pos;
      
      const nextOpen = openPattern.exec(html);
      const nextClose = closePattern.exec(html);
      
      if (!nextClose) return -1;
      
      if (nextOpen && nextOpen.index < nextClose.index) {
        depth++;
        pos = openPattern.lastIndex;
      } else {
        depth--;
        if (depth === 0) {
          return nextClose.index;
        }
        pos = closePattern.lastIndex;
      }
    }
    return -1;
  }
  
  // Check if content contains only text and inline tags
  function hasOnlyInlineContent(content) {
    let tempContent = content;
    // Remove inline tags
    for (const tag of inlineTags) {
      tempContent = tempContent.replace(new RegExp(`<${tag}[^>]*>.*?</${tag}>`, 'gi'), '');
      tempContent = tempContent.replace(new RegExp(`</?${tag}[^>]*>`, 'gi'), '');
    }
    // Check if any block tags remain
    for (const tag of blockTags) {
      if (tempContent.match(new RegExp(`<${tag}[\\s>]`, 'i'))) {
        return false;
      }
    }
    return true;
  }
  
  function formatRecursive(html, indent) {
    let result = '';
    let pos = 0;
    
    while (pos < html.length) {
      const tagStart = html.indexOf('<', pos);
      
      if (tagStart === -1) {
        const text = html.substring(pos).trim();
        if (text) {
          result += ' '.repeat(indent) + text + '\n';
        }
        break;
      }
      
      // Add text before tag
      if (tagStart > pos) {
        const text = html.substring(pos, tagStart).trim();
        if (text) {
          result += ' '.repeat(indent) + text + '\n';
        }
      }
      
      const tagEnd = html.indexOf('>', tagStart);
      if (tagEnd === -1) break;
      
      const tag = html.substring(tagStart, tagEnd + 1);
      const isClosingTag = tag.startsWith('</');
      const tagNameMatch = tag.match(/<\/?([a-z0-9]+)/i);
      const tagName = tagNameMatch ? tagNameMatch[1].toLowerCase() : '';
      const isSelfClosing = selfClosingTags.has(tagName) || tag.endsWith('/>');
      
      if (isClosingTag || isSelfClosing) {
        result += ' '.repeat(indent) + tag + '\n';
        pos = tagEnd + 1;
      } else {
        // Opening tag - check if we should inline it
        const closingPos = findMatchingClosingTag(html, tagEnd + 1, tagName);
        
        if (closingPos === -1) {
          result += ' '.repeat(indent) + tag + '\n';
          pos = tagEnd + 1;
          continue;
        }
        
        const content = html.substring(tagEnd + 1, closingPos);
        const closingTag = `</${tagName}>`;
        const isHeader = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(tagName);
        const shouldInline = (inlineTags.has(tagName) || tagName === 'li' || isHeader) && hasOnlyInlineContent(content);
        
        if (shouldInline) {
          // Keep everything on one line
          let fullTag = tag + content + closingTag;
          let nextPos = closingPos + closingTag.length;
          
          // Check if there's punctuation immediately after the closing tag
          const afterTag = html.substring(nextPos, nextPos + 10);
          const punctMatch = afterTag.match(/^([.,;:!?)\]}\-\u2013\u2014]+)/);
          if (punctMatch) {
            fullTag += punctMatch[1];
            nextPos += punctMatch[1].length;
          }
          
          result += ' '.repeat(indent) + fullTag + '\n';
          pos = nextPos;
        } else {
          // Format as block
          result += ' '.repeat(indent) + tag + '\n';
          result += formatRecursive(content, indent + indentSize);
          result += ' '.repeat(indent) + closingTag + '\n';
          pos = closingPos + closingTag.length;
        }
      }
    }
    
    return result;
  }
  
  return formatRecursive(html, 0).trim();
}

// Return formatted HTML
return {
  json: {
    formattedHtml: formatHtml(inputHtml),
    originalHtml: inputHtml
  }
};

