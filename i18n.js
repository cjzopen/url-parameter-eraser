document.addEventListener('DOMContentLoaded', () => {
  const page = document.body.dataset.page;

  const i18nMessages = {
    popup: () => {
      document.title = chrome.i18n.getMessage('popupTitle');
      document.querySelector('#popupTitle').textContent = chrome.i18n.getMessage('popupTitle');
      document.querySelector('#options').textContent = chrome.i18n.getMessage('popupOptionsButton');
      document.querySelector('#info').textContent = chrome.i18n.getMessage('popupInfoButton');
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
      document.querySelector('#add').textContent = chrome.i18n.getMessage('optionsAddButton');
      document.querySelector('h2').textContent = chrome.i18n.getMessage('optionsExistingParams');
    }
  };

  if (i18nMessages[page]) {
    i18nMessages[page]();
  } else {
    console.warn(`No i18n handler found for page: ${page}`);
  }
});
