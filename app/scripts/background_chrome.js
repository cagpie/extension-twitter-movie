// Enable chromereload by uncommenting this line:
// import 'chromereload/devonly'

const storeUrl = {};

chrome.webRequest.onBeforeRequest.addListener(
  (details) => {
    const url = details.url

    if (url.includes('m3u8')) {
      console.log(details)

      const id = url.match(/ext_tw_video\/([0-9]+)\/pu/)[1]

     // マスタープレイリストだったらfetchして一番画質良さげなm3u8ファイルのパスを保存しておく
     if (/pu\/pl\/[^/]+.m3u8/.test(url)) {
      // if (
      //   (
      //     details.originUrl &&
      //     details.originUrl.includes('moz-extension://')
      //   ) ||
      //   (
      //     details.initiator &&
      //     !details.initiator.includes('chrome-extension://')
      //   )
      // ) {
        // fetch(url).then((res) => res.text()).then((body) => {
        //   if (!body.includes('#EXT-X-INDEPENDENT-SEGMENTS')) {
        //     return
        //   }

        //   const splittedBody= body.split('\n')
        //   storeUrl[id] = splittedBody[splittedBody.length - 2]
        //   console.log("FETCH")
        // })


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

      // }
      return
    }



    // 良さげなm3u8ファイルのパスが保存されていたら、プレイリストを見に行こうとする時すべてリダイレクトする
    if (!storeUrl[id]) {
      console.log("LOW")
      return
    }
      console.log("HIGH")
      return { redirectUrl: `${ (new URL(url)).origin }${ storeUrl[id] }` }
    }
  },
  {urls: ['https://video.twimg.com/*']},
  ['blocking']
)
