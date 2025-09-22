/**
 * Replace Image Placeholders in HTML
 * 
 * This function takes the Merge output and replaces image placeholders
 * with actual <img> tags using WordPress URLs
 */

function replacePlaceholders(mergeData) {
    console.log('Processing merge data with length:', mergeData.length);
    
    // Если массив содержит только один элемент, это может быть объединенные данные
    if (mergeData.length === 1 && mergeData[0].html) {
        // Единичный объект с HTML - возможно, WordPress загрузки не прошли
        const data = mergeData[0];
        const originalHtml = data.htmlWordPress || data.html;
        const originalImages = data.images || [];
        
        console.log('Single object mode - no WordPress uploads found');
        console.log('HTML length:', originalHtml ? originalHtml.length : 'undefined');
        console.log('Images count:', originalImages.length);
        
        // Если нет WordPress загрузок, просто удаляем плейсхолдеры или оставляем как есть
        if (!originalHtml) {
            throw new Error('No HTML content found in data');
        }
        
        // Заменяем плейсхолдеры на заглушки
        const placeholderRegex = /\[\[IMG:([^|]+)\|([^\]]*)\]\]/g;
        const updatedHtml = originalHtml.replace(placeholderRegex, (match, imageId, altText) => {
            return `<!-- Image placeholder: ${imageId} - ${altText} -->`;
        });
        
        return {
            html: updatedHtml,
            success: true,
            replacedCount: 0,
            totalPlaceholders: (originalHtml.match(placeholderRegex) || []).length,
            message: 'No WordPress uploads found - placeholders converted to comments'
        };
    }
    
    // Первый элемент - данные из конвертера (HTML + metadata)
    const converterData = mergeData[0];
    const originalHtml = converterData.htmlWordPress || converterData.html;
    const originalImages = converterData.images || [];
    
    console.log('Converter data keys:', Object.keys(converterData));
    console.log('HTML found:', !!originalHtml);
    console.log('HTML type:', typeof originalHtml);
    console.log('HTML length:', originalHtml ? originalHtml.length : 'N/A');
    console.log('Images found:', originalImages.length);
    
    if (!originalHtml) {
        throw new Error('No HTML content found in converter data');
    }
    
    console.log('Multi-element mode - processing WordPress uploads');
    console.log('HTML length:', originalHtml.length);
    console.log('Original images:', originalImages.length);
    
    // Остальные элементы - результаты загрузки в WordPress
    const wordPressUploads = mergeData.slice(1);
    
    // Создаем карту соответствий: originalId -> WordPress data
    const imageMapping = {};
    
    wordPressUploads.forEach((wpUpload, index) => {
        console.log(`Processing WordPress upload ${index}:`, {
            id: wpUpload.id,
            slug: wpUpload.slug,
            title: wpUpload.title?.rendered || wpUpload.title?.raw,
            source_url: wpUpload.source_url
        });
        
        // Ищем соответствующее изображение в originalImages по названию
        const matchedImage = originalImages.find(img => {
            // Сопоставляем по slug и title
            const slug = wpUpload.slug || '';
            const wpTitle = (wpUpload.title?.rendered || wpUpload.title?.raw || '').toLowerCase();
            const imageTitle = (img.title || img.alt || '').toLowerCase();
            
            console.log(`Comparing: "${imageTitle}" with slug "${slug}" and title "${wpTitle}"`);
            
            // Проверяем разные варианты сопоставления
            const cleanImageTitle = imageTitle
                .replace(/[^\w\s\-]/g, '')
                .replace(/\s+/g, '-')
                .replace(/\-+/g, '-')
                .replace(/^-|-$/g, '');
            
            const isSlugMatch = slug.includes(cleanImageTitle) || cleanImageTitle.includes(slug);
            const isTitleMatch = wpTitle.includes(imageTitle) || imageTitle.includes(wpTitle);
            
            console.log(`  Clean title: "${cleanImageTitle}", slug match: ${isSlugMatch}, title match: ${isTitleMatch}`);
            
            return isSlugMatch || isTitleMatch;
        });
        
        if (matchedImage) {
            console.log(`✅ Matched image: ${matchedImage.id} -> ${wpUpload.id}`);
            imageMapping[matchedImage.id] = {
                id: matchedImage.id,
                wpId: wpUpload.id,
                sourceUrl: wpUpload.source_url,
                alt: matchedImage.alt || matchedImage.description || matchedImage.title || '',
                title: matchedImage.title || '',
                originalUrl: matchedImage.contentUri
            };
        } else {
            console.log(`❌ No match found for WordPress upload: ${wpUpload.slug}`);
        }
    });
    
    // Заменяем плейсхолдеры в HTML
    let updatedHtml = originalHtml;
    let replacedCount = 0;
    const replacements = [];
    
    // Ищем все плейсхолдеры [[IMG:id|alt]]
    const placeholderRegex = /\[\[IMG:([^|]+)\|([^\]]*)\]\]/g;
    
    updatedHtml = updatedHtml.replace(placeholderRegex, (match, imageId, altText) => {
        const mapping = imageMapping[imageId];
        
        if (mapping) {
            replacedCount++;
            replacements.push({
                placeholder: match,
                imageId: imageId,
                wpUrl: mapping.sourceUrl,
                wpId: mapping.wpId
            });
            
            // Создаем img тег
            const imgTag = `<img src="${mapping.sourceUrl}" alt="${mapping.alt}" title="${mapping.title}" data-wp-id="${mapping.wpId}" />`;
            return imgTag;
        } else {
            // Если соответствие не найдено, оставляем плейсхолдер или заменяем на заглушку
            console.warn(`No WordPress upload found for image: ${imageId}`);
            return `<!-- Image not found: ${imageId} -->`;
        }
    });
    
    return {
        html: updatedHtml,
        success: true,
        replacedCount: replacedCount,
        totalPlaceholders: (originalHtml.match(placeholderRegex) || []).length,
        totalWordPressUploads: wordPressUploads.length,
        imageMapping: Object.values(imageMapping),
        replacements: replacements,
        message: `Successfully replaced ${replacedCount} image placeholders`
    };
}

// ===== CODE FOR USE IN n8n =====
// This runs in n8n Code Node after Merge

// Получаем все входящие данные
const inputs = $input.all();
console.log('Total inputs:', inputs.length);

// Если данные приходят как массив в одном элементе
let mergeData;
if (inputs.length === 1 && Array.isArray(inputs[0])) {
    mergeData = inputs[0];
} else {
    mergeData = inputs;
}

console.log('Processing data length:', mergeData.length);

// Первый элемент - HTML данные
const converterData = $node['Convert Google DOCS to HTML'];

// n8n может оборачивать данные в .json
const actualData = converterData.json || converterData;
const originalHtml = actualData.htmlWordPress || actualData.html;
const originalImages = actualData.images || [];

console.log('Converter data keys:', Object.keys(converterData));
console.log('Actual data keys:', Object.keys(actualData));
console.log('HTML found:', !!originalHtml);
console.log('Images found:', originalImages.length);

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

// Остальные элементы - WordPress загрузки
const wordPressUploads = mergeData.slice(1).map(item => item.json || item);
console.log('WordPress uploads:', wordPressUploads.length);

// Создаем карту соответствий
const imageMapping = {};

wordPressUploads.forEach(wpUpload => {
    console.log('Processing WP upload:', { id: wpUpload.id, slug: wpUpload.slug });
    
    const matchedImage = originalImages.find(img => {
        const slug = wpUpload.slug || '';
        const imageTitle = (img.title || img.alt || '').toLowerCase();
        const cleanImageTitle = imageTitle
            .replace(/[^\w\s\-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/\-+/g, '-')
            .replace(/^-|-$/g, '');
        
        const match = slug.includes(cleanImageTitle) || cleanImageTitle.includes(slug);
        console.log(`  Comparing "${imageTitle}" -> "${cleanImageTitle}" with "${slug}": ${match}`);
        return match;
    });
    
    if (matchedImage) {
        console.log(`  ✅ Matched: ${matchedImage.id} -> ${wpUpload.id}`);
        imageMapping[matchedImage.id] = {
            sourceUrl: wpUpload.source_url,
            alt: matchedImage.alt || matchedImage.title || '',
            title: matchedImage.title || '',
            wpId: wpUpload.id
        };
    } else {
        console.log(`  ❌ No match found for ${wpUpload.slug}`);
    }
});

console.log('Image mappings found:', Object.keys(imageMapping).length);

// Заменяем плейсхолдеры
let updatedHtml = originalHtml;
let replacedCount = 0;

const placeholderRegex = /\[\[IMG:([^|]+)\|([^\]]*)\]\]/g;

updatedHtml = updatedHtml.replace(placeholderRegex, (match, imageId, altText) => {
    const mapping = imageMapping[imageId];
    
    if (mapping) {
        replacedCount++;
        console.log(`✅ Replaced: ${imageId}`);
        return `<img src="${mapping.sourceUrl}" alt="${mapping.alt}" title="${mapping.title}" data-wp-id="${mapping.wpId}" />`;
    } else {
        console.log(`❌ No mapping for: ${imageId}`);
        return `<!-- Image not found: ${imageId} -->`;
    }
});

return {
    html: updatedHtml,
    success: true,
    replacedCount: replacedCount,
    totalPlaceholders: (originalHtml.match(placeholderRegex) || []).length,
    message: `Successfully replaced ${replacedCount} image placeholders`
};
