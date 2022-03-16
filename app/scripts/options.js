const isFirefox = 'browser' in window;

document.addEventListener('DOMContentLoaded', () => {
  const formEl = document.getElementById('form')
  const qualityRadioEls = formEl.quality

  // 設定読み込み
  if (isFirefox) {
    browser.storage.sync.get('quality_v2')
      .then((result) => {
        qualityRadioEls.value = result.quality_v2 || 2
      })
  } else {
    chrome.storage.sync.get('quality_v2', (result) => {
      qualityRadioEls.value = result.quality_v2 || 2
    })
  }

  // 設定変更時の処理
  Array.from(qualityRadioEls).forEach((el) => {
    el.addEventListener('change', () => {
      (isFirefox ? browser : chrome).storage.sync.set({
        quality_v2: Number(qualityRadioEls.value)
      });
    })
  })
})
