console.log($node['Convert Google DOCS to HTML'].json)
const converterResult = $node['Convert Google DOCS to HTML'].json;

const html = converterResult.htmlWordPress;
const images = converterResult.images || [];

return images
  .filter(image => !image.omit_upload)
  .map((image, index) => ({
  id: image.id,
  contentUri: image.contentUri,
  alt: image.alt,
  title: image.title,
  
  fileName: (() => {
    const baseName = image.title || image.alt || `image-${image.id}`;
    
    let extension = '.jpg';
    if (image.contentUri) {
      const url = image.contentUri.toLowerCase();
      if (url.includes('.png') || url.includes('png')) extension = '.png';
      else if (url.includes('.gif') || url.includes('gif')) extension = '.gif';
      else if (url.includes('.webp') || url.includes('webp')) extension = '.webp';
      else if (url.includes('.svg') || url.includes('svg')) extension = '.svg';
      else if (url.includes('.bmp') || url.includes('bmp')) extension = '.bmp';
    }

    const cleanName = baseName
      .replace(/[^\w\s\-]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/\s/g, '-')
      .replace(/\-+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 95)
      .toLowerCase();
    
    return cleanName + extension;
  })()
}));