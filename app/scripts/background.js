// Enable chromereload by uncommenting this line:
// import 'chromereload/devonly'

const storeUrl = {};

chrome.webRequest.onBeforeRequest.addListener(
  (details) => {
    // マスタープレイリストだったらM3U8の低い画質のやつを消す
    if (/pu\/pl\/[^/]+.m3u8/.test(details.url)) {
    let filter = browser.webRequest.filterResponseData(details.requestId);
    let decoder = new TextDecoder("utf-8");
    let encoder = new TextEncoder();

      filter.ondata = event => {
        const body = decoder.decode(event.data, {stream: true});

        if (!body.includes('#EXT-X-INDEPENDENT-SEGMENTS')) {
          return
        }

        const splittedBody= body.split('\n')
        const str = splittedBody.slice(0, 2).join('\n') + '\n' + splittedBody.slice(-3).join('\n')
        console.log(str)

        filter.write(encoder.encode(str));
        filter.disconnect();
      }
    }
  },
  {urls: ['https://video.twimg.com/*']},
  ['blocking']
)
