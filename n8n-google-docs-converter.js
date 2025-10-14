/**
 * Google Docs to HTML Converter for n8n
 * 
 * USAGE INSTRUCTIONS FOR n8n:
 * 
 * 1. Create a Code Node (Function Item)
 * 2. Copy this entire code into the JavaScript Code field
 * 3. At the end of the code add:
 *    
 *    const html = convertGoogleDocsToHtml($json.body);
 *    return { html: html };
 * 
 * 4. Where $json.body is the document structure from Google Docs API
 */

function convertGoogleDocsToHtml(docStructure, documentLists = null, inlineObjects = null) {
    let html = '';
    let currentListId = null;
    let openListTags = [];
    let currentNestingLevel = -1;
    let images = []; // Collect images during processing

    // RGB color processing
    function rgbToHex(rgb) {
        if (!rgb || typeof rgb !== 'object') return null;
        const r = Math.round((rgb.red || 0) * 255);
        const g = Math.round((rgb.green || 0) * 255);
        const b = Math.round((rgb.blue || 0) * 255);
        return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    }

    // HTML escaping
    function escapeHtml(text) {
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, function(m) { return map[m]; });
    }

    // Safe string conversion (solves [object Object] problem)
    function safeToString(value) {
        if (typeof value === 'string') {
            return value;
        }
        if (value === null || value === undefined) {
            return '';
        }
        if (typeof value === 'object') {
            // If it's an object, try to get meaningful representation
            if (value.toString && typeof value.toString === 'function' && value.toString !== Object.prototype.toString) {
                return value.toString();
            }
            // As last resort return empty string instead of [object Object]
            return '';
        }
        return String(value);
    }

    // Apply text styles
    function applyTextStyles(content, textStyle) {
        if (!textStyle) return escapeHtml(content);
        
        let styledContent = escapeHtml(content);
        let styles = [];
        let tags = [];

        // Bold text
        if (textStyle.bold) {
            tags.push('strong');
        }

        // Italic
        if (textStyle.italic) {
            tags.push('em');
        }

        // Underline
        if (textStyle.underline) {
            tags.push('u');
        }

        // Strikethrough text
        if (textStyle.strikethrough) {
            tags.push('s');
        }

        // Text color
        if (textStyle.foregroundColor?.color?.rgbColor) {
            const color = rgbToHex(textStyle.foregroundColor.color.rgbColor);
            if (color && color !== '#000000') {
                styles.push(`color: ${color}`);
            }
        }

        // Background color
        if (textStyle.backgroundColor?.color?.rgbColor) {
            const bgColor = rgbToHex(textStyle.backgroundColor.color.rgbColor);
            if (bgColor && bgColor !== '#ffffff') {
                styles.push(`background-color: ${bgColor}`);
            }
        }

        // Font size
        if (textStyle.fontSize?.magnitude) {
            styles.push(`font-size: ${textStyle.fontSize.magnitude}pt`);
        }

        // Font family
        if (textStyle.weightedFontFamily?.fontFamily) {
            styles.push(`font-family: "${textStyle.weightedFontFamily.fontFamily}"`);
        }

        // Wrap in tags
        for (const tag of tags) {
            styledContent = `<${tag}>${styledContent}</${tag}>`;
        }

        // Apply inline styles
        if (styles.length > 0) {
            styledContent = `<span style="${styles.join('; ')}">${styledContent}</span>`;
        }

        return styledContent;
    }

    // Link processing
    function processLink(content, textStyle) {
        if (textStyle?.link?.url) {
            const styledContent = applyTextStyles(content, {...textStyle, link: undefined});
            return `<a href="${escapeHtml(textStyle.link.url)}" target="_blank">${styledContent}</a>`;
        }
        return applyTextStyles(content, textStyle);
    }

    // Process paragraph elements
    function processTextElements(elements) {
        let result = '';
        
        for (const element of elements) {
            if (element.textRun) {
                let content = element.textRun.content;
                
                // Process line breaks - remove trailing newlines
                while (content.endsWith('\n') || content.endsWith('\\n')) {
                    if (content.endsWith('\\n')) {
                        content = content.slice(0, -2);
                    } else if (content.endsWith('\n')) {
                        content = content.slice(0, -1);
                    }
                }
                
                if (content) {
                    // First apply text styles (which will escape HTML)
                    const linkResult = processLink(content, element.textRun.textStyle);
                    // Then replace newlines with <br> (after escaping)
                    const processedResult = safeToString(linkResult)
                        .replace(/\\n/g, '<br>')
                        .replace(/\n/g, '<br>');
                    result += processedResult;
                }
            } else if (element.inlineObjectElement) {
                // Process inline objects (images, etc.) - create placeholder
                const inlineObjectId = element.inlineObjectElement.inlineObjectId;
                
                // Get image data from inlineObjects if available
                let altText = '';
                let contentUri = '';
                if (inlineObjects && inlineObjects[inlineObjectId]) {
                    const embeddedObject = inlineObjects[inlineObjectId].inlineObjectProperties?.embeddedObject;
                    if (embeddedObject) {
                        altText = embeddedObject.description || embeddedObject.title || '';
                        contentUri = embeddedObject.imageProperties?.contentUri || '';
                        
                        // Add to images array if it's actually an image
                        if (contentUri) {
                            images.push({
                                id: inlineObjectId,
                                contentUri: contentUri,
                                alt: altText,
                                title: embeddedObject.title || ''
                            });
                        }
                    }
                }
                
                // Create image placeholder
                result += `[[IMG:${inlineObjectId}|${altText}]]`;
            }
        }
        
        return result;
    }

    // List processing with multi-level support
    function handleList(paragraph) {
        const bullet = paragraph.bullet;
        if (!bullet) return null;

        const listId = bullet.listId;
        const nestingLevel = bullet.nestingLevel || 0;
        
        // Handle different list or different nesting level
        if (currentListId !== listId || currentNestingLevel !== nestingLevel) {
            
            // If it's a completely different list, close all open lists
            if (currentListId !== listId) {
                while (openListTags.length > 0) {
                    html += `</${openListTags.pop()}>`;
                }
                currentNestingLevel = -1;
            }
            
            // Handle nesting level changes
            if (nestingLevel > currentNestingLevel) {
                // Going deeper - open new nested lists
                while (currentNestingLevel < nestingLevel) {
                    currentNestingLevel++;
                    const listTag = getListType(listId, documentLists, currentNestingLevel);
                    html += `<${listTag}>`;
                    openListTags.push(listTag);
                }
            } else if (nestingLevel < currentNestingLevel) {
                // Going up - close nested lists
                while (currentNestingLevel > nestingLevel) {
                    if (openListTags.length > 0) {
                        html += `</${openListTags.pop()}>`;
                    }
                    currentNestingLevel--;
                }
            }
            
            currentListId = listId;
            currentNestingLevel = nestingLevel;
        }

        return true;
    }

    // Determine if list is numbered (ol) or bulleted (ul) based on nesting level
    function getListType(listId, lists, level = 0) {
        if (!lists || !lists[listId]) {
            return 'ul'; // Default to bulleted list
        }
        
        const listProperties = lists[listId].listProperties;
        if (!listProperties || !listProperties.nestingLevels) {
            return 'ul';
        }
        
        // Get the appropriate nesting level, fallback to level 0 if specific level not found
        const nestingLevelIndex = Math.min(level, listProperties.nestingLevels.length - 1);
        const nestingLevel = listProperties.nestingLevels[nestingLevelIndex];
        
        if (!nestingLevel) {
            return 'ul';
        }
        
        // Check for glyph symbol first - if present, it's always bulleted
        if (nestingLevel.glyphSymbol) {
            return 'ul';
        }
        
        // Check glyphType - this is the most reliable indicator for numbered lists
        if (nestingLevel.glyphType) {
            switch (nestingLevel.glyphType) {
                case 'DECIMAL':
                case 'ZERO_DECIMAL':
                case 'ALPHA':
                case 'UPPER_ALPHA':
                case 'ROMAN':
                case 'UPPER_ROMAN':
                    return 'ol';
                case 'GLYPH_TYPE_UNSPECIFIED':
                    return 'ul'; // Always bulleted for unspecified type
                default:
                    break;
            }
        }
        
        return 'ul'; // Default to bulleted
    }

    // Determine heading type
    function getHeadingTag(namedStyleType) {
        switch (namedStyleType) {
            case 'HEADING_1': return 'h1';
            case 'HEADING_2': return 'h2';
            case 'HEADING_3': return 'h3';
            case 'HEADING_4': return 'h4';
            case 'HEADING_5': return 'h5';
            case 'HEADING_6': return 'h6';
            default: return null;
        }
    }

    // Process paragraphs
    function processParagraph(paragraphData) {
        const paragraph = paragraphData.paragraph;
        const elements = paragraph.elements || [];
        const paragraphStyle = paragraph.paragraphStyle || {};
        
        const content = processTextElements(elements);
        if (!content.trim()) return '';

        // Check if this is a list item
        if (handleList(paragraph)) {
            return `<li>${content}</li>`;
        } else {
            // Close open lists if this is not a list item
            while (openListTags.length > 0) {
                html += `</${openListTags.pop()}>`;
            }
            currentListId = null;
        }

        // Check heading type
        const headingTag = getHeadingTag(paragraphStyle.namedStyleType);
        if (headingTag) {
            let styles = [];
            
            // Alignment for headings
            if (paragraphStyle.alignment && paragraphStyle.alignment !== 'START') {
                const alignment = paragraphStyle.alignment.toLowerCase();
                styles.push(`text-align: ${alignment}`);
            }
            
            const styleAttr = styles.length > 0 ? ` style="${styles.join('; ')}"` : '';
            return `<${headingTag}${styleAttr}>${content}</${headingTag}>`;
        }

        // Regular paragraph
        let styles = [];
        
        // Text alignment
        if (paragraphStyle.alignment && paragraphStyle.alignment !== 'START') {
            const alignment = paragraphStyle.alignment.toLowerCase();
            styles.push(`text-align: ${alignment}`);
        }

        // Line spacing
        if (paragraphStyle.lineSpacing && paragraphStyle.lineSpacing !== 100) {
            styles.push(`line-height: ${paragraphStyle.lineSpacing / 100}`);
        }

        // Indentation
        if (paragraphStyle.indentStart?.magnitude) {
            styles.push(`margin-left: ${paragraphStyle.indentStart.magnitude}pt`);
        }
        
        if (paragraphStyle.spaceAbove?.magnitude) {
            styles.push(`margin-top: ${paragraphStyle.spaceAbove.magnitude}pt`);
        }
        
        if (paragraphStyle.spaceBelow?.magnitude) {
            styles.push(`margin-bottom: ${paragraphStyle.spaceBelow.magnitude}pt`);
        }

        const styleAttr = styles.length > 0 ? ` style="${styles.join('; ')}"` : '';
        return `<p${styleAttr}>${content}</p>`;
    }

    // Table processing
    function processTable(tableData) {
        const table = tableData.table;
        let tableHtml = '<table style="border-collapse: collapse; width: 100%; margin: 16px 0;">';
        
        for (let rowIndex = 0; rowIndex < table.tableRows.length; rowIndex++) {
            const row = table.tableRows[rowIndex];
            tableHtml += '<tr>';
            
            for (let cellIndex = 0; cellIndex < row.tableCells.length; cellIndex++) {
                const cell = row.tableCells[cellIndex];
                const cellContent = cell.content || [];
                let cellHtml = '';
                
                // Process cell content
                let tempListId = currentListId;
                let tempOpenTags = [...openListTags];
                let tempNestingLevel = currentNestingLevel;
                currentListId = null;
                openListTags = [];
                currentNestingLevel = -1;
                
                for (const cellItem of cellContent) {
                    if (cellItem.paragraph) {
                        const paragraph = cellItem.paragraph;
                        const elements = paragraph.elements || [];
                        const content = processTextElements(elements);
                        
                        if (!content.trim()) continue;
                        
                        // Check if this is a list item inside table
                        if (paragraph.bullet) {
                            const bulletListId = paragraph.bullet.listId;
                            const bulletNestingLevel = paragraph.bullet.nestingLevel || 0;
                            
                            if (currentListId !== bulletListId || currentNestingLevel !== bulletNestingLevel) {
                                // If it's a completely different list, close all open lists
                                if (currentListId !== bulletListId) {
                                    while (openListTags.length > 0) {
                                        cellHtml += `</${openListTags.pop()}>`;
                                    }
                                    currentNestingLevel = -1;
                                }
                                
                                // Handle nesting level changes
                                if (bulletNestingLevel > currentNestingLevel) {
                                    // Going deeper - open new nested lists
                                    while (currentNestingLevel < bulletNestingLevel) {
                                        currentNestingLevel++;
                                        const listTag = getListType(bulletListId, documentLists, currentNestingLevel);
                                        cellHtml += `<${listTag}>`;
                                        openListTags.push(listTag);
                                    }
                                } else if (bulletNestingLevel < currentNestingLevel) {
                                    // Going up - close nested lists
                                    while (currentNestingLevel > bulletNestingLevel) {
                                        if (openListTags.length > 0) {
                                            cellHtml += `</${openListTags.pop()}>`;
                                        }
                                        currentNestingLevel--;
                                    }
                                }
                                
                                currentListId = bulletListId;
                                currentNestingLevel = bulletNestingLevel;
                            }
                            cellHtml += `<li>${safeToString(content)}</li>`;
                        } else {
                            // Close lists if this is not a list item
                            while (openListTags.length > 0) {
                                cellHtml += `</${openListTags.pop()}>`;
                            }
                            currentListId = null;
                            
                            // Determine heading type
                            const headingTag = getHeadingTag(paragraph.paragraphStyle?.namedStyleType);
                            if (headingTag) {
                                cellHtml += `<${headingTag}>${safeToString(content)}</${headingTag}>`;
                            } else {
                                cellHtml += safeToString(content);
                                if (cellIndex < row.tableCells.length - 1 || rowIndex < table.tableRows.length - 1) {
                                    cellHtml += '<br>';
                                }
                            }
                        }
                    }
                }
                
                // Close remaining lists in cell
                while (openListTags.length > 0) {
                    cellHtml += `</${openListTags.pop()}>`;
                }
                
                // Restore list state
                currentListId = tempListId;
                openListTags = tempOpenTags;
                currentNestingLevel = tempNestingLevel;
                
                // Remove extra <br> at the end
                cellHtml = cellHtml.replace(/<br>$/, '');
                
                // Cell styles
                const cellStyle = cell.tableCellStyle || {};
                let cellStyles = ['border: 1px solid #ddd', 'padding: 8px', 'vertical-align: top'];
                
                // Content alignment
                if (cellStyle.contentAlignment) {
                    const alignment = cellStyle.contentAlignment.toLowerCase();
                    if (alignment === 'center') {
                        cellStyles.push('text-align: center');
                    } else if (alignment === 'right') {
                        cellStyles.push('text-align: right');
                    }
                }

                // Indentation
                if (cellStyle.paddingLeft?.magnitude) {
                    cellStyles.push(`padding-left: ${cellStyle.paddingLeft.magnitude}pt`);
                }
                if (cellStyle.paddingRight?.magnitude) {
                    cellStyles.push(`padding-right: ${cellStyle.paddingRight.magnitude}pt`);
                }
                if (cellStyle.paddingTop?.magnitude) {
                    cellStyles.push(`padding-top: ${cellStyle.paddingTop.magnitude}pt`);
                }
                if (cellStyle.paddingBottom?.magnitude) {
                    cellStyles.push(`padding-bottom: ${cellStyle.paddingBottom.magnitude}pt`);
                }

                // Background color
                if (cellStyle.backgroundColor?.color?.rgbColor) {
                    const bgColor = rgbToHex(cellStyle.backgroundColor.color.rgbColor);
                    if (bgColor && bgColor !== '#ffffff') {
                        cellStyles.push(`background-color: ${bgColor}`);
                    }
                }

                const cellStyleAttr = ` style="${cellStyles.join('; ')}"`;
                
                // Cell merging
                const colspan = cellStyle.columnSpan > 1 ? ` colspan="${cellStyle.columnSpan}"` : '';
                const rowspan = cellStyle.rowSpan > 1 ? ` rowspan="${cellStyle.rowSpan}"` : '';
                
                // Determine cell tag (th for headers)
                const isHeader = rowIndex === 0 && cellHtml.includes('<strong>');
                const cellTag = isHeader ? 'th' : 'td';
                
                tableHtml += `<${cellTag}${colspan}${rowspan}${cellStyleAttr}>${cellHtml || '&nbsp;'}</${cellTag}>`;
            }
            
            tableHtml += '</tr>';
        }
        
        tableHtml += '</table>';
        return tableHtml;
    }

    // Main document structure processing
    if (!Array.isArray(docStructure)) {
        throw new Error('Document structure must be an array');
    }

    for (const item of docStructure) {
        if (item.paragraph) {
            const paragraphHtml = processParagraph(item);
            html += paragraphHtml;
        } else if (item.table) {
            // Close open lists before table
            while (openListTags.length > 0) {
                html += `</${openListTags.pop()}>`;
            }
            currentListId = null;
            currentNestingLevel = -1;
            
            html += processTable(item);
        } else if (item.sectionBreak) {
            // Section break processing
            if (item.sectionBreak.sectionStyle?.sectionType === 'NEXT_PAGE') {
                html += '<div style="page-break-before: always;"></div>';
            }
        }
    }

    // Close all open lists at the end
    while (openListTags.length > 0) {
        html += `</${openListTags.pop()}>`;
    }

    return {
        html: html,
        images: images
    };
}

// Function for basic HTML cleanup for WordPress
function cleanHtmlForWordPress(html) {
    return html
        // Remove all inline styles
        .replace(/\s+style="[^"]*"/g, '')
        // Remove data attributes
        .replace(/\s+data-[^=]*="[^"]*"/g, '')
        // Simplify span tags without attributes
        .replace(/<span>([^<]*)<\/span>/g, '$1')
        // Remove empty span tags
        .replace(/<span[^>]*><\/span>/g, '')
        // Remove extra spaces
        .replace(/\s+/g, ' ')
        // Remove spaces at the beginning and end of tags
        .replace(/>\s+</g, '><')
        // Add rel="noopener" to external links
        .replace(/<a href="([^"]*)" target="_blank"/g, '<a href="$1" target="_blank" rel="noopener"');
}

// Function for ultra HTML cleanup for WordPress
function ultraCleanHtmlForWordPress(html) {
    return html
        // Remove ALL attributes except href for links
        .replace(/<([^a\/][^>]*?)\s+[^>]*?>/g, '<$1>')
        .replace(/<\/([^>]+)\s+[^>]*?>/g, '</$1>')
        // Restore links with href
        .replace(/<a[^>]*href="([^"]*)"[^>]*>/g, '<a href="$1">')
        // Remove all span tags, keeping content
        .replace(/<span[^>]*>/g, '')
        .replace(/<\/span>/g, '')
        // Remove all div tags, keeping content
        .replace(/<div[^>]*>/g, '')
        .replace(/<\/div>/g, '')
        // Remove empty paragraphs
        .replace(/<p[^>]*>\s*<\/p>/g, '')
        // Remove extra spaces and line breaks
        .replace(/\s+/g, ' ')
        .replace(/>\s+</g, '><')
        .trim();
}

// Function for maximum cleanup - only safe tags
function wordPressSafeTagsOnly(html) {
    // List of allowed WordPress tags
    const allowedTags = [
        'p', 'br', 'strong', 'em', 'b', 'i', 'u', 's', 
        'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
        'ul', 'ol', 'li',
        'table', 'tr', 'td', 'th', 'thead', 'tbody',
        'a', 'img',
        'blockquote', 'pre', 'code'
    ];
    
    // Remove all disallowed tags
    let cleaned = html.replace(/<\/?([a-zA-Z0-9]+)[^>]*>/g, (match, tagName) => {
        const tag = tagName.toLowerCase();
        if (!allowedTags.includes(tag)) {
            return ''; // Remove disallowed tag
        }
        
        // For allowed tags remove attributes (except href for links)
        if (tag === 'a' && match.includes('href=')) {
            const href = match.match(/href="([^"]*)"/);
            return href ? `<${match.startsWith('</') ? '/' : ''}a${href ? ` href="${href[1]}"` : ''}>` : `<${match.startsWith('</') ? '/' : ''}a>`;
        }
        
        return `<${match.startsWith('</') ? '/' : ''}${tag}>`;
    });
    
    return cleaned
        .replace(/\s+/g, ' ')
        .replace(/>\s+</g, '><')
        .trim();
}

// Function for proper table cell correction
function fixTableCells(html) {
    return html.replace(/<(td|th)>(.*?)<\/\1>/gs, (match, tag, content) => {
        content = content.trim();
        
        if (!content) {
            return `<${tag}><p></p></${tag}>`;
        }
        
        if (content.startsWith('<p>')) {
            return match;
        }
        
        if (content.startsWith('<ul') || content.startsWith('<ol')) {
            return `<${tag}>${content}</${tag}>`;
        }
        
        return `<${tag}><p>${content}</p></${tag}>`;
    });
}

// WordPress-compatible cleanup based on working example
function wordPressCompatibleClean(html) {
    let cleaned = html
        // CRITICAL: Remove ALL HTML comments (ModSecurity blocks)
        .replace(/<!--[\s\S]*?-->/g, '')
        
        // Remove all inline styles and attributes except basic ones
        .replace(/\s+style="[^"]*"/g, '')
        .replace(/\s+class="[^"]*"/g, '')
        .replace(/\s+id="[^"]*"/g, '')
        .replace(/\s+data-[^=]*="[^"]*"/g, '')
        
        // Simplify tables - only border="1"
        .replace(/<table[^>]*>/g, '<table border="1">')
        .replace(/<tr[^>]*>/g, '<tr>')
        .replace(/<td[^>]*>/g, '<td>')
        .replace(/<th[^>]*>/g, '<th>')
        
        // Replace <strong> with <b>, <em> with <i>
        .replace(/<strong>/g, '<b>')
        .replace(/<\/strong>/g, '</b>')
        .replace(/<em>/g, '<i>')
        .replace(/<\/em>/g, '</i>')
        
        // Remove span tags, keeping content
        .replace(/<span[^>]*>/g, '')
        .replace(/<\/span>/g, '')
        
        // Remove potentially dangerous attributes (ModSecurity protection)
        .replace(/\s+onclick="[^"]*"/gi, '')
        .replace(/\s+onload="[^"]*"/gi, '')
        .replace(/\s+onerror="[^"]*"/gi, '')
        .replace(/\s+onmouseover="[^"]*"/gi, '')
        .replace(/javascript:/gi, 'blocked:')
        
        // Add rel="noopener" to links if not present
        .replace(/<a href="([^"]*)" target="_blank"(?![^>]*rel=)/g, '<a href="$1" target="_blank" rel="noopener"')
        
        // Remove extra spaces (including newlines inside tags)
        .replace(/ +/g, ' ')
        .replace(/>\s+</g, '><')
        .replace(/\n/g, '')
        .trim();
    
    // CRITICAL: Fix table cell structure
    return fixTableCells(cleaned);
}

// ===== CODE FOR USE IN n8n =====
// Uncomment and adapt to your data:

try {
    // Google Docs API response structure
    const documentStructure = $json.body?.content;
    const documentLists = $json.lists;
    const inlineObjects = $json.inlineObjects;
    
    if (!Array.isArray(documentStructure)) {
        throw new Error('Expected body.content array. Received: ' + JSON.stringify(Object.keys($json)));
    }
    
    const result = convertGoogleDocsToHtml(documentStructure, documentLists, inlineObjects);
    const html = result.html;
    const images = result.images;
    
    // ===== CLEANUP LEVEL CONFIGURATION =====
    // Change cleanLevel value to select cleanup level:
    // 'none' - no cleanup (original HTML with styles)
    // 'basic' - basic cleanup (removes styles but keeps structure)
    // 'ultra' - ultra cleanup (removes all attributes and extra tags)
    // 'safe' - only safe tags (maximum compatibility)
    // 'wordpress' - WordPress-compatible (as in working example)
    
    const cleanLevel = 'wordpress'; // <-- CHANGE HERE
    
    let cleanHtml = html;
    let cleanType = 'none';
    
    switch(cleanLevel) {
        case 'basic':
            cleanHtml = cleanHtmlForWordPress(html);
            cleanType = 'basic';
            break;
        case 'ultra':
            cleanHtml = ultraCleanHtmlForWordPress(html);
            cleanType = 'ultra';
            break;
        case 'safe':
            cleanHtml = wordPressSafeTagsOnly(html);
            cleanType = 'safe';
            break;
        case 'wordpress':
            cleanHtml = wordPressCompatibleClean(html);
            cleanType = 'wordpress';
            break;
        default:
            cleanHtml = html;
            cleanType = 'none';
    }
    
    return {
        html: cleanHtml,           // Cleaned HTML (level depends on setting)
        htmlRaw: html,            // Original HTML with all styles
        htmlBasic: cleanHtmlForWordPress(html),      // Basic cleanup
        htmlUltra: ultraCleanHtmlForWordPress(html), // Ultra cleanup
        htmlSafe: wordPressSafeTagsOnly(html),       // Only safe tags
        htmlWordPress: wordPressCompatibleClean(html), // WordPress-compatible
        images: images,           // Array of images with URLs and metadata
        success: true,
        cleanLevel: cleanType,
        elementsCount: documentStructure.length,
        htmlLength: cleanHtml.length,
        rawHtmlLength: html.length,
        reductionPercent: Math.round((1 - cleanHtml.length / html.length) * 100)
    };
    
} catch (error) {
    return {
        html: '',
        success: false,
        error: error.message,
        receivedData: typeof $json.body,
        availableKeys: $json ? Object.keys($json) : 'no $json'
    };
}
