# Google Docs to HTML Converter for n8n

This converter transforms raw JSON structure from Google Docs into valid HTML, preserving all formatting.

## Features

✅ **Text Styles**: bold, italic, underline, strikethrough, colors, font sizes  
✅ **Headings**: H1-H6 with hierarchy preservation  
✅ **Paragraphs**: with alignment, indentation, line spacing  
✅ **Lists**: bulleted and numbered, including nested  
✅ **Tables**: with cell merging, styles, borders  
✅ **Links**: external links with proper attributes  
✅ **Mixed Content**: lists inside tables, links in headings, etc.  

## Usage in n8n

### Step 1: Get Data from Google Docs API
Use HTTP Request node to fetch the document:
```
GET https://docs.googleapis.com/v1/documents/{documentId}
Authorization: Bearer {your_token}
```

### Step 2: Add Code Node
1. Add **Function Item** node after HTTP Request
2. Copy the contents of `n8n-google-docs-converter.js`
3. The code is ready to use with the try-catch block at the end
4. The script automatically handles different data structure variants

### Step 3: Use the Result
The converter returns multiple HTML versions and metadata:

```javascript
{
    html: cleanHtml,           // Cleaned HTML (level depends on cleanLevel setting)
    htmlRaw: html,            // Original HTML with all styles
    htmlBasic: basicClean,    // Basic cleanup (removes inline styles)
    htmlUltra: ultraClean,    // Ultra cleanup (removes all attributes)
    htmlSafe: safeClean,      // Only safe tags (maximum compatibility)
    htmlWordPress: wpClean,   // WordPress-compatible cleanup
    success: true,
    cleanLevel: 'wordpress',  // Current cleanup level
    elementsCount: 42,        // Number of processed elements
    htmlLength: 1234,         // Length of cleaned HTML
    rawHtmlLength: 5678,      // Length of original HTML
    reductionPercent: 78      // Percentage reduction from original
}
```

## Cleanup Levels

The converter offers 5 cleanup levels (configurable via `cleanLevel` variable):

- **'none'** - No cleanup (original HTML with all styles)
- **'basic'** - Basic cleanup (removes inline styles but keeps structure)
- **'ultra'** - Ultra cleanup (removes all attributes and extra tags)
- **'safe'** - Only safe tags (maximum compatibility)
- **'wordpress'** - WordPress-compatible (recommended, default)

## Example Results

### Input Data (Google Docs JSON):
```json
[
  {
    "paragraph": {
      "elements": [
        {
          "textRun": {
            "content": "Document Title\n",
            "textStyle": {
              "bold": true,
              "fontSize": { "magnitude": 18, "unit": "PT" }
            }
          }
        }
      ],
      "paragraphStyle": {
        "namedStyleType": "HEADING_1"
      }
    }
  }
]
```

### Output Data (HTML):
```html
<h1><b>Document Title</b></h1>
```

## Supported Elements

### Text Styles
- **Bold text**: `<b>` or `<strong>`
- *Italic*: `<i>` or `<em>`
- <u>Underlined</u>: `<u>`
- ~~Strikethrough~~: `<s>`
- Text and background colors: `style="color: #hex; background-color: #hex"`
- Font sizes: `style="font-size: Npt"`

### Structural Elements
- Headings: `<h1>` - `<h6>`
- Paragraphs: `<p>` with alignment and indentation
- Lists: `<ul><li>` and `<ol><li>`
- Tables: `<table><tr><td>` with cell merging

### Interactive Elements
- Links: `<a href="url" target="_blank" rel="noopener">`
- Inline objects: `<!-- comments -->`

## Error Handling

The function includes error handling and returns:
```javascript
{
    html: '',
    success: false,
    error: "error message if failed",
    receivedData: "object",
    availableKeys: ["body", "documentId", ...]
}
```

## Data Structure Detection

The converter automatically detects and handles different data structures:
- `$json.body.content` (standard Google Docs API response)
- `$json.content` (if content is at top level)
- `$json.body` (if body is already an array)
- Auto-detection in body object

## Limitations

- Images are replaced with comments (requires additional processing via Google Drive API)
- Complex table styles are simplified to basic CSS
- Some Google Docs-specific elements may not be supported
- ModSecurity protection removes potentially dangerous attributes

## Troubleshooting

If you encounter issues, check:
1. Input data structure correctness
2. Presence of `body.content` field in Google Docs API response
3. Document access permissions
4. Try different cleanup levels if WordPress rejects the HTML

The function has been tested on real Google Docs documents and correctly handles complex structures with nested elements.