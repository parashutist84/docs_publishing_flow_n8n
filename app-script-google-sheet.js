function onEditTrigger(e) {
    try {
      var sheet = e.source.getActiveSheet();
      var range = e.range;
  
      if (range.getColumn() !== 5) return;
  
      var newVal = range.getValue();
  
      if (newVal === true) {
        var row = range.getRow();
        var docInput = sheet.getRange(row, 1).getValue();
        var s = String(docInput).trim();
        var i = s.indexOf('/d/');
        var docId = i !== -1 ? s.slice(i + 3).split('/')[0] : s;
        var title = sheet.getRange(row, 2).getValue();
        var slug = sheet.getRange(row, 3).getValue();
        var isHelp = sheet.getRange(row, 4).getValue();
  
        var url = "https://parashutist841.app.n8n.cloud/webhook-test/61193a00-dce7-4d57-bc8c-75789846daae"; // test url
        //var url = "https://parashutist.app.n8n.cloud/webhook/61193a00-dce7-4d57-bc8c-75789846daae";// production url
        var payload = { 
          docId: docId,
          title: title,
          slug: slug,
          isHelp: isHelp,
          spreadsheetId: e.source.getId(),
          sheetName: sheet.getName(),
          row: row
        };
  
        var options = {
          method: "post",
          contentType: "application/json",
          payload: JSON.stringify(payload),
          muteHttpExceptions: true,
        };
  
        var resp = UrlFetchApp.fetch(url, options);
        sheet.getRange(row, 6).setValue("Sent: " + resp.getResponseCode());
      } else {
        // If checkbox was unchecked
        sheet.getRange(range.getRow(), 6).setValue("Not sent");
      }
    } catch (err) {
      sheet.getRange(1,1).setValue("ERR: " + err.message);
    }
  }