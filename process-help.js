// Проверяем условие isHelp
if ($node['Webhook'].json.body.isHelp !== true) {
    return $input.all();
  }
  
  // Функция для оборачивания блоков в div
  function wrapBlocksInDivs(html) {
    // Регулярное выражение для поиска заголовков
    const headerRegex = /(<h[1-6][^>]*>.*?<\/h[1-6]>)/gi;
    
    // Разбиваем HTML по заголовкам, сохраняя сами заголовки
    const parts = html.split(headerRegex);
    
    const blocks = [];
    let currentBlock = '';
    
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i].trim();
      if (!part) continue;
      
      // Проверяем, является ли часть заголовком
      if (headerRegex.test(part)) {
        headerRegex.lastIndex = 0; // Сброс индекса
        
        // Если есть накопленный блок, сохраняем его
        if (currentBlock) {
          blocks.push(`<div>\n${currentBlock}\n</div>`);
        }
        
        // Начинаем новый блок с заголовка
        currentBlock = part;
      } else {
        // Добавляем контент к текущему блоку
        if (currentBlock) {
          currentBlock += '\n' + part;
        } else {
          // Это текст в начале документа без заголовка
          currentBlock = part;
        }
      }
    }
    
    // Добавляем последний блок
    if (currentBlock) {
      blocks.push(`<div>\n${currentBlock}\n</div>`);
    }
    
    return blocks.join('\n');
  }
  
  // Обрабатываем каждый элемент входных данных
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