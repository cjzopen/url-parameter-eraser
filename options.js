document.addEventListener('DOMContentLoaded', function() {
  const customParamsInput = document.getElementById('customParams');
  const addButton = document.getElementById('add');
  const paramsList = document.getElementById('paramsList');

  // 限制輸入內容
  customParamsInput.addEventListener('input', function() {
    this.value = this.value.replace(/[^a-zA-Z0-9\-_\.]/g, ''); // 僅允許英文、數字、-、_、.
  });

  // 從全局變數讀取 defaultParams
  let defaultParams = Array.isArray(window.defaultParams) ? [...window.defaultParams] : [];

  // 儲存自訂參數
  addButton.addEventListener('click', function() {
    let customParams = customParamsInput.value.split(',').map(param => param.trim()).filter(param => param);
    getStoredParams(['url_parameter_eraser_params'], function(data) {
      const existingParams = Array.isArray(data.url_parameter_eraser_params) ? data.url_parameter_eraser_params : [];
      const updatedParams = [...new Set([...existingParams, ...customParams])];
      saveParams('url_parameter_eraser_params', updatedParams, function() {
        console.log("Custom parameters saved:", updatedParams);
        updateParamsList(paramsList, defaultParams, updatedParams, deleteDefaultParam, deleteCustomParam);
        customParamsInput.value = ''; // 清空輸入框
      });
    });
  });

  // 加載已保存的設置
  getStoredParams(['url_parameter_eraser_params', 'defaultParams'], function(data) {
    const customParams = Array.isArray(data.url_parameter_eraser_params) ? data.url_parameter_eraser_params : [];
    updateParamsList(paramsList, defaultParams, customParams, deleteDefaultParam, deleteCustomParam);
  });

  // 刪除 defaultParams 中的參數
  function deleteDefaultParam(paramToDelete) {
    defaultParams = defaultParams.filter(param => param !== paramToDelete);
    window.defaultParams = defaultParams;
    saveParams('defaultParams', defaultParams, function() {
      console.log("Default parameter deleted:", paramToDelete);
      updateParamsList(paramsList, defaultParams, [], deleteDefaultParam, deleteCustomParam);
    });
  }

  // 刪除 customParams 中的參數
  function deleteCustomParam(paramToDelete) {
    getStoredParams(['url_parameter_eraser_params'], function(data) {
      const customParams = Array.isArray(data.url_parameter_eraser_params) ? data.url_parameter_eraser_params : [];
      const updatedParams = customParams.filter(param => param !== paramToDelete);
      saveParams('url_parameter_eraser_params', updatedParams, function() {
        console.log("Custom parameter deleted:", paramToDelete);
        updateParamsList(paramsList, defaultParams, updatedParams, deleteDefaultParam, deleteCustomParam);
      });
    });
  }
});