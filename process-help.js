// Check isHelp condition
if ($node['Webhook'].json.body.isHelp !== true) {
    return $input.all();
  }
  
  // Function to wrap blocks in divs
  function wrapBlocksInDivs(html) {
    // Regular expression to find headers
    const headerRegex = /(<h[1-6][^>]*>.*?<\/h[1-6]>)/gi;
    
    // Split HTML by headers, keeping the headers themselves
    const parts = html.split(headerRegex);
    
    const blocks = [];
    let currentBlock = '';
    
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i].trim();
      if (!part) continue;
      
      // Check if part is a header
      if (headerRegex.test(part)) {
        headerRegex.lastIndex = 0; // Reset index
        
        // If there is accumulated block, save it
        if (currentBlock) {
          blocks.push(`<div>\n${currentBlock}\n</div>`);
        }
        
        // Start new block with header
        currentBlock = part;
      } else {
        // Add content to current block
        if (currentBlock) {
          currentBlock += '\n' + part;
        } else {
          // This is text at the beginning of document without header
          currentBlock = part;
        }
      }
    }
    
    // Add last block
    if (currentBlock) {
      blocks.push(`<div>\n${currentBlock}\n</div>`);
    }
    
    return blocks.join('\n');
  }
  
  // Process each input data element
  return $input.all().map(item => {
    if (item.json.html) {
      return {
        json: {
          ...item.json,
          html: wrapBlocksInDivs(item.json.html)
        }
      };
    }
    return item;
  });