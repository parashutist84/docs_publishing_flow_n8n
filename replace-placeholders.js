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
        // Найти оригинальное изображение для получения title
        const originalImage = originalImages.find(img => img.id === imageId);
        const title = originalImage ? (originalImage.title || '') : '';
        
        // Проверяем, не является ли это help-контентом
        const webhookData = $node['Webhook'];
        const isHelp = webhookData && webhookData.json && webhookData.json.body && webhookData.json.body.isHelp === true;
        
        // Добавляем класс только если это help-контент
        const className = isHelp ? ' class="visible-in-embedded-help"' : '';
        
        console.log(`❌ No mapping for: ${imageId}`);
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
