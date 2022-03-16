const isFirefox = 'browser' in window;

// Chrome用
const storedUrl = {};

// 設定初期化
let qualitySetting = 2
if (isFirefox) {
  browser.storage.sync.get('quality_v2')
    .then((result) => {
      qualitySetting = (result && result.quality_v2) ? Number(result.quality_v2) : 2
    })
} else {
  chrome.storage.sync.get('quality_v2', (result) => {
    qualitySetting = (result && result.quality_v2) ? Number(result.quality_v2) : 2
  })
}

// 設定変更検知
(isFirefox ? browser : chrome).storage.onChanged.addListener((result) => {
  qualitySetting = Number(result.quality_v2.newValue)
})

// 本編
if (isFirefox) {
  // Firefoxの場合はレスポンスフィルターを用いる
  browser.webRequest.onBeforeRequest.addListener(
    (details) => {
      // Twitterにお任せの場合は終了
      if (qualitySetting === 1) {
        return
      }

      // マスタープレイリストだったらM3U8の低い画質のやつを消す
      if (/\/pl\/[^/]+.m3u8/.test(details.url)) {
        let filter = browser.webRequest.filterResponseData(details.requestId)
        let decoder = new TextDecoder('utf-8')
        let encoder = new TextEncoder()

        filter.ondata = event => {
          const body = decoder.decode(event.data, {stream: true})

          if (!body.includes('#EXT-X-INDEPENDENT-SEGMENTS')) {
            return
          }

          // EXT-X-STREAM-INFの情報とプレイリストのURLの紐付けを行う
          const splittedBody = body.split('\n')
          const headerLines = []
          let bodyLines = []
          const playlists = {}
          let headerFlag = true
          for (let i = 0; i < splittedBody.length; i++) {
            if (!/^#EXT-X-STREAM-INF/.test(splittedBody[i])) {
              if (headerFlag) {
                headerLines.push(splittedBody[i])
              }
              continue
            }

            headerFlag = false

            playlists[splittedBody[i].match(/BANDWIDTH=(\d+)/)[1]] = [splittedBody[i], splittedBody[i + 1]]
            i++
          }

          switch (qualitySetting) {
            // 最高画質の場合
            case 2:
              bodyLines = playlists[Math.max(...Object.keys(playlists))]
              break

            // そこそこ画質の場合
            case 3:
            default:
              const keys = Object.keys(playlists)
              // 3個以上要素があれば一番高画質のものを除去してその中から一番いいものを選択する
              if (keys.length > 2) {
                delete playlists[Math.max(...keys)]
              }
              bodyLines = playlists[Math.max(...Object.keys(playlists))]
              break
          }

          const str = headerLines.join('\n') + '\n' + bodyLines.join('\n')

          filter.write(encoder.encode(str))
          filter.disconnect()
        }
      }
    },
    {urls: ['https://video.twimg.com/*']},
    ['blocking']
  )
} else {
  // Chromeの場合はm3u8リクエストの向き先を変更させる
  chrome.webRequest.onBeforeRequest.addListener(
    (details) => {
      // Twitterにお任せの場合は終了
      if (qualitySetting === 1) {
        return
      }
      const url = details.url
      if (/\/pl\/.+.m3u8/.test(url)) {
        let id =  url.match(/(ext_tw_video|amplify_video)\/([0-9]+)\//)[2]

        // マスタープレイリスト(plの後に画質のpathが入らない)だったらfetchして一番画質良さげなm3u8ファイルのパスを保存しておく
        if (/\/pl\/[^/]+.m3u8/.test(url)) {
          // オリジナルのリクエストだったらbackgroundで参照できるようにリクエストをもう一回発行する
          if (!details.initiator.includes('chrome-extension://')) {
            fetch(url).then((res) => res.text()).then((body) => {
              if (!body.includes('#EXT-X-INDEPENDENT-SEGMENTS')) {
                return
              }

              // EXT-X-STREAM-INFの情報とプレイリストのURLの紐付けを行う
              const splittedBody = body.split('\n')
              const playlists = {}
              for (let i = 0; i < splittedBody.length; i++) {
                if (!/^#EXT-X-STREAM-INF/.test(splittedBody[i])) {
                  continue
                }
                playlists[splittedBody[i].match(/BANDWIDTH=(\d+)/)[1]] = splittedBody[i + 1]
                i++
              }

              switch (qualitySetting) {
                // 最高画質の場合
                case 2:
                  storedUrl[id] = playlists[Math.max(...Object.keys(playlists))]
                  break

                // そこそこ画質の場合
                case 3:
                default:
                  const keys = Object.keys(playlists)
                  // 3個以上要素があれば一番高画質のものを除去してその中から一番いいものを選択する
                  if (keys.length > 2) {
                    delete playlists[Math.max(...keys)]
                  }
                  storedUrl[id] = playlists[Math.max(...Object.keys(playlists))]
                  break
              }
            })
          }
          return
        }

        // 良さげなパスがない or 理想のm3u8だったら何もせず終わる
        if (!storedUrl[id]) {
          return
        }
        if (storedUrl[id] && `${ (new URL(url)).origin }${ storedUrl[id] }` === url) {
          return
        }

        // 良さげなm3u8ファイルのパスが保存されていて未適用だったら、プレイリストを見に行こうとする時すべてリダイレクトする
        return { redirectUrl: `${ (new URL(url)).origin }${ storedUrl[id] }` }
      }
    },
    {urls: ['https://video.twimg.com/*']},
    ['blocking']
  )

}
