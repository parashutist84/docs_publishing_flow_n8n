# 🧹 HTML Cleanup Levels Guide for WordPress

## 📊 Test Results:

| Level | Size | Reduction | Description |
|-------|------|-----------|-------------|
| 🔵 **Original** | 8196 chars | 0% | Full styles and attributes |
| 🟢 **Basic** | 4010 chars | **51%** | Removes inline styles |
| 🟡 **Ultra** | 3375 chars | **59%** | Removes all attributes |
| 🔴 **Safe** | 3424 chars | **58%** | Only allowed tags |
| 🟣 **WordPress** | ~3500 chars | **57%** | WordPress-compatible |

## 🎯 How to Choose Level in n8n:

In the `n8n-google-docs-converter.js` file, find the line:
```javascript
const cleanLevel = 'wordpress'; // <-- CHANGE HERE
```

### 🟣 WordPress Compatible (`'wordpress'`) - **RECOMMENDED (DEFAULT)**
```javascript
const cleanLevel = 'wordpress';
```
- ✅ Removes ALL HTML comments (ModSecurity protection)
- ✅ Removes inline styles and dangerous attributes
- ✅ Simplifies tables with basic borders
- ✅ Replaces `<strong>` with `<b>`, `<em>` with `<i>`
- ✅ Adds `rel="noopener"` to links
- ✅ Fixes table cell structure
- 📉 Reduces by **~57%**

**Use when:** Working with WordPress (default choice)

### 🟢 Basic Cleanup (`'basic'`) - **FOR SIMPLE CASES**
```javascript
const cleanLevel = 'basic';
```
- ✅ Removes inline styles (`style="..."`)
- ✅ Removes data attributes
- ✅ Preserves table structure
- ✅ Keeps links working
- 📉 Reduces by **51%**

**Use when:** You get 403 errors due to inline styles

### 🟡 Ultra Cleanup (`'ultra'`) - **FOR PROBLEMATIC CASES**
```javascript
const cleanLevel = 'ultra';
```
- ✅ Removes ALL tag attributes
- ✅ Removes span and div tags
- ✅ Maximally simplifies HTML
- ⚠️ May lose some formatting
- 📉 Reduces by **59%**

**Use when:** Basic cleanup didn't help

### 🔴 Safe Tags Only (`'safe'`) - **LAST RESORT**
```javascript
const cleanLevel = 'safe';
```
- ✅ Only allowed WordPress tags
- ✅ Maximum compatibility
- ❌ May remove important elements
- 📉 Reduces by **58%**

**Use when:** Nothing else works

### 🔵 No Cleanup (`'none'`) - **FOR TESTING**
```javascript
const cleanLevel = 'none';
```
- Original HTML with all styles
- For testing or special cases

## 🎛️ Access to All Variants:

The converter returns ALL variants simultaneously:
```javascript
{
    html: cleanHtml,           // Selected cleanup level
    htmlRaw: html,            // Original with styles
    htmlBasic: basicClean,    // Basic cleanup
    htmlUltra: ultraClean,    // Ultra cleanup
    htmlSafe: safeClean,      // Only safe tags
    htmlWordPress: wpClean,   // WordPress-compatible
    cleanLevel: 'wordpress',  // Current level
    reductionPercent: 57      // Reduction percentage
}
```

You can use any of them in WordPress requests:
- `$json.html` - selected level
- `$json.htmlBasic` - always basic cleanup
- `$json.htmlUltra` - always ultra cleanup
- `$json.htmlWordPress` - always WordPress-compatible

## 🚨 Problem Diagnosis:

1. **403 error** → Try `'ultra'` or `'wordpress'`
2. **Lost formatting** → Go back to `'basic'`
3. **Tables broken** → Use `'basic'` or `'wordpress'`
4. **Links not working** → Check `'safe'`
5. **ModSecurity blocked** → Use `'wordpress'` (removes HTML comments)

## 💡 Recommendations:

1. **Start with `'wordpress'`** - solves 95% of problems (default)
2. **If still getting 403** → `'ultra'`
3. **For maximum compatibility** → `'safe'`
4. **Keep original** in `htmlRaw` just in case
5. **For debugging** → Use `'none'` to see original output

## 🔧 Advanced Features:

### ModSecurity Protection
The `'wordpress'` level includes special protection against ModSecurity WAF:
- Removes ALL HTML comments
- Removes potentially dangerous attributes (`onclick`, `onload`, etc.)
- Blocks `javascript:` in URLs
- Fixes table cell structure for WordPress compatibility

### Multiple Output Formats
Every conversion provides multiple HTML versions, so you can:
- Use `htmlWordPress` for WordPress posts
- Use `htmlBasic` for general web content
- Use `htmlRaw` for debugging
- Use `htmlSafe` for maximum security

### Automatic Detection
The converter automatically:
- Detects different Google Docs API response formats
- Handles various data structures
- Provides detailed error information
- Reports size reduction statistics