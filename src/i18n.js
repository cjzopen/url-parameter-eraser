document.addEventListener('DOMContentLoaded', () => {
  const page = document.body.dataset.page;

  const i18nMessages = {
    popup: () => {
      document.title = chrome.i18n.getMessage('popupTitle');
      document.querySelector('#popupTitle').textContent = chrome.i18n.getMessage('popupTitle');
      document.querySelector('#options').textContent = chrome.i18n.getMessage('popupOptionsButton');
      document.querySelector('#info').textContent = chrome.i18n.getMessage('popupInfoButton');
      document.querySelector('#dynamic-monitoring-text').textContent = chrome.i18n.getMessage('dynamicMonitoringCheckbox');
      document.querySelector('#allfunction-text').textContent = chrome.i18n.getMessage('allFunctionCheckbox');
    },
    info: () => {
      document.title = chrome.i18n.getMessage('infoTitle');
      document.querySelector('#infoTitle').textContent = chrome.i18n.getMessage('infoTitle');
      document.querySelector('#infoDescription').textContent = chrome.i18n.getMessage('infoDescription');
      document.querySelector('#infoPrivacyTitle').textContent = chrome.i18n.getMessage('infoPrivacyTitle');
      document.querySelector('#infoPrivacyDescription').textContent = chrome.i18n.getMessage('infoPrivacyDescription');
      document.querySelector('#infoContact').textContent = chrome.i18n.getMessage('infoContact');
      document.querySelector('#funcDescription').textContent = chrome.i18n.getMessage('funcDescription');
    },
    options: () => {
      document.title = chrome.i18n.getMessage('optionsTitle');
      document.querySelector('h1').textContent = chrome.i18n.getMessage('optionsTitle');
      document.querySelector('label[for="customParams"]').textContent = chrome.i18n.getMessage('optionsAddLabel');
      document.getElementById('add').textContent = chrome.i18n.getMessage('optionsAddButton');
      // i18n for customParamsNote
      const noteLabel = document.querySelector('label[for="customParamsNote"]');
      if (noteLabel) noteLabel.textContent = chrome.i18n.getMessage('optionsNoteLabel');
      const noteInput = document.getElementById('customParamsNote');
      if (noteInput) noteInput.placeholder = chrome.i18n.getMessage('optionsNotePlaceholder');
      // i18n for customParamsDomain
      const domainLabel = document.querySelector('label[for="customParamsDomain"]');
      if (domainLabel) domainLabel.textContent = chrome.i18n.getMessage('optionsDomainLabel');
      const domainInput = document.getElementById('customParamsDomain');
      if (domainInput) domainInput.placeholder = chrome.i18n.getMessage('optionsDomainPlaceholder');
      // document.getElementById('tempMessage').textContent = chrome.i18n.getMessage('optionsTempMessage');
      document.getElementById('existingParamsTitle').textContent = chrome.i18n.getMessage('optionsExistingParams');
      document.getElementById('styleTitle').textContent = chrome.i18n.getMessage('optionsStyleTitle');
      // 追蹤參數清除機制圖例
      const mechTitle = document.getElementById('mechanismTitle');
      if (mechTitle) mechTitle.textContent = chrome.i18n.getMessage('optionsMechTitle');
      const mechBeforeLabel = document.getElementById('mechanismBeforeLabel');
      if (mechBeforeLabel) mechBeforeLabel.textContent = chrome.i18n.getMessage('optionsMechBeforeLabel');
      const mechBefore = document.getElementById('mechanismBeforeText');
      if (mechBefore) mechBefore.textContent = chrome.i18n.getMessage('optionsMechBefore');
      const mechAfterLabel = document.getElementById('mechanismAfterLabel');
      if (mechAfterLabel) mechAfterLabel.textContent = chrome.i18n.getMessage('optionsMechAfterLabel');
      const mechAfter = document.getElementById('mechanismAfterText');
      if (mechAfter) mechAfter.textContent = chrome.i18n.getMessage('optionsMechAfter');
    }
  };

  if (i18nMessages[page]) {
    i18nMessages[page]();
  } else {
    console.warn(`No i18n handler found for page: ${page}`);
  }


});
