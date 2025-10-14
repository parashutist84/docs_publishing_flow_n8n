// ===== CODE FOR USE IN n8n =====
// This runs in n8n Code Node after Merge

// Get all input data
const inputs = $input.all();

// If data comes as an array in a single element
let mergeData;
if (inputs.length === 1 && Array.isArray(inputs[0])) {
    mergeData = inputs[0];
} else {
    mergeData = inputs;
}


// First element - HTML data
const converterData = $node['Convert Google DOCS to HTML'];

// n8n may wrap data in .json
const actualData = converterData.json || converterData;
const originalHtml = actualData.htmlWordPress || actualData.html;
const originalImages = actualData.images || [];


if (!originalHtml) {
    return { 
        error: 'No HTML found', 
        debug: { 
            converterData: Object.keys(converterData),
            actualData: Object.keys(actualData),
            hasJson: !!converterData.json
        } 
    };
}

// Other elements - WordPress uploads
const wordPressUploads = mergeData.slice(1).map(item => item.json || item);

// Create mapping table
const imageMapping = {};

wordPressUploads.forEach(wpUpload => {
    
    const matchedImage = originalImages.find(img => {
        const slug = wpUpload.slug || '';
        const imageTitle = (img.title || img.alt || '').toLowerCase();
        const cleanImageTitle = imageTitle
            .replace(/[^\w\s\-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/\-+/g, '-')
            .replace(/^-|-$/g, '');
        
        const match = slug.includes(cleanImageTitle) || cleanImageTitle.includes(slug);
        return match;
    });
    
    if (matchedImage) {
        imageMapping[matchedImage.id] = {
            sourceUrl: wpUpload.source_url,
            alt: matchedImage.alt || matchedImage.title || '',
            title: matchedImage.title || '',
            wpId: wpUpload.id
        };
    } else {
    }
});


// Replace placeholders
let updatedHtml = originalHtml;
let replacedCount = 0;

const placeholderRegex = /\[\[IMG:([^|]+)\|([^\]]*)\]\]/g;

updatedHtml = updatedHtml.replace(placeholderRegex, (match, imageId, altText) => {
    const mapping = imageMapping[imageId];
    
    if (mapping) {
        replacedCount++;
        return `<img src="${mapping.sourceUrl}" alt="${mapping.alt}" title="${mapping.title}" data-wp-id="${mapping.wpId}" />`;
    } else {
        // Find original image to get title
        const originalImage = originalImages.find(img => img.id === imageId);
        const title = originalImage ? (originalImage.title || '') : '';
        
        // Check if this is help content
        const webhookData = $node['Webhook'];
        const isHelp = webhookData && webhookData.json && webhookData.json.body && webhookData.json.body.isHelp === true;
        
        // Add class only if this is help content
        const className = isHelp ? ' class="visible-in-embedded-help"' : '';
        
        return `<img src="" alt="${altText}" title="${title}"${className} />`;
    }
});

return {
    html: updatedHtml,
    success: true,
    replacedCount: replacedCount,
    totalPlaceholders: (originalHtml.match(placeholderRegex) || []).length,
    message: `Successfully replaced ${replacedCount} image placeholders`
};
