/* =========================================================
   炉点前 稽古帖 — script.js
   ・お点前データ（TEMAE）
   ・配置図データ（ROOMS）と SVG 描画（実寸 1単位＝1cm）
   ・クイズ進行
   配置は「茶の湯おぼえがき」ほか裏千家の手順解説を参考に、
   京間の畳（191×95.5cm）・炉縁1尺4寸（42.4cm）の実寸で描いています。
   ========================================================= */
(function () {
  'use strict';

  /* ---------------------------------------------------------
     1. 配置図の座標データ（単位：cm）
     点前畳は横長に置き、上が「向こう」（炉のある側）、下が「手前」。
     pos:     [x, y, ラベル位置(b/t/l/r/n), 向き(度・亭主のみ)]
     hishaku: [合のx, 合のy, 柄の端x, 柄の端y]
     rects:   [x, y, 幅, 奥行]
     --------------------------------------------------------- */
  const MAT_Y = 110;          // 点前畳の向こうの縁
  const MAT_D = 95.5;         // 畳の幅（奥行）
  const RO = 42.4;            // 炉縁 1尺4寸
  const METSU = 1.5;          // 畳1目 ≒ 1.5cm

  // 四畳半切（本勝手）：炉は点前畳の向こう、半畳の角。水指は畳中央・炉側の縁から16目
  const YOJO_POS = {
    host: [152, 191, 'b', -15, '亭主（点前座）'],   // 点前座＝居前（炉縁の内隅狙い）
    hostMizu: [125.5, 190, 'b', 0, '亭主（勝手付・水指正面）'],
    hostKyaku: [171, 139, 'b', 90, '亭主（客付）'],
    door: [13, 160, 'r', 90],           // 茶道口
    mizu: [125.5, 136, 'tl'],           // 畳中央、向こうの縁から16目
    frontL: [114, 158, 'l'],            // 置き合わせ（茶碗）
    frontR: [137, 158, 'r'],            // 置き合わせ（棗・茶入）水指の右斜め前
    frontC: [125.5, 158, 'b'],
    knee: [150, 160, 'l'],              // 膝正面の少し奥
    mid: [151, 171, 'l'],               // 膝と茶碗の間
    nClean: [134, 123, 't'],            // 水指と炉を結ぶ線上
    chasenR: [145, 123, 'b'],           // 棗の右
    futaoki: [175, 117, 'r'],           // 炉の右下、3目ずつあけて
    kensui: [124, 183, 'l'],            // 炉縁半がかり
    kensuiIn: [124, 183, 'n'],
    dasu: [180, 172, 'r'],
    haiken1: [197, 129, 'r'],
    haiken2: [197, 143, 'r'],
    haiken3: [197, 157, 'r'],
    shifukuPos: [108, 139, 'l'],        // 仕覆：水指の左
    mzChakin: [125.5, 140.5, 'n'],      // 水指の蓋の上（茶筅荘）
    mzChasen: [125.5, 139.5, 'n'],
    mzShaku: [132, 135, 'n', 90],
    tomoOut: [48, 175, 'r'],
    shelfN: [141, 127, 'r'],            // 更好棚の中段
    shelfTop: [110, 127, 'l'],          // 更好棚の上段
    tanaFuta: [105, 143, 'b'],
    nShaku: [100, 125, 'l'],            // 長板：左奥に杓立
    nKensui: [100, 144, 'l'],           // 　　　その手前に建水
    nFutaoki: [100, 144, 'n'],
    nMizu: [145, 135, 'r'],             // 　　　右に水指
    nHibashi: [83, 134, 'l'],           // 飾り火箸（長板の左）
    nFrontL: [116, 167, 'l'],           // 長板正面の置き合わせ
    nFrontR: [136, 167, 'r'],
    nClean2: [117, 163, 'l'],           // 長板正面の左寄り
    nChasen: [128, 163, 'b']
  };

  const YOJO_HISHAKU = {
    onKama: [146, 86, 150, 126],
    onFutaoki: [175, 117, 178, 157],
    kensuiSet: [122, 181, 146, 176],
    tanaKazari: [106, 127, 141, 146],
    nagaita: [100, 121, 100, 108]
  };

  const DAIME_BASE = {
    host: [101.6, 192, 'b', 0, '亭主（点前座）'],
    door: [13, 160, 'r', 90],
    knee: [101.6, 161, 'l'],
    mid: [101.6, 173, 'l'],
    dasu: [134, 189, 'r'],
    haiken1: [158, 196, 'r'],
    haiken2: [158, 183, 'r'],
    haiken3: [158, 170, 'r']
  };

  const ROOMS = {
    honkatte: {
      label: '四畳半切・本勝手',
      mat: 'yojo',
      ro: { x: 125.5, y: MAT_Y - RO, kind: 'cut' },
      pos: YOJO_POS,
      hishaku: YOJO_HISHAKU,
      rects: { tana: [101, 120, 49, 32], nagaita: [89, 117, 72.7, 36.4] }
    },
    okiro: {
      label: '置炉（いつもの炉の位置に据えた図）',
      mat: 'yojo',
      ro: { x: 125.5, y: MAT_Y - RO, kind: 'oki' },
      pos: YOJO_POS,
      hishaku: YOJO_HISHAKU,
      rects: {}
    },
    mukogiri: {
      label: '向切・台目畳（点前畳の客付側に炉）',
      mat: 'daime',
      ro: { x: 108, y: 122, kind: 'cut', koita: true },
      pos: Object.assign({}, DAIME_BASE, {
        mizu: [95, 143.2, 'l'],            // 炉の左、鐶付
        frontL: [85, 166, 'l'],
        frontR: [105, 166, 'r'],
        nClean: [84, 159, 'l'],            // 水指の前左
        chasenR: [96, 159, 'b'],           // 水指正面
        futaoki: [147, 172, 'r'],          // 炉縁右隅手前（3目）
        kensui: [71, 189, 'l'],
        kensuiIn: [71, 189, 'n'],
        shifukuPos: [72, 150, 'l']
      }),
      hishaku: {
        onKama: [129, 140, 129, 180],
        onFutaoki: [147, 172, 147, 205],
        kensuiSet: [69, 187, 92, 182]
      },
      rects: {}
    },
    sumiro: {
      label: '隅炉・台目畳（点前畳の壁側の隅に炉）',
      mat: 'daime',
      ro: { x: 30, y: 122, kind: 'cut', koita: true },
      pos: Object.assign({}, DAIME_BASE, {
        mizu: [128, 143.2, 'r'],           // 炉の右、鐶付
        frontL: [118, 166, 'l'],
        frontR: [138, 166, 'r'],
        nClean: [116, 159, 'l'],           // 水指の前、中央より左
        chasenR: [127, 159, 'b'],
        futaoki: [37, 172, 'b'],           // 炉縁左隅（3目）
        kensui: [62, 196, 'l'],
        kensuiIn: [62, 196, 'n'],
        shifukuPos: [146, 150, 'r']
      }),
      hishaku: {
        onKama: [54, 141, 80, 176],
        onFutaoki: [37, 172, 78, 188],
        kensuiSet: [60, 194, 84, 188]
      },
      rects: {}
    }
  };

  const NAMES = {
    mizusashi: '水指', chawan: '茶碗', tsutsu: '筒茶碗', tomo: '供茶碗',
    natsume: '棗', chaire: '茶入', shifuku: '茶入（仕覆）', shifukuOnly: '仕覆',
    kensui: '建水', futaoki: '蓋置', hishaku: '柄杓', chasen: '茶筅', chashaku: '茶杓',
    kamabuta: '釜の蓋', chakin: '茶巾', shibori: 'しぼり茶巾', kijindai: '貴人台',
    shakutate: '杓立', hibashi: '飾り火箸', kobukusa: '古帛紗',
    tana: '更好棚', nagaita: '長板（炉用）', host: '亭主', arrow: ''
  };

  // 実寸（cm）の半径
  const R = {
    mizusashi: 10, chawan: 6.2, tomo: 6.2, tsutsu: 4.8, natsume: 3.6, chaire: 3.4,
    shifuku: 4.3, shifukuOnly: 4, kensui: 7.5, futaoki: 2.8, kamabuta: 8.5, chakin: 4,
    chasen: 3, kijindai: 10, shakutate: 4.5, kobukusa: 8, host: 20
  };

  /* ---------------------------------------------------------
     2. お点前データ
     items の書式："種類@位置"、先頭 "!" で強調、":名前" でラベル変更
     --------------------------------------------------------- */
  const U_SET = ['mizusashi@mizu', 'chawan@frontL', 'natsume@frontR'];
  const K_SET = ['mizusashi@mizu', 'chawan@frontL', 'shifuku@frontR'];
  const HIKI = ['kensui@kensui', 'futaoki@futaoki', 'hishaku@onFutaoki'];
  const YU = ['kensui@kensui', 'kamabuta@futaoki', 'chakin@futaoki', 'hishaku@onKama'];
  const KOI_YU = ['kensui@kensui', 'kamabuta@futaoki', 'chakin@mzChakin', 'hishaku@onKama'];
  const CHASEN_KAZARI = ['mizusashi@mizu', 'chakin@mzChakin', 'chasen@mzChasen', 'chashaku@mzShaku'];

  const TEMAE = [
    /* ===== 1. 薄茶運び点前 ===== */
    {
      id: 'usucha-hakobi',
      group: '炉',
      tab: '薄茶 運び点前',
      title: '【炉】薄茶運び点前（平点前）',
      room: 'honkatte',
      lead: '水指・茶碗と棗・建水を運び出して点てる、炉の薄茶の基本です。炉は点前畳の向こうにあり、亭主は炉縁の内隅を狙って斜めに座ります。',
      questions: [
        {
          step: '運び出し',
          scene: '茶道口で襖を開け、総礼をした。点前畳の上にはまだ何も置かれていない。',
          items: ['host@door'],
          q: '最初に運び出す道具はどれか。',
          a: '水指を運び出し、畳の中央・炉側の畳縁から16目のところに置く',
          w: ['茶碗と棗を先に運び出し、点前畳の中央に置く', '建水を先に運び出し、左膝の横に置く', '水指を炉縁にぴったり寄せて置く'],
          exp: '運び点前は「水指 → 茶碗・棗 → 建水」の順。炉の水指は畳の中央、炉側の畳縁から16目（約24cm）あけて置くのが基本の位置です。'
        },
        {
          step: '置き合わせ',
          scene: '水指を置いて、いったん水屋に下がった。',
          items: ['!mizusashi@mizu', 'host@door'],
          q: '次に運び出すものと、その置き方はどれか。',
          a: '右手に棗、左手に茶碗を持って出て、水指の前に棗を右斜め前、茶碗をその左に置き合わせる',
          w: ['茶碗だけを持って出て、水指の蓋の上に載せる', '棗を水指の左、茶碗を水指の右に離して置く', '茶碗と棗を建水に入れて一度に運ぶ'],
          exp: '棗は水指の右斜め前、茶碗はその左。水指・棗・茶碗の中心が二等辺三角形になるように置き合わせます。'
        },
        {
          step: '建水',
          scene: '茶碗と棗を置き合わせ、水屋に下がった。',
          items: U_SET.concat(['!chawan@frontL', '!natsume@frontR', 'host@door']),
          q: '次に運び出すのはどれか。',
          a: '蓋置と柄杓を仕組んだ建水を左手に持って出る',
          w: ['釜の蓋を持ち出して炉縁に置く', '茶筅だけを別に持ち出して棗の右に置く', '水次を持ち出して水指に水を足す'],
          exp: '建水に蓋置を入れ、柄杓を仕組んで持ち出します。炉の運び点前では、建水を持って入ったら襖を閉めます。'
        },
        {
          step: '蓋置・柄杓',
          scene: '建水を持って点前座に内隅狙いで座り、建水を左に置いた。',
          items: U_SET.concat(['!kensui@kensui', 'futaoki@kensuiIn', 'hishaku@kensuiSet']),
          q: '次の所作はどれか。',
          a: '柄杓を構え、蓋置を取って炉の右下に3目ずつあけて置き、柄杓を斜めに引く',
          w: ['蓋置を炉縁の上に載せ、柄杓を釜に掛ける', '蓋置を水指の前に置き、柄杓を水指の上に載せる', '柄杓を構えずに、先に茶碗を取り込む'],
          exp: '鏡柄杓に構えて蓋置を取り、炉の右下に畳3目ずつあけて置きます。合を蓋置に引き、柄は自分と平行に下ろします。'
        },
        {
          step: '建水を進める',
          scene: '柄杓を蓋置に引いた。',
          items: U_SET.concat(['kensui@kensui', '!futaoki@futaoki', '!hishaku@onFutaoki']),
          q: '次の所作はどれか。',
          a: '建水を炉縁半がかりまで進め、居ずまいを正して一呼吸おく',
          w: ['建水を客付に出す', 'ここで客と総礼をする', '水指の水を一杓汲んで釜に差す'],
          exp: '薄茶では総礼は茶道口で済ませています。建水を炉縁に半分かかるところまで進め、座りを整えて一呼吸。濃茶では、ここで総礼をします。'
        },
        {
          step: '取り込み',
          scene: '建水を進め、居ずまいを正した。',
          items: U_SET.concat(['!chawan@frontL', '!natsume@frontR']).concat(HIKI).concat(['arrow@frontL>knee']),
          q: '次の所作はどれか。',
          a: '茶碗を二手で膝正面の少し奥に取り込み、棗を膝と茶碗の間に置く',
          w: ['棗を先に取って右膝の横に置く', '茶碗を客付に仮置きする', '茶碗を三手で水指の左に移す'],
          exp: '炉の茶碗は左真横・右真横の二手で扱って膝正面の少し奥に置き、棗は右手で上から取って膝と茶碗の間に置きます。'
        },
        {
          step: '清め',
          scene: '茶碗と棗を取り込んだ。',
          items: ['mizusashi@mizu', '!chawan@knee', '!natsume@mid'].concat(HIKI).concat(['arrow@mid>nClean']),
          q: '棗を清めたら、どこに置くか。',
          a: '水指と炉を結んだ線上、中央より左に置き、続いて茶杓を清めて棗の上に置く',
          w: ['水指の正面にぴったり寄せて置く', '膝と茶碗の間に戻す', '建水の後ろに置く'],
          exp: '帛紗を草にさばいて棗を「こ」の字に清め、水指と炉を結んだ線上に置きます。清めた茶杓は棗の蓋の上へ。'
        },
        {
          step: '茶筅を出す',
          scene: '棗と茶杓を清め、茶杓を棗の上に置いた。',
          items: ['mizusashi@mizu', 'chawan@knee', 'natsume@nClean', 'chashaku@nClean'].concat(HIKI),
          q: '次の所作はどれか。',
          a: '茶碗から茶筅を取り出し、棗の右横に置く',
          w: ['茶筅を建水の縁に置く', '茶筅を水指の蓋の上に置く', '茶筅は茶碗に入れたまま湯を注ぐ'],
          exp: '茶筅は棗の右横へ。これで茶碗の中が茶巾だけになり、釜の蓋を開ける準備が整います。'
        },
        {
          step: '釜の蓋・茶巾',
          scene: '茶筅を棗の右に置き、茶碗を点てやすい位置に置いた。',
          items: ['mizusashi@mizu', 'chawan@knee', 'natsume@nClean', 'chashaku@nClean', '!chasen@chasenR'].concat(HIKI),
          q: '次の所作はどれか。',
          a: '柄杓を構えて帛紗で釜の蓋を取って蓋置に置き、茶巾を釜の蓋の上に置く',
          w: ['素手で釜の蓋を取り、畳の上に置く', '茶巾を水指の蓋の上に置く', '釜の蓋は開けずに、水指の水で茶碗を温める'],
          exp: '釜の蓋は帛紗で取り、蓋置の上へ。薄茶の茶巾は釜の蓋の上に手なりに置きます（炉の濃茶では水指の蓋の上に置きます）。'
        },
        {
          step: '茶筅通し',
          scene: '釜から湯を汲んで茶碗に入れ、柄杓を釜に掛けた。',
          items: ['mizusashi@mizu', '!chawan@knee', 'natsume@nClean', 'chashaku@nClean', 'chasen@chasenR'].concat(YU),
          q: '次の所作はどれか。',
          a: '茶筅通しをし、湯を建水に捨てて茶巾で茶碗を拭く',
          w: ['湯を入れたまま抹茶を入れて点てる', '茶碗の湯を水指に戻す', '茶巾を湯に浸して釜の蓋を拭く'],
          exp: '茶筅通しで穂先を改め、茶碗を温めます。湯を建水に捨てて茶巾で拭き、茶巾を釜の蓋の上に戻します。'
        },
        {
          step: '茶を入れる',
          scene: '茶碗を拭いて膝正面に置き、茶巾を釜の蓋の上に戻した。',
          items: ['mizusashi@mizu', 'chawan@knee', '!natsume@nClean', '!chashaku@nClean', 'chasen@chasenR'].concat(YU),
          q: '次の所作はどれか。',
          a: '茶杓を取って菓子をすすめ、棗の蓋を茶碗の右斜め前に置いて茶を入れる',
          w: ['先に湯を注ぎ、あとから抹茶を入れる', '抹茶を入れ終えてから菓子をすすめる', '棗の蓋を建水の上に置いて茶を入れる'],
          exp: '茶杓を取ったところで「お菓子をどうぞ」。棗の蓋は茶碗の右斜め前（右膝前）に置き、茶を入れたら蓋をして元の位置に戻します。'
        },
        {
          step: '水指の蓋',
          scene: '茶を入れ、棗を元の位置に戻して茶杓を上に載せた。',
          items: ['!mizusashi@mizu', 'chawan@knee', 'natsume@nClean', 'chashaku@nClean', 'chasen@chasenR'].concat(YU),
          q: '湯を注ぐ前にすることはどれか。',
          a: '水指の蓋を開けて、水指の左側に立てかける',
          w: ['水指を客付に寄せる', '釜の蓋を閉める', '茶巾で水指の蓋を拭く'],
          exp: '炉の薄茶では、茶を入れたその手で水指の蓋を開けます（水蓋を開ける）。つまみが真一文字になるよう左側に立てかけます。'
        },
        {
          step: '茶を出す',
          scene: '湯を注ぎ、茶筅で薄茶を点てた。',
          items: ['mizusashi@mizu', '!chawan@knee', 'natsume@nClean', 'chasen@chasenR'].concat(YU).concat(['arrow@knee>dasu']),
          q: '点てた茶碗はどう扱うか。',
          a: '左手の平で2度回し、正面を客に向けて出す',
          w: ['正面を自分に向けたまま出す', '茶筅を入れたまま出す', '建水の上を通して左側から出す'],
          exp: '茶碗の正面は客に向けて出します。最もよい面を客に見ていただくための心配りです。'
        },
        {
          step: '仕舞い',
          scene: '茶碗が戻り、湯を入れて建水に捨てた。正客から「どうぞおしまいください」と挨拶があった。',
          items: ['mizusashi@mizu', 'chawan@knee', 'natsume@nClean', 'chasen@chasenR'].concat(YU),
          q: '次の所作はどれか。',
          a: '茶碗を膝正面に置いてから「おしまいにいたします」と挨拶し、水を汲んで仕舞いの茶筅通しをする',
          w: ['湯を汲んで、もう一服点て始める', '茶碗を持ったまま挨拶し、すぐ建水を引く', '水指の水を建水にあける'],
          exp: '茶碗を持っている間は受けるだけにし、茶碗を正面に置いてから挨拶します。仕舞いは点前の始めを逆にたどる流れです。'
        },
        {
          step: '拝見',
          scene: '棗と茶碗を置き合わせ、水指の蓋を閉めたところで、正客から棗・茶杓の拝見を請われた。',
          items: U_SET.concat(['!kensui@kensui', 'hishaku@kensuiSet', 'futaoki@kensuiIn']),
          q: '次の所作はどれか。',
          a: '柄杓を建水にかけて蓋置をその下に置き、茶碗を勝手付に仮置きしてから、棗を持って客付に回り清めて出す',
          w: ['柄杓・蓋置はそのままで、棗だけを出す', '茶碗も一緒に拝見に出す', '棗を清めずに居前から出す'],
          exp: '拝見の所望を受けたら柄杓・蓋置を建水に。茶碗を一手で勝手付に割り付け、棗を持って客付（膝の中心が炉縁の中心）に回り、清めて出します。'
        },
        {
          step: '茶杓を出す',
          scene: '客付で棗を清めて出した。',
          items: ['mizusashi@mizu', 'chawan@tomoOut:茶碗（仮置き）', 'natsume@haiken1', 'host@hostKyaku'],
          q: '茶杓はどう出すか。',
          a: '水指正面に向いて茶杓を取り、点前座に向き直って棗の右横に出す',
          w: ['客付に座ったまま、手を伸ばして茶杓を取る', '茶杓を棗の上に載せて一緒に出す', '茶杓は拝見に出さない'],
          exp: '炉では茶杓を「水指正面」で取り、「居前」から出します（風炉とは取る位置・出す位置が逆）。間違えやすいところです。'
        }
      ]
    },

    /* ===== 2. 濃茶点前 ===== */
    {
      id: 'koicha-hakobi',
      group: '炉',
      tab: '濃茶 運び点前',
      title: '【炉】濃茶運び点前（平点前）',
      room: 'honkatte',
      lead: '水指の前に仕覆に入れた茶入を置き付け、茶碗と建水を運び出して濃茶を練ります。炉では茶巾を水指の蓋に置くこと、服加減のあとの「中じまい」が特徴です。',
      questions: [
        {
          step: '準備',
          scene: '水指を定座に置き、その前に仕覆に入れた茶入を置き付けた。茶道口に座る。',
          items: ['mizusashi@mizu', '!shifuku@frontC', 'host@door'],
          q: '最初に運び出すものはどれか。',
          a: '茶巾・茶筅・茶杓を仕込んだ茶碗',
          w: ['仕覆を脱がせた茶入', '水指', '柄杓と蓋置を仕組んだ建水'],
          exp: '濃茶では水指と茶入を置き付けておき、仕込み茶碗から運び出します（社中によっては水指も運び出します）。総礼は茶道口ではなく、柄杓を引いたあとに行います。'
        },
        {
          step: '置き合わせ',
          scene: '茶碗を持って点前座に進んだ。水指の前には茶入が置いてある。',
          items: ['mizusashi@mizu', 'shifuku@frontC', '!chawan@tomoOut:茶碗（仮置き）'],
          q: '茶碗の置き方はどれか。',
          a: '茶碗をいったん勝手付に仮置きし、茶入を右へずらして、茶碗を左右左で茶入の左に置き合わせる',
          w: ['茶入の前に茶碗を置き、茶入は動かさない', '茶入を持ち上げて茶碗の中に入れる', '茶碗を水指の右に置く'],
          exp: '仮置きした茶碗を、茶入をずらしてから置き合わせます。置き合わせの形は薄茶と同じ二等辺三角形です。'
        },
        {
          step: '総礼',
          scene: '建水を持って入り、茶道口を閉めて座った。',
          items: K_SET.concat(['!kensui@kensui', 'futaoki@kensuiIn', 'hishaku@kensuiSet']),
          q: '次の所作はどれか。',
          a: '柄杓を構えて蓋置を炉の右に置き、柄杓を斜めに引いて総礼をする',
          w: ['総礼をせずに茶碗を取り込む', '蓋置を水指の前に置いて総礼をする', '建水を客付に進めてから柄杓を構える'],
          exp: '濃茶の総礼はここ。柄杓を引いて総礼し、そのあと建水を炉縁半がかりまで進めて居ずまいを正します。'
        },
        {
          step: '仕覆',
          scene: '茶碗を二手で膝前に取り込み、茶入を右手で膝前に取り込んだ。',
          items: ['mizusashi@mizu', 'chawan@knee', '!shifuku@mid'].concat(HIKI).concat(['arrow@mid>shifukuPos']),
          q: '次の所作はどれか。',
          a: '仕覆を脱がせ、火の方へ打ち返して水指の左に置く',
          w: ['仕覆のまま茶入の蓋を開ける', '仕覆を建水の中に入れる', '仕覆を客付に出す'],
          exp: '緒を解いて茶入を出し、仕覆は火の方へ打ち返して定位置（水指の左）に置きます。'
        },
        {
          step: '清め',
          scene: '仕覆を脱がせ、茶入を膝前に置いた。',
          items: ['mizusashi@mizu', 'chawan@knee', '!chaire@mid', 'shifukuOnly@shifukuPos'].concat(HIKI),
          q: '茶入の清め方はどれか。',
          a: '帛紗を四方さばきでさばき、茶入を清める',
          w: ['帛紗を草にさばき、「こ」の字に拭く', '茶巾で茶入を拭く', '茶入は清めず、茶杓だけを清める'],
          exp: '濃茶の茶入は四方さばきで帛紗を改めてから清めます。清めた茶入は水指と炉の間に置き、茶杓は茶入の上（火の方）へ。茶筅は茶入の右に出します。'
        },
        {
          step: '茶巾',
          scene: '茶入・茶杓を清め、茶筅を茶入の右に出した。',
          items: ['!mizusashi@mizu', 'chawan@knee', 'chaire@nClean', 'chashaku@nClean', 'chasen@chasenR', 'shifukuOnly@shifukuPos'].concat(HIKI),
          q: '茶巾はどこに置くか。',
          a: '帛紗で水指の蓋を二の字に拭き、茶碗を引いて、茶巾を水指の蓋の上に置く',
          w: ['釜の蓋の上に置く', '建水の縁に掛ける', '茶碗の中に入れたままにする'],
          exp: '炉の濃茶では茶巾を水指の蓋の上に置きます（共蓋なら蓋は拭かない）。茶筅通しのあとも茶巾は水指の蓋に戻します。'
        },
        {
          step: '中蓋',
          scene: '柄杓を構えて釜の蓋を蓋置に置き、帛紗を右膝へ。茶碗に湯を入れた。',
          items: ['mizusashi@mizu', '!chawan@knee', 'chaire@nClean', 'chashaku@nClean', 'chasen@chasenR', 'shifukuOnly@shifukuPos'].concat(KOI_YU),
          q: '炉の濃茶で、湯を入れたあとにする所作はどれか。',
          a: '釜の蓋をぴったり閉める（中蓋）',
          w: ['釜の蓋を客付に出す', '水指の蓋を開ける', '柄杓を建水にかける'],
          exp: '炉の濃茶では湯を入れたあと中蓋をして湯の温度を保ちます。そのあと茶筅通しをして茶碗を拭きます。'
        },
        {
          step: '茶を入れる',
          scene: '茶碗を拭き、茶杓を取って菓子をすすめた。',
          items: ['mizusashi@mizu', 'chawan@knee', '!chaire@nClean', 'chasen@chasenR', 'shifukuOnly@shifukuPos'].concat(KOI_YU),
          q: '茶の入れ方はどれか。',
          a: '茶入の蓋を茶碗の右に置き、茶杓で三杓ほど入れて、残りを回し出す',
          w: ['茶入の蓋を建水の上に置いて茶を入れる', '一杓半だけ入れて、残りは茶入に戻す', '茶入を逆さにして一度に入れる'],
          exp: '茶入には客数分の茶が入っています。三杓ほどすくったら、残りは茶入を回しながら茶碗に出し切ります。'
        },
        {
          step: '練る',
          scene: '茶を入れて茶入に蓋をし、元の位置に戻した。',
          items: ['mizusashi@mizu', '!chawan@knee', 'chaire@nClean', 'chasen@chasenR', 'shifukuOnly@shifukuPos'].concat(KOI_YU),
          q: '次の所作はどれか。',
          a: '湯を汲んで適量を注ぎ、よく練ってから湯を足して練り上げる',
          w: ['一度にたっぷり湯を注ぎ、薄茶のように泡立てる', '水指の水で練る', '茶筅を使わず茶杓でかき混ぜる'],
          exp: '濃茶は「点てる」ではなく「練る」。少量の湯でよく練り、湯を加えてとろみのある一碗に仕上げます。水指の蓋は、炉では中じまいのあとに開けます。'
        },
        {
          step: '服加減',
          scene: '練った茶碗を出し、正客が一口飲んだ。',
          items: ['mizusashi@mizu', '!chawan@dasu', 'chaire@nClean', 'chasen@chasenR', 'shifukuOnly@shifukuPos'].concat(KOI_YU),
          q: 'このとき亭主はどうするか。',
          a: '「お服加減はいかがでございますか」と尋ねる',
          w: ['黙って仕舞いの所作を始める', '次客のために新しく茶を練る', '正客に茶碗の拝見をすすめる'],
          exp: '正客の一口目で服加減を尋ね、「結構でございます」と答えがあってから次の所作に移ります。'
        },
        {
          step: '中じまい',
          scene: '服加減の挨拶が済んだ（炉の場合）。',
          items: ['mizusashi@mizu', 'chaire@nClean', 'chasen@chasenR', 'shifukuOnly@shifukuPos'].concat(KOI_YU),
          q: '炉の濃茶で、このあと行う所作はどれか。',
          a: '柄杓を構えて釜の蓋を閉め、柄杓・蓋置を建水にたたんで、客付で控える（中じまい）',
          w: ['すぐに水指の水を釜に差して湯返しをする', '茶入を拝見に出す', '居前のまま茶碗が戻るのを待ち続ける'],
          exp: '炉の濃茶の特徴が「中じまい」。末客が吸い切ったら居前に戻り、蓋置・柄杓を据え直して中じまいを解き、水一杓を差します。'
        },
        {
          step: '茶碗が戻る',
          scene: '中じまいを解いて水一杓を差した。茶碗が戻ってきた。',
          items: ['mizusashi@mizu', '!chawan@knee', 'chaire@nClean', 'chasen@chasenR', 'shifukuOnly@shifukuPos'].concat(YU),
          q: '次の所作はどれか。',
          a: '茶碗を膝前に取り込んで総礼をする',
          w: ['茶碗を客付に置いたまま仕舞いを始める', '茶碗に水を入れてから総礼をする', '総礼はせずに湯を入れる'],
          exp: '濃茶では、茶碗が戻ったら膝前に取り込んで総礼。茶碗について尋ねられたら答え、湯を入れて建水に捨てて「おしまいに致します」。'
        },
        {
          step: '拝見',
          scene: '仕舞い付けを終え、正客から茶入・茶杓・仕覆の拝見を請われた。',
          items: ['mizusashi@mizu', 'chawan@frontL', '!chaire@frontR', 'shifukuOnly@shifukuPos', 'kensui@kensui', 'hishaku@kensuiSet', 'futaoki@kensuiIn'].concat(['arrow@frontR>haiken1']),
          q: '拝見に出す手順はどれか。',
          a: '茶入を客付で清めて出し、水指正面で茶杓を取って居前から出し、続いて仕覆を出す',
          w: ['茶入を仕覆に入れ直してから出す', '仕覆だけを出し、茶入・茶杓は持ち帰る', '茶碗・茶入・茶杓をまとめて出す'],
          exp: '茶入 → 茶杓 → 仕覆の順。炉では茶杓を水指正面で取り、居前から出すのがポイントです。'
        }
      ]
    },

    /* ===== 3. 更好棚 薄茶 ===== */
    {
      id: 'koukoudana',
      group: '炉',
      tab: '更好棚 薄茶',
      title: '【炉】薄茶 更好棚点前',
      room: 'honkatte',
      base: ['tana@tana'],
      lead: '更好棚（玄々斎好み）を畳中央に据え、地板に水指、中段に棗を荘って行う薄茶点前。棚から道具を下ろす順と、終わりの荘りを確かめます。',
      caption: '棚は外形の目安です。',
      questions: [
        {
          step: '運び出し',
          scene: '棚の地板に水指、中段に棗が荘ってある。茶道口で総礼をした。',
          items: ['mizusashi@mizu', '!natsume@shelfN:棗（中段）', 'host@door'],
          q: '最初に運び出すものはどれか。',
          a: '茶巾・茶筅・茶杓を仕込んだ茶碗',
          w: ['水指を持ち出す', '棗を水屋から持ち出す', '建水を持ち出し、茶碗は最後に運ぶ'],
          exp: '水指と棗は荘ってあるので、まず仕込み茶碗を運び出します。'
        },
        {
          step: '棗を下ろす',
          scene: '茶碗を持って点前座に進み、いったん勝手付に置いた。',
          items: ['mizusashi@mizu', 'natsume@shelfN:棗（中段）', '!chawan@tomoOut:茶碗（仮置き）', 'arrow@shelfN>frontR'],
          q: '次の所作はどれか。',
          a: '棚の棗を右手で水指の斜め右前に下ろし、茶碗を三手で棗の左に置き合わせる',
          w: ['茶碗を中段に上げて棗と並べる', '棗は荘ったまま点前を始める', '棗を右膝の横に置き、茶碗を水指の上に載せる'],
          exp: '棚から下ろした棗と茶碗を、運び点前と同じ二等辺三角形に置き合わせます。'
        },
        {
          step: '蓋置',
          scene: '置き合わせを終え、建水を運び出す。',
          items: U_SET.concat(['!kensui@kensui', 'futaoki@kensuiIn', 'hishaku@kensuiSet']),
          q: '棚点前で建水に仕組む蓋置はどれか。',
          a: '竹以外（焼物など）の蓋置',
          w: ['青竹の蓋置', '引切の竹の蓋置', '蓋置は使わない'],
          exp: '水指を運ぶ点前は竹の蓋置、運ばない棚点前では竹以外の蓋置を使うのが基本です。'
        },
        {
          step: '清め',
          scene: '柄杓を引いて建水を進め、茶碗と棗を取り込んだ。',
          items: ['mizusashi@mizu', '!chawan@knee', '!natsume@mid'].concat(HIKI),
          q: '次の所作はどれか。',
          a: '帛紗を草にさばいて棗を清め、水指と炉を結んだ線上に置く',
          w: ['棗を中段に戻してから清める', '帛紗で水指の蓋を清める', '茶筅を先に出して茶筅通しをする'],
          exp: '取り込んだ後の清めは平点前と同じです。'
        },
        {
          step: '荘り',
          scene: '仕舞い付けを終えた。正客から棗・茶杓の拝見を請われた。',
          items: U_SET.concat(HIKI).concat(['!hishaku@onFutaoki', '!futaoki@futaoki']),
          q: '柄杓と蓋置はどうするか。',
          a: '柄杓を中段に荘り、蓋置を棚正面に向いて柄杓の左側に荘る',
          w: ['柄杓と蓋置を建水に入れて先に下げる', '柄杓と蓋置も拝見に出す', '柄杓を水指の蓋の上に置いたままにする'],
          exp: '棚点前では拝見の所望があると柄杓・蓋置を棚に荘ります。柄杓は合の側が1/3、切止の側が1/4ほど出るように置きます。'
        },
        {
          step: '拝見の後',
          scene: '棗・茶杓を拝見に出し、建水と茶碗を下げた。',
          items: ['mizusashi@mizu', 'hishaku@tanaKazari', 'futaoki@tanaFuta', 'natsume@haiken1', 'chashaku@haiken2'],
          q: '次にすることはどれか。',
          a: '水次を持ち出し、水指を棚から下ろして水を補い、棚に戻す',
          w: ['水指を持って水屋に下がる', '拝見が終わるまで点前座で待つ', '棚の柄杓を下げる'],
          exp: '棚に荘り残す水指は、水次で水を補ってから棚に戻します。'
        },
        {
          step: '棗を荘る',
          scene: '拝見の道具が戻り、問答を終えた。',
          items: ['mizusashi@mizu', 'hishaku@tanaKazari', 'futaoki@tanaFuta', '!natsume@haiken1', 'chashaku@haiken2'],
          q: '棗と茶杓はどうするか。',
          a: '棚正面に向いて棗を上段に荘り、茶杓を持って下がる',
          w: ['棗も茶杓も持って下がる', '棗を中段、茶杓を上段に荘る', '棗と茶杓を水指の前に並べて荘る'],
          exp: '茶杓をいったん水指の上に預けて、棗を上段に荘ります。茶杓を持って茶道口に下がり、総礼。'
        }
      ]
    },

    /* ===== 4. 茶入荘 ===== */
    {
      id: 'chaire-kazari',
      group: '炉',
      tab: '茶入荘',
      title: '【炉】濃茶 茶入荘り',
      room: 'honkatte',
      lead: '特別な茶入を用いるとき、初座の床の間に茶入を荘る濃茶点前。点前座は「茶筅荘」の仕込みとし、茶入は古帛紗にのせて扱います。',
      caption: '水指の蓋の上に茶巾・茶筅・茶杓をのせる仕込み（茶筅荘）で示しています。',
      questions: [
        {
          step: '趣旨',
          scene: '初座の床の間に、仕覆に入れた茶入が荘られている。',
          items: CHASEN_KAZARI.concat(['chawan@frontC:茶碗（茶入を入れる）', 'shifuku@frontC']),
          q: '茶入荘について正しいものはどれか。',
          a: '特別な茶入を用いるとき、初座の床に荘る。濃茶のみで行う',
          w: ['薄茶・濃茶のどちらでも行う', '棚物を使って行うのが基本', '茶入を点前座の正面に荘ってから席入りする'],
          exp: '茶入荘は濃茶のみ。荘り物の点前は棚では行わず、古帛紗を用います。'
        },
        {
          step: '仕込み',
          scene: '後座の点前座を整える。',
          items: CHASEN_KAZARI.concat(['!chawan@frontC:茶碗（茶入を入れる）', 'shifuku@frontC']),
          q: '点前座の仕込みはどれか。',
          a: '水指の蓋のつまみ手前に茶巾、その上に茶筅、右側に茶杓をのせ、仕覆に入れた茶入を茶碗に入れて水指前に荘る',
          w: ['茶碗に茶巾・茶筅・茶杓を仕組み、茶入は水屋から運ぶ', '水指の前に茶入だけを置き、茶碗は運び出す', '水指の上に茶入を置く'],
          exp: 'これを「茶筅荘」の仕込みといいます。茶筅は水指の蓋に触れないよう茶巾の上にのせます。'
        },
        {
          step: '運び出し',
          scene: '茶道口に座った。点前座には水指と、茶入を入れた茶碗が荘ってある。',
          items: CHASEN_KAZARI.concat(['chawan@frontC:茶碗（茶入を入れる）', 'shifuku@frontC', 'host@door']),
          q: '亭主が運び出すものはどれか。',
          a: '柄杓と蓋置を仕組んだ建水だけ',
          w: ['茶碗と茶入', '水指', '水次と建水'],
          exp: '茶碗・茶入・水指はすべて置き付けてあるので、運び出すのは建水だけです。'
        },
        {
          step: '茶入を出す',
          scene: '総礼をすませ、茶碗を両手で膝前に置いた。',
          items: ['mizusashi@mizu', 'chakin@mzChakin', 'chasen@mzChasen', 'chashaku@mzShaku', '!chawan@knee:茶碗（茶入を入れる）', 'shifuku@knee'].concat(HIKI),
          q: '次の所作はどれか。',
          a: '茶入を右手で茶碗から出し、仕覆を脱がせて水指の左に置く',
          w: ['茶入を茶碗に入れたまま仕覆を脱がせる', '仕覆を茶碗の中に戻す', '茶入を床の間へ戻す'],
          exp: '茶碗から茶入を出して仕覆を脱がせ、仕覆は水指の左へ。'
        },
        {
          step: '古帛紗',
          scene: '茶入を四方さばきで清めた。',
          items: ['mizusashi@mizu', 'chakin@mzChakin', 'chasen@mzChasen', 'chashaku@mzShaku', 'chawan@knee', '!kobukusa@nClean', 'shifukuOnly@shifukuPos'].concat(HIKI),
          q: '清めた茶入はどこに置くか。',
          a: '懐中の古帛紗を広げ、その上に置く（以後、茶入は古帛紗ごと扱う）',
          w: ['畳の上にじかに置く', '仕覆の上に置く', '茶碗の中に戻す'],
          exp: '特別な茶入は古帛紗にのせて扱います。仕舞いの置き合わせも拝見に出すときも、古帛紗ごと動かします。'
        },
        {
          step: '茶筅',
          scene: '茶杓を清めた。茶筅はまだ水指の蓋の上にある。',
          items: ['!mizusashi@mizu', 'chakin@mzChakin', '!chasen@mzChasen', 'chawan@knee', 'kobukusa@nClean', 'chaire@nClean', 'shifukuOnly@shifukuPos'].concat(HIKI),
          q: '茶筅はいつ水指からおろすか。',
          a: '茶杓を清めたこの時点で、水指からおろす',
          w: ['茶筅通しのときまで水指の上に置いておく', '茶を練る直前におろす', '最後まで水指の上に置いておく'],
          exp: '薄茶の茶筅荘では茶筅通しまで水指の上に置いたまま（取りつかい）ですが、濃茶ではここでおろします。'
        },
        {
          step: '拝見',
          scene: '仕舞いで茶入を古帛紗ごと茶碗と置き合わせ、水指の蓋を閉めたところで拝見を請われた。',
          items: ['mizusashi@mizu', 'chawan@frontL', '!kobukusa@frontR', 'chaire@frontR', 'shifukuOnly@shifukuPos'].concat(HIKI),
          q: '茶入の出し方はどれか。',
          a: '古帛紗ごと茶入を持って客付に回り、清めて出す',
          w: ['古帛紗から下ろして出す', '仕覆に入れてから出す', '居前から手を伸ばして出す'],
          exp: '拝見後の挨拶で茶入の由緒を尋ねられるので答えます。'
        }
      ]
    },

    /* ===== 5. 茶碗荘 ===== */
    {
      id: 'chawan-kazari',
      group: '炉',
      tab: '茶碗荘',
      title: '【炉】濃茶 茶碗荘り',
      room: 'honkatte',
      lead: '特別な茶碗を用いるとき、初座の床の間に茶碗を荘る点前（濃茶・薄茶とも）。茶碗は常に手を添えて扱い、古帛紗にのせて出します。',
      caption: '水指の蓋の上に茶巾・茶筅・茶杓をのせる仕込み（茶筅荘）で示しています。',
      questions: [
        {
          step: '趣旨',
          scene: '初座の床の間に茶碗が荘られている。',
          items: CHASEN_KAZARI.concat(['chawan@frontC:茶碗（茶入を入れる）', 'shifuku@frontC']),
          q: '茶碗荘について正しいものはどれか。',
          a: '特別な茶碗を用いるとき、初座の床に荘る。濃茶・薄茶ともに行う',
          w: ['濃茶のみで行う', '棚を使うのが基本', '茶碗は台に載せて点前座に荘る'],
          exp: '茶入荘は濃茶のみですが、茶碗荘は濃茶・薄茶ともに行います。'
        },
        {
          step: '運び出し',
          scene: '点前座は茶筅荘に仕込み、茶碗は水指前に荘ってある。',
          items: CHASEN_KAZARI.concat(['chawan@frontC:茶碗（茶入を入れる）', 'shifuku@frontC', 'host@door']),
          q: '亭主が運び出すものはどれか。',
          a: '柄杓と蓋置を仕組んだ建水だけ',
          w: ['茶碗をいったん水屋に下げて仕組み直す', '別の茶碗を持ち出して並べる', '茶入を水屋から持ち出す'],
          exp: '道具はすべて置き付けてあるので、運び出すのは建水だけです。'
        },
        {
          step: '茶碗の扱い',
          scene: '総礼をして、茶碗を取り込む。',
          items: CHASEN_KAZARI.concat(['!chawan@frontC', 'shifuku@frontC']).concat(HIKI).concat(['arrow@frontC>knee']),
          q: '荘りの茶碗の扱いで心得るべきことはどれか。',
          a: '常に手を添えて、両手で丁寧に扱う',
          w: ['片手で手早く扱う', '縁を指でつまんで扱う', '古帛紗にのせたまま点前をする'],
          exp: '特別な茶碗なので、扱いはすべて手を添えて行います。'
        },
        {
          step: '茶筅通し',
          scene: '茶碗に湯を入れ、茶筅通しをする。',
          items: ['mizusashi@mizu', 'chakin@mzChakin', '!chawan@knee', 'chaire@nClean', 'chasen@chasenR'].concat(['kensui@kensui', 'kamabuta@futaoki', 'hishaku@onKama']),
          q: '茶碗荘での茶筅通しの特徴はどれか。',
          a: '左手を添えて音を立てずに一度打ち、両手で茶碗を引いてから通常どおり行う',
          w: ['茶筅で茶碗の縁を強く三度打つ', '茶筅通しを省略する', '茶碗を持ち上げたまま行う'],
          exp: '大切な茶碗を傷めないよう、音を立てずに扱います。'
        },
        {
          step: '茶を出す',
          scene: '通常どおり茶を練った。',
          items: ['mizusashi@mizu', '!chawan@knee', 'chaire@nClean', 'chasen@chasenR', 'arrow@knee>dasu'].concat(KOI_YU),
          q: '茶碗の出し方はどれか。',
          a: '客付に回っていったん置き、古帛紗を広げて茶碗をのせて出し、左右と一膝さがって控える',
          w: ['居前から手を伸ばして畳に直接置く', '茶碗を貴人台にのせて出す', '半東に渡して出してもらう'],
          exp: '古帛紗にのせて出すのが茶碗荘の特徴です。'
        },
        {
          step: '茶碗が戻る',
          scene: '茶碗が戻ってきた。',
          items: ['mizusashi@mizu', '!chawan@dasu', 'chaire@nClean', 'chasen@chasenR'].concat(KOI_YU),
          q: '次の所作はどれか。',
          a: '客付を向いて茶碗の由緒の問いに答え、両手で取り込んで古帛紗を懐中し、居前に戻って総礼',
          w: ['すぐに湯を入れて建水に捨てる', '茶碗を客付に置いたまま仕舞いを始める', '茶碗を床の間に戻す'],
          exp: '茶碗が戻ったところで由緒を尋ねられます。両手で茶碗を持って居前に戻り、膝前に置いて総礼。'
        }
      ]
    },

    /* ===== 6. 貴人点 ===== */
    {
      id: 'kijinten',
      group: '炉',
      tab: '貴人点',
      title: '【炉】貴人点（濃茶・薄茶）',
      room: 'honkatte',
      lead: '高貴なお客様に対して行う点前。木地の貴人台に仕込み茶碗をのせて扱い、道具はすべて新しいものを用います。',
      caption: '貴人台は茶碗の下の四角（約20cm）で示しています。',
      questions: [
        {
          step: '道具',
          scene: '貴人点の道具を用意する。',
          items: ['mizusashi@mizu', '!kijindai@frontL', 'chawan@frontL', 'natsume@frontR'],
          q: '貴人点の道具選びの心得はどれか。',
          a: '道具はすべて新品を使い、値打ちよりもきれいなものを選ぶ',
          w: ['使い込んだ由緒ある道具を必ず使う', '茶巾・茶筅は省略する', '客の持参した道具を使う'],
          exp: '清浄を第一にします。菓子は高坏に懐紙を折ってのせて出します。'
        },
        {
          step: '準備',
          scene: '茶碗を仕込んだ。',
          items: ['mizusashi@mizu', '!kijindai@frontL', 'chawan@frontL', 'natsume@frontR'],
          q: '仕込み茶碗の扱いはどれか。',
          a: '木地の貴人台に仕込み茶碗をのせる',
          w: ['塗りの盆に茶碗をのせる', '茶碗を古帛紗で包む', '茶碗は台にのせず、畳に置く'],
          exp: '貴人台（木地）に茶碗をのせて扱うのが貴人点の基本です。'
        },
        {
          step: '運び出し',
          scene: '小間で、運びの点前で行う。',
          items: ['host@door'],
          q: '運び出しの順はどれか。',
          a: '水指 → 貴人台（茶碗） → 棗と建水（右掌に棗、左手に建水）',
          w: ['貴人台 → 水指 → 建水', '棗と茶碗 → 水指 → 建水', '建水 → 貴人台 → 水指'],
          exp: '棚物などを用いる場合は、茶道口で貴人台とともに一礼します。'
        },
        {
          step: '茶筅通し',
          scene: '茶碗に湯を入れた。',
          items: ['mizusashi@mizu', '!kijindai@knee', 'chawan@knee', 'natsume@nClean', 'chasen@chasenR'].concat(YU),
          q: '茶筅通しの前にすることはどれか。',
          a: '茶筅を茶碗に入れ、貴人台を寄せてから茶筅通しをする',
          w: ['茶碗を貴人台から下ろして畳に置く', '貴人台を客付に出しておく', '貴人台を建水の上に置く'],
          exp: '湯を捨てるときは、茶碗を左手を添えて取り、片手で捨てます。'
        },
        {
          step: '茶を出す',
          scene: '茶を練り（点て）終えた。',
          items: ['mizusashi@mizu', '!kijindai@knee', 'chawan@knee', 'natsume@nClean', 'chasen@chasenR', 'arrow@knee>dasu'].concat(YU),
          q: '貴人への茶の出し方はどれか。',
          a: '貴人台を持って客付に回り、台の上で右に回して正面を向け、出したら左右と一膝さがって両手をついて控える',
          w: ['茶碗を台から下ろして畳に置いて出す', '居前から台を押し出す', '茶碗だけを古帛紗にのせて出す'],
          exp: '出した貴人台は半東が取り次ぎます。茶碗が戻ったら右、左と進んで貴人台を取り、居前に戻ります。'
        },
        {
          step: '拝見（濃茶）',
          scene: '濃茶で、茶入を拝見に出した。',
          items: ['mizusashi@mizu', 'kijindai@frontL', 'chawan@frontL', 'chaire@haiken1', 'shifukuOnly@shifukuPos', 'host@hostMizu'],
          q: '茶杓と仕覆の出し方はどれか。',
          a: '水指正面で仕覆を左掌にのせ、その上に茶杓を斜めにのせて、客付に回って出す',
          w: ['茶杓と仕覆を別々に二回に分けて出す', '茶杓は出さず、仕覆だけを出す', '居前から手を伸ばして出す'],
          exp: '薄茶の場合は茶杓を帛紗にのせて出します。'
        }
      ]
    },

    /* ===== 7. 長板総荘 ===== */
    {
      id: 'nagaita',
      group: '炉',
      tab: '長板総荘',
      title: '【炉】長板総荘（濃茶・薄茶）',
      room: 'honkatte',
      base: ['nagaita@nagaita'],
      lead: '炉用の長板（2尺4寸）の上に、杓立（飾り火箸・差通し柄杓）、建水（蓋置入り）、水指をすべて荘る点前。座り方は外隅狙いです。',
      caption: '長板は炉用（約72.7×36.4cm）。左奥に杓立、その手前に建水、右に水指。',
      questions: [
        {
          step: '荘り',
          scene: '長板の上に道具が荘りつけてある。',
          items: ['!shakutate@nShaku', '!kensui@nKensui', 'futaoki@nFutaoki', '!mizusashi@nMizu'],
          q: '炉の長板総荘の荘り方はどれか。',
          a: '左奥に杓立（飾り火箸・柄杓）、その手前に建水（蓋置入り）、右に水指',
          w: ['左から建水・杓立・水指を横一列に並べる', '中央に水指、左右に建水と杓立', '水指の前に茶碗と棗も荘る'],
          exp: '炉の長板は風炉より短いものを使い、左奥に杓立、手前に建水、右に水指を荘ります。'
        },
        {
          step: '運び出し',
          scene: '茶道口で総礼をした。',
          items: ['shakutate@nShaku', 'kensui@nKensui', 'futaoki@nFutaoki', 'mizusashi@nMizu', 'host@door'],
          q: '運び出すものはどれか。',
          a: '右手に棗、左手に仕込み茶碗を持ち、長板正面に座って置き合わせる',
          w: ['建水を持ち出す', '水指を持ち出す', '柄杓と蓋置を持ち出す'],
          exp: '建水・柄杓・蓋置・水指は荘ってあるので、運び出すのは茶碗と棗（濃茶は茶入）だけです。'
        },
        {
          step: '建水',
          scene: '茶碗と棗を長板正面に置き合わせた。',
          items: ['shakutate@nShaku', '!kensui@nKensui', 'futaoki@nFutaoki', 'mizusashi@nMizu', 'chawan@nFrontL', 'natsume@nFrontR', 'arrow@nKensui>kensui'],
          q: '次の所作はどれか。',
          a: '建水を両手で板から下ろし、左手で持っていつもの位置に置く',
          w: ['建水は長板に置いたまま使う', '水指を長板から下ろす', '杓立ごと膝前に取り込む'],
          exp: '総荘では建水を運び出さない代わりに、長板から下ろして用います。'
        },
        {
          step: '飾り火箸',
          scene: '建水を下ろした。',
          items: ['!shakutate@nShaku', 'kensui@kensui', 'futaoki@kensuiIn', 'mizusashi@nMizu', 'chawan@nFrontL', 'natsume@nFrontR', 'arrow@nShaku>nHibashi'],
          q: '次の所作はどれか。',
          a: '飾り火箸を杓立から取って扱い、長板の左に置く',
          w: ['飾り火箸は杓立に立てたままにする', '飾り火箸で炭を直す', '飾り火箸を建水の中に入れる'],
          exp: '「わん・けん・ひ・ふー（茶碗・建水・火箸・蓋置）」の順。火箸は建水のあった所でS字を描くようにして手前に持ってきて扱い、長板の左に置きます。'
        },
        {
          step: '蓋置',
          scene: '飾り火箸を長板の左に置いた。',
          items: ['shakutate@nShaku', 'hibashi@nHibashi', 'kensui@kensui', '!futaoki@kensuiIn', 'mizusashi@nMizu', 'chawan@nFrontL', 'natsume@nFrontR', 'arrow@kensui>futaoki'],
          q: '次の所作はどれか。',
          a: '蓋置を建水から取り、点前座に向いて定座に置き、建水を炉縁半がかりまで進める',
          w: ['蓋置を長板の上に置く', '先に柄杓を杓立から取って構える', '蓋置を水指の前に置く'],
          exp: '柄杓はまだ取りません。柄杓は茶碗・棗を清めたあとに杓立から取ります。点前座は外隅狙いです。'
        },
        {
          step: '柄杓',
          scene: '棗と茶杓を清め、茶筅を棗の右に置いて、帛紗を右膝頭に仮置きした。',
          items: ['!shakutate@nShaku', 'hibashi@nHibashi', 'kensui@kensui', 'futaoki@futaoki', 'mizusashi@nMizu', 'chawan@knee', 'natsume@nClean2', 'chashaku@nClean2', 'chasen@nChasen'],
          q: '次の所作はどれか。',
          a: '長板正面に向いて杓立から柄杓を取り、左手に持ったまま点前座に戻る',
          w: ['柄杓を取らずに釜の蓋を開ける', '杓立ごと点前座に持ってくる', '柄杓を建水から取る'],
          exp: '柄杓を左手に持ったまま、右手で帛紗を取って釜の蓋を開け、蓋置に置きます。'
        },
        {
          step: '荘り直し',
          scene: '仕舞いで湯返しをし、柄杓を杓立に戻した。拝見の所望があった。',
          items: ['shakutate@nShaku', 'hibashi@nHibashi', 'kensui@kensui', '!futaoki@futaoki', 'mizusashi@nMizu', 'chawan@nFrontL', 'natsume@nFrontR', 'arrow@futaoki>nKensui'],
          q: '蓋置と火箸はどうするか。',
          a: '蓋置を長板の上（最初に建水があった位置）に置き、飾り火箸を杓立に戻す',
          w: ['蓋置・火箸とも建水に入れて下げる', '蓋置を拝見に出す', '火箸は長板の左に置いたままにする'],
          exp: 'このあと棗・茶杓を拝見に出し、茶碗を下げ、水次で水指に水を補います。最後にきれいにした建水を持って出て蓋置を入れ、長板の元の位置に戻します。'
        }
      ]
    },

    /* ===== 8. 向切 ===== */
    {
      id: 'mukogiri',
      group: '八炉',
      tab: '向切 濃茶',
      title: '【八炉】向切 濃茶点前',
      room: 'mukogiri',
      lead: '点前畳の中に炉を切る「入炉」のひとつで、客付側に炉を切ります。小間（台目畳）の点前で、炉の向こうには小板が入ります。道具の位置が特徴的です。',
      caption: '台目畳（約143×95.5cm）に向切で炉を切った図です。',
      questions: [
        {
          step: '八炉',
          scene: '炉の切り方には何通りかある。',
          items: ['mizusashi@mizu'],
          q: '「八炉」とは何を指すか。',
          a: '四畳半切・台目切・向切・隅炉の四つの切り方に、本勝手・逆勝手を合わせた八通り',
          w: ['一年のうち炉を用いる八か月', '八畳の広間に切る炉', '八種類の炉縁の塗り'],
          exp: '炉の切り方四種 × 本勝手・逆勝手で八通り。これを総称して八炉といいます。'
        },
        {
          step: '炉の位置',
          scene: '向切の点前畳を上から見ている。',
          items: ['mizusashi@mizu'],
          q: '向切の炉はどこに切られているか。',
          a: '点前畳の中（入炉）、客付側',
          w: ['点前畳の外（出炉）の半畳', '点前畳の中の、壁側の隅', '客畳の中央'],
          exp: '点前畳の中に切るのが入炉、外に切るのが出炉。入炉のうち客付側に切るのが向切、壁側に切るのが隅炉です。'
        },
        {
          step: '水指',
          scene: '濃茶の準備をする。',
          items: ['!mizusashi@mizu', 'shifuku@frontC:茶入（仕覆）'],
          q: '向切での水指の位置と、濃茶の準備はどれか。',
          a: '水指は炉の左側の鐶付の位置に置き、水指の前に茶入を荘っておく',
          w: ['水指は炉の右、茶入は炉縁の上に置く', '水指は亭主の左膝の横に置く', '水指は炉の向こうの小板の上に置く'],
          exp: '水指は炉の左、釜の鐶付の高さに置きます。濃茶では水指の前に茶入を荘っておきます。'
        },
        {
          step: '蓋置',
          scene: '建水を持って定座（畳中央）に座った。',
          items: ['mizusashi@mizu', 'chawan@frontL', 'shifuku@frontR', '!kensui@kensui', 'futaoki@kensuiIn', 'hishaku@kensuiSet'],
          q: '蓋置と柄杓の置き方はどれか。',
          a: '蓋置を炉縁の右隅手前（3目）に置き、柄杓を真っすぐに引く',
          w: ['蓋置を炉縁の左角に置き、柄杓を斜めに引く', '蓋置を水指の前に置く', '蓋置を小板の上に置く'],
          exp: '向切は蓋置・柄杓の置き方がいつもと違います。建水は膝ラインより少し控えて進めます。'
        },
        {
          step: '仕覆',
          scene: '茶碗と茶入を取り込み、仕覆を脱がせた。',
          items: ['mizusashi@mizu', 'chawan@knee', '!chaire@mid'].concat(HIKI),
          q: '仕覆の扱いはどれか。',
          a: '火に返して、右手で置く',
          w: ['仕覆は建水に入れる', '左手で客付に置く', '水指の蓋の上に置く'],
          exp: '濃茶の仕覆は火の方に返して右手で置きます。水指の蓋は二手で扱います。'
        },
        {
          step: '棗の位置',
          scene: '（薄茶の場合）棗を清めた。',
          items: ['mizusashi@mizu', 'chawan@knee', '!natsume@nClean', 'chasen@chasenR'].concat(HIKI),
          q: '向切で清めた棗の置き場所はどれか。',
          a: '水指の前の左の方に置き、茶筅は水指正面に置く',
          w: ['水指の前に茶筅と並べて置き合わせる', '炉と水指の間に置く', '膝と茶碗の間に置いたままにする'],
          exp: '棗を清めたあと、水指前に茶筅と置き合わせてしまいがちなので注意します。'
        },
        {
          step: '拝見の前',
          scene: '仕舞いで水指前に茶碗と茶入を置き合わせた。拝見を請われた。',
          items: ['mizusashi@mizu', '!chawan@frontL', 'chaire@frontR', 'kensui@kensui', 'hishaku@kensuiSet', 'futaoki@kensuiIn'],
          q: '忘れやすい所作はどれか。',
          a: '茶碗を右手一手で勝手付に仮置きしてから拝見に出す',
          w: ['茶碗を客付に出してから拝見に出す', '茶碗を拝見物と一緒に出す', '茶碗は置き合わせのまま動かさない'],
          exp: '向切では置き合わせた茶碗がもともと勝手付に近いので、仮置きを忘れがちです。'
        }
      ]
    },

    /* ===== 9. 隅炉 ===== */
    {
      id: 'sumiro',
      group: '八炉',
      tab: '隅炉 濃茶',
      title: '【八炉】隅炉 濃茶点前',
      room: 'sumiro',
      lead: '点前畳の中の壁側の隅に炉を切る入炉。釜が左にあり、風炉を畳に落としたような位置なので、風炉の点前に近い感覚で行えます。',
      caption: '台目畳（約143×95.5cm）に隅炉を切った図です。',
      questions: [
        {
          step: '炉の位置',
          scene: '隅炉の点前畳を上から見ている。',
          items: ['mizusashi@mizu'],
          q: '隅炉の炉はどこに切られているか。',
          a: '点前畳の中（入炉）、壁側の隅',
          w: ['点前畳の中、客付側', '点前畳の外の半畳', '点前畳の手前、茶道口の近く'],
          exp: '入炉のうち壁側に切るのが隅炉、客付側に切るのが向切です。'
        },
        {
          step: '風炉との関係',
          scene: '隅炉の点前の感覚をつかむ。',
          items: ['mizusashi@mizu'],
          q: '隅炉の点前の特徴として正しいのはどれか。',
          a: '釜が左にあり、風炉の点前とほぼ同じ感覚でできる',
          w: ['炉が亭主の正面にあり、向切と同じ扱いになる', '炉が客畳にあり、客に背を向けて点てる', '風炉の季節にだけ行う'],
          exp: '風炉を畳に落としたような位置なので、道具の位置は風炉とほぼ同じです。'
        },
        {
          step: '水指',
          scene: '水指を運び出した。',
          items: ['!mizusashi@mizu'],
          q: '水指の位置はどれか。',
          a: '炉の右側、鐶付の位置',
          w: ['炉の左側の壁際', '亭主の左膝の横', '炉の向こうの小板の上'],
          exp: '水指は炉の右、釜の鐶付の高さに置きます。'
        },
        {
          step: '蓋置',
          scene: '建水を持って定座（畳中央）に座った。',
          items: ['mizusashi@mizu', 'chawan@frontL', 'shifuku@frontR', '!kensui@kensui', 'futaoki@kensuiIn', 'hishaku@kensuiSet'],
          q: '蓋置と柄杓の置き方はどれか。',
          a: '蓋置を炉縁の左隅（3目）に置き、柄杓を膝に向かって斜めに引く',
          w: ['蓋置を炉縁の右隅手前に置き、柄杓を真っすぐ引く', '蓋置を水指の前に置く', '蓋置を炉縁の上に置く'],
          exp: '建水は膝ラインより少し控えて進めます。'
        },
        {
          step: '手数',
          scene: '茶碗を取り込み、のちに水指の蓋を開ける。',
          items: ['!mizusashi@mizu', '!chawan@frontL', 'shifuku@frontR'].concat(HIKI),
          q: '茶碗と水指の蓋の扱いの手数はどれか。',
          a: '茶碗は三手、水指の蓋も三手',
          w: ['茶碗は二手、水指の蓋は二手', '茶碗は一手、水指の蓋は二手', '茶碗は二手、水指の蓋は三手'],
          exp: '隅炉は風炉と同じく茶碗も水蓋も三手。四畳半切の炉では茶碗は二手です。'
        },
        {
          step: '拝見',
          scene: '仕舞い付けを終え、拝見を請われた。',
          items: ['mizusashi@mizu', 'chawan@frontL', '!chaire@frontR', 'kensui@kensui', 'hishaku@kensuiSet', 'futaoki@kensuiIn'].concat(['arrow@frontR>haiken1']),
          q: '濃茶で拝見に出すものはどれか。',
          a: '茶入・茶杓・仕覆',
          w: ['茶入・茶碗', '茶杓のみ', '水指・茶入'],
          exp: '濃茶の拝見物は八炉でも茶入・茶杓・仕覆です。客付へは斜め45度くらいに回って出します。'
        }
      ]
    },

    /* ===== 10. しぼり茶巾・筒茶碗 ===== */
    {
      id: 'shibori',
      group: '応用',
      tab: 'しぼり茶巾・筒茶碗',
      title: 'しぼり茶巾 / 筒茶碗の点前',
      room: 'honkatte',
      lead: '極寒の時期に、茶碗を温めるために行う薄茶点前。深い筒茶碗を用い、茶巾をしぼった形のまま仕込みます。',
      caption: '筒茶碗は直径約9.6cmの円で示しています。',
      questions: [
        {
          step: '時期',
          scene: '筒茶碗を用意する。',
          items: ['mizusashi@mizu', '!tsutsu@frontL', 'natsume@frontR'],
          q: 'しぼり茶巾の点前を行うのはどんなときか。',
          a: '極寒の時期に、茶碗を温めるため',
          w: ['盛夏に、涼しさを演出するため', '客が多く、茶碗が足りないとき', '季節を問わず、濃茶のとき'],
          exp: '口が狭く深い筒茶碗は茶が冷めにくく、寒さの厳しい時期に用います。'
        },
        {
          step: '濃茶か薄茶か',
          scene: 'しぼり茶巾の点前を組む。',
          items: ['mizusashi@mizu', '!tsutsu@frontL', 'natsume@frontR'],
          q: 'しぼり茶巾の点前はどれで行うか。',
          a: '薄茶のみ',
          w: ['濃茶のみ', '濃茶・薄茶のどちらでも', '炭点前のあとの後炭で'],
          exp: 'しぼり茶巾は薄茶のみの点前です。'
        },
        {
          step: '仕込み',
          scene: '筒茶碗に茶巾を仕込む。',
          items: ['mizusashi@mizu', '!tsutsu@frontL', 'natsume@frontR'],
          q: '茶巾の仕込み方はどれか。',
          a: 'しぼった形のままの茶巾を、端を左に向けて筒茶碗に入れる',
          w: ['茶巾をたたんで茶碗の縁に掛ける', '茶巾を乾いたまま入れる', '茶巾は建水に入れて運ぶ'],
          exp: '深い筒茶碗に合わせて、茶巾はしぼった形のまま仕込みます。'
        },
        {
          step: '釜の蓋へ',
          scene: '釜の蓋を蓋置に置き、茶巾を取り出した。',
          items: ['mizusashi@mizu', 'tsutsu@knee', 'natsume@nClean', 'chasen@chasenR', 'kensui@kensui', '!kamabuta@futaoki', '!shibori@futaoki', 'hishaku@onKama'],
          q: 'しぼった茶巾はどうするか。',
          a: 'しぼった形のまま、いったん釜の蓋の上に置く',
          w: ['すぐに広げてたたみ直してから釜の蓋に置く', '建水に入れる', '水指の蓋の上に置く'],
          exp: 'この時点ではたたみ直さず、そのままの形で釜の蓋に置きます。'
        },
        {
          step: 'たたみ直す',
          scene: '湯を入れ、茶筅通しを始めた。',
          items: ['mizusashi@mizu', '!tsutsu@knee', 'natsume@nClean', 'chasen@knee', 'kensui@kensui', 'kamabuta@futaoki', '!shibori@futaoki', 'hishaku@onKama'],
          q: '茶巾をたたみ直すのはいつか。',
          a: '茶筅通しで茶筅を茶碗に置いたら（一回目のコツン）、茶巾を取ってたたみ直し、茶筅通しに戻る',
          w: ['茶を点て終えてから', '茶筅通しを終えて湯を捨てたあと', '仕舞いの茶筅通しのとき'],
          exp: 'たたみ直した茶巾で、ふだんどおり茶碗を拭きます。'
        },
        {
          step: '茶を出す',
          scene: '筒茶碗で薄茶を点てた。',
          items: ['mizusashi@mizu', '!tsutsu@knee', 'natsume@nClean', 'chasen@chasenR', 'arrow@knee>dasu'].concat(YU),
          q: '茶碗の出し方はどれか。',
          a: '正面を客に向けて出す（ふだんの茶碗と同じ）',
          w: ['筒茶碗は横に寝かせて出す', '正面を自分に向けて出す', '貴人台にのせて出す'],
          exp: '茶碗の形が変わっても、正面を客に向けて出すことは同じです。'
        }
      ]
    },

    /* ===== 11. 置炉 ===== */
    {
      id: 'okiro',
      group: '応用',
      tab: '置炉',
      title: '置炉の使い方・お点前',
      room: 'okiro',
      lead: '炉の切られていない部屋でも炉の点前ができるよう、畳の上に置いて使う炉です。置く位置も点前の流れも、ふだんの炉と同じです。',
      caption: '置炉をいつもの炉の位置に据え、炉縁を合わせた図です。',
      questions: [
        {
          step: '置炉とは',
          scene: '炉の切られていない部屋で、炉の季節に稽古をする。',
          items: ['mizusashi@mizu'],
          q: '置炉とはどのようなものか。',
          a: '畳の上に置いて使う炉。灰を入れて炭点前もでき、電熱器を入れて使うこともできる',
          w: ['風炉の季節に炉の代わりに使う火鉢', '炉の灰だけを入れておく箱', '炉縁を外して掃除する道具'],
          exp: '置炉は持ち運びができ、炉を切らなくても炉の点前ができる便利な道具です。'
        },
        {
          step: '季節',
          scene: '置炉を用いる時期を考える。',
          items: ['mizusashi@mizu'],
          q: '置炉を用いるのは主にどの季節か。',
          a: '炉の季節（おおむね十一月から四月）',
          w: ['風炉の季節（五月から十月）', '夏の盛りだけ', '一年中いつでも'],
          exp: '置炉も炉なので、炉開きの十一月から四月までの炉の季節に用います。'
        },
        {
          step: '置く位置',
          scene: '置炉を据える。',
          items: ['mizusashi@mizu'],
          q: '置炉を置く位置はどれか。',
          a: 'いつもの炉の位置と同じにし、炉縁をきちんと合わせる',
          w: ['点前畳の中央に置く', '亭主の右膝の横に置く', '客畳の中央に置く'],
          exp: '置く位置が同じなので、点前座・客付・勝手付の位置も、蓋置の位置（3目）も変わりません。'
        },
        {
          step: '柄杓',
          scene: '湯を汲み、柄杓を釜にかけた。',
          items: ['mizusashi@mizu', 'chawan@knee', 'natsume@nClean', 'chasen@chasenR', '!hishaku@onKama', 'kensui@kensui', 'kamabuta@futaoki', 'chakin@futaoki'],
          q: '置炉で柄杓を釜にかけるときの注意はどれか。',
          a: '釜が高いので切止めが畳に付かず浮くため、内隅（外隅）を狙ってそっと手を離す',
          w: ['柄杓は釜にかけず、建水にかける', '切止めを畳に押し付けて置く', '柄杓を炉縁の上に横たえる'],
          exp: '置炉は釜が高くなるのが特徴。柄杓がやや不安定になるので、ゆっくり手を離します。'
        },
        {
          step: '見え方',
          scene: '置炉で点前をしている。',
          items: U_SET.concat(HIKI),
          q: '置炉の点前で起こりやすいことはどれか。',
          a: '釜が高いぶん、正客から手元が見えにくい',
          w: ['釜が低いので湯が汲みにくい', '炉縁が客に近すぎて危ない', '水指が置けない'],
          exp: '次客・三客からは見えますが、正客からは見えにくくなります。出されたお茶や水指は見えるので、問答の間合いには困りません。'
        },
        {
          step: '運び出し',
          scene: '置炉を据えた部屋で、薄茶運び点前を始める。',
          items: ['host@door'],
          q: '最初に運び出す道具はどれか。',
          a: '水指',
          w: ['建水', '茶碗と棗', '柄杓と蓋置'],
          exp: '置炉でも運び点前の順は「水指 → 茶碗・棗 → 建水」。流れはふだんの炉点前と同じです。'
        }
      ]
    }
  ];

  /* ---------------------------------------------------------
     3. SVG 描画（1単位 ＝ 1cm）
     --------------------------------------------------------- */
  const SVG_DEFS =
    '<defs>' +
    // 畳目：京間は1目≒1.5cm。横長の点前畳では目が横方向に並ぶ
    '<pattern id="tmH" width="6" height="' + METSU + '" patternUnits="userSpaceOnUse">' +
    '<rect width="6" height="' + METSU + '" fill="#cfc58d"/><line x1="0" y1="' + (METSU - 0.15) + '" x2="6" y2="' + (METSU - 0.15) + '" stroke="#bcb174" stroke-width=".3"/></pattern>' +
    '<pattern id="tmV" width="' + METSU + '" height="6" patternUnits="userSpaceOnUse">' +
    '<rect width="' + METSU + '" height="6" fill="#c2b87c"/><line x1="' + (METSU - 0.15) + '" y1="0" x2="' + (METSU - 0.15) + '" y2="6" stroke="#aea468" stroke-width=".3"/></pattern>' +
    '<pattern id="tmHo" width="6" height="' + METSU + '" patternUnits="userSpaceOnUse">' +
    '<rect width="6" height="' + METSU + '" fill="#c2b87c"/><line x1="0" y1="' + (METSU - 0.15) + '" x2="6" y2="' + (METSU - 0.15) + '" stroke="#aea468" stroke-width=".3"/></pattern>' +
    '<linearGradient id="woodG" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#7d5635"/><stop offset="1" stop-color="#4f341f"/></linearGradient>' +
    '<linearGradient id="boardG" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#b08a5c"/><stop offset="1" stop-color="#9a7449"/></linearGradient>' +
    '<radialGradient id="kamaG" cx=".4" cy=".35" r=".7"><stop offset="0" stop-color="#5b5550"/><stop offset="1" stop-color="#26221f"/></radialGradient>' +
    '<radialGradient id="waterG" cx=".45" cy=".4" r=".7"><stop offset="0" stop-color="#6d8d98"/><stop offset="1" stop-color="#34505a"/></radialGradient>' +
    '<marker id="arrowHead" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">' +
    '<path d="M0,0 L10,5 L0,10 z" fill="#b8431f"/></marker>' +
    '</defs>';

  const Z = { nagaita: 0, tana: 0, kobukusa: 1, kijindai: 1, hishaku: 4, chashaku: 5, kamabuta: 3, chakin: 4, shibori: 4, chasen: 3, host: 6, arrow: 7 };

  function f(n) { return Math.round(n * 10) / 10; }

  function parseItem(spec) {
    let s = spec;
    let hl = false;
    let label = null;
    if (s.charAt(0) === '!') { hl = true; s = s.slice(1); }
    const li = s.indexOf(':');
    if (li >= 0) { label = s.slice(li + 1); s = s.slice(0, li); }
    const parts = s.split('@');
    return { type: parts[0], pos: parts[1] || parts[0], hl: hl, label: label };
  }

  function mergeItems(list) {
    const map = new Map();
    list.forEach(function (spec) {
      const it = parseItem(spec);
      const key = it.type + '@' + it.pos;
      if (map.has(key)) {
        const prev = map.get(key);
        prev.hl = prev.hl || it.hl;
        if (it.label) prev.label = it.label;
      } else {
        map.set(key, it);
      }
    });
    return Array.from(map.values());
  }

  function tatami(x, y, w, h, fill, heri) {
    // heri: 'tb' 上下の長辺に縁 / 'lr' 左右の長辺に縁
    let s = '<rect x="' + f(x) + '" y="' + f(y) + '" width="' + f(w) + '" height="' + f(h) + '" fill="' + fill + '"/>';
    const t = 2.6;
    if (heri === 'tb') {
      s += '<rect x="' + f(x) + '" y="' + f(y) + '" width="' + f(w) + '" height="' + t + '" fill="#27312a"/>';
      s += '<rect x="' + f(x) + '" y="' + f(y + h - t) + '" width="' + f(w) + '" height="' + t + '" fill="#27312a"/>';
    } else if (heri === 'lr') {
      s += '<rect x="' + f(x) + '" y="' + f(y) + '" width="' + t + '" height="' + f(h) + '" fill="#27312a"/>';
      s += '<rect x="' + f(x + w - t) + '" y="' + f(y) + '" width="' + t + '" height="' + f(h) + '" fill="#27312a"/>';
    }
    s += '<rect x="' + f(x) + '" y="' + f(y) + '" width="' + f(w) + '" height="' + f(h) + '" fill="none" stroke="#6f6640" stroke-width=".4"/>';
    return s;
  }

  function floorLayer(room) {
    let s = '<rect x="0" y="0" width="300" height="240" fill="#b3a870"/>';
    if (room.mat === 'yojo') {
      // 四畳半：点前畳（京間 191×95.5）、向こうに半畳、右に客畳
      s += tatami(30, 14.5, 95.5, 95.5, 'url(#tmV)', 'lr');          // 左上の畳（一部）
      s += tatami(125.5, 14.5, 95.5, 95.5, 'url(#tmHo)', 'tb');      // 半畳（炉を切る）
      s += tatami(221, 14.5, 95.5, 191, 'url(#tmV)', 'lr');          // 客畳
      s += tatami(30, 205.5, 191, 95.5, 'url(#tmHo)', 'tb');         // 手前の畳（一部）
      s += tatami(30, MAT_Y, 191, MAT_D, 'url(#tmH)', 'tb');         // 点前畳
      s += '<text class="lbl-mat" x="75" y="' + (MAT_Y + 50) + '" text-anchor="middle">点前畳</text>';
      s += '<text class="lbl-dir" x="262" y="96" text-anchor="middle">客畳</text>';
      s += '<text class="lbl-dir" x="262" y="106" text-anchor="middle">（客付 →）</text>';
      s += '<text class="lbl-dir" x="78" y="60" text-anchor="middle">向こう ↑</text>';
    } else {
      // 小間：台目畳（143.25×95.5）の点前畳、向こうに客畳、右に板
      const w = 191 * 0.75;
      s += tatami(30, 14.5, 191, 95.5, 'url(#tmHo)', 'tb');          // 客畳
      s += '<rect x="' + f(30 + w) + '" y="' + MAT_Y + '" width="' + f(191 - w) + '" height="' + MAT_D + '" fill="url(#boardG)" stroke="#6b5132" stroke-width=".4"/>';
      s += tatami(30, MAT_Y, w, MAT_D, 'url(#tmH)', 'tb');           // 台目畳
      s += '<text class="lbl-dir" x="' + f(30 + w - 3) + '" y="' + (MAT_Y + MAT_D - 5) + '" text-anchor="end">点前畳（台目）</text>';
      s += '<text class="lbl-dir" x="125" y="58" text-anchor="middle">客畳（客座）</text>';
    }
    // 勝手付の壁と茶道口
    s += '<rect x="24" y="10" width="6" height="' + (MAT_Y + 5 - 10) + '" fill="#6b5a44"/>';
    s += '<rect x="24" y="' + (MAT_Y + 90) + '" width="6" height="40" fill="#6b5a44"/>';
    s += '<text class="lbl-dir" x="12" y="' + (MAT_Y + 12) + '" text-anchor="middle">茶道口</text>';
    s += '<text class="lbl-dir" x="12" y="60" text-anchor="middle">勝手付</text>';
    s += '<text class="lbl-dir" x="' + (room.mat === 'yojo' ? 75 : 55) + '" y="' + (MAT_Y + MAT_D + 12) + '" text-anchor="middle">手前 ↓</text>';
    // 縮尺
    s += '<g transform="translate(236,222)"><line x1="0" y1="0" x2="30" y2="0" stroke="#3b3528" stroke-width=".8"/>' +
      '<line x1="0" y1="-2" x2="0" y2="2" stroke="#3b3528" stroke-width=".8"/><line x1="30" y1="-2" x2="30" y2="2" stroke="#3b3528" stroke-width=".8"/>' +
      '<text class="lbl-dir" x="15" y="9" text-anchor="middle">30cm</text></g>';
    return s;
  }

  function roLayer(room, kamaOpen) {
    const r = room.ro;
    const s0 = RO;
    const cx = r.x + s0 / 2;
    const cy = r.y + s0 / 2;
    let s = '';
    if (r.koita) {
      // 入炉：炉の向こうに小板
      s += '<rect x="' + f(r.x) + '" y="' + MAT_Y + '" width="' + s0 + '" height="' + f(r.y - MAT_Y) + '" fill="url(#boardG)" stroke="#6b5132" stroke-width=".4"/>';
      s += '<text class="lbl-dir" x="' + f(cx) + '" y="' + f(MAT_Y + (r.y - MAT_Y) / 2 + 2.4) + '" text-anchor="middle">小板</text>';
    }
    if (r.kind === 'oki') {
      s += '<rect x="' + f(r.x + 2.5) + '" y="' + f(r.y + 3) + '" width="' + (s0 + 1) + '" height="' + (s0 + 1) + '" rx="1.5" fill="rgba(40,25,10,.3)"/>';
    }
    s += '<rect x="' + f(r.x) + '" y="' + f(r.y) + '" width="' + s0 + '" height="' + s0 + '" fill="url(#woodG)" stroke="#2c1d10" stroke-width=".6"/>';
    s += '<rect x="' + f(r.x + 4.5) + '" y="' + f(r.y + 4.5) + '" width="' + (s0 - 9) + '" height="' + (s0 - 9) + '" fill="#a79d8e"/>';
    // 釜（直径約28cm）と鐶付
    s += '<rect x="' + f(cx - 16.5) + '" y="' + f(cy - 1.6) + '" width="3.2" height="3.2" fill="#2a2622"/>';
    s += '<rect x="' + f(cx + 13.3) + '" y="' + f(cy - 1.6) + '" width="3.2" height="3.2" fill="#2a2622"/>';
    s += '<circle cx="' + f(cx) + '" cy="' + f(cy) + '" r="14" fill="url(#kamaG)" stroke="#1c1916" stroke-width=".6"/>';
    if (kamaOpen) {
      s += '<circle cx="' + f(cx) + '" cy="' + f(cy) + '" r="8.5" fill="url(#waterG)"/>';
    } else {
      s += '<circle cx="' + f(cx) + '" cy="' + f(cy) + '" r="8.5" fill="#4a4540" stroke="#2a2622" stroke-width=".5"/>';
      s += '<circle cx="' + f(cx) + '" cy="' + f(cy) + '" r="1.8" fill="#2a2622"/>';
    }
    const roName = r.kind === 'oki' ? '置炉' : '炉';
    s += '<text class="lbl" x="' + f(r.x + s0 + 2.5) + '" y="' + f(r.y + 7) + '">' + roName + '</text>';
    s += '<text class="lbl" x="' + f(r.x + s0 + 2.5) + '" y="' + f(r.y + 16) + '">釜</text>';
    return s;
  }

  function ring(x, y, rad) {
    return '<circle class="hl-ring" cx="' + f(x) + '" cy="' + f(y) + '" r="' + f(rad) + '"/>';
  }

  function labelAt(x, y, side, rad, text) {
    if (!text || side === 'n') return '';
    const gap = rad + 2.5;
    let tx = x, ty = y, anchor = 'middle';
    if (side === 'b') { ty = y + gap + 6; }
    else if (side === 't') { ty = y - gap - 1; }
    else if (side === 'l') { tx = x - gap; ty = y + 2.6; anchor = 'end'; }
    else if (side === 'r') { tx = x + gap; ty = y + 2.6; anchor = 'start'; }
    else if (side === 'tl') { tx = x - rad * 0.8; ty = y - rad * 0.8 - 1; anchor = 'end'; }
    else if (side === 'tr') { tx = x + rad * 0.8; ty = y - rad * 0.8 - 1; anchor = 'start'; }
    return '<text class="lbl" x="' + f(tx) + '" y="' + f(ty) + '" text-anchor="' + anchor + '">' + text + '</text>';
  }

  function drawItem(it, room) {
    const name = it.label || NAMES[it.type] || '';
    let shape = '';
    let lbl = '';

    if (it.type === 'tana' || it.type === 'nagaita') {
      const rc = room.rects[it.pos];
      if (!rc) return { shape: '', lbl: '' };
      const x = rc[0], y = rc[1], w = rc[2], h = rc[3];
      if (it.type === 'tana') {
        shape += '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" fill="rgba(30,20,12,.18)" stroke="#2b1b10" stroke-width=".9"/>';
        shape += '<rect x="' + (x + 1) + '" y="' + (y + 1) + '" width="' + (w - 2) + '" height="' + (h - 2) + '" fill="none" stroke="#a8412f" stroke-width=".6"/>';
        lbl = '<text class="lbl" x="' + (x - 2) + '" y="' + f(y + h / 2 - 2) + '" text-anchor="end">' + name + '</text>';
      } else {
        shape += '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx=".6" fill="#2e2019" stroke="#120b07" stroke-width=".6"/>';
        lbl = '<text class="lbl" x="' + f(x - 2) + '" y="' + f(y + h - 1) + '" text-anchor="end">' + name + '</text>';
      }
      if (it.hl) shape += '<rect class="hl-ring" x="' + (x - 2) + '" y="' + (y - 2) + '" width="' + (w + 4) + '" height="' + (h + 4) + '"/>';
      return { shape: shape, lbl: lbl };
    }

    if (it.type === 'hishaku') {
      const h = room.hishaku[it.pos];
      if (!h) return { shape: '', lbl: '' };
      shape += '<line x1="' + h[0] + '" y1="' + h[1] + '" x2="' + h[2] + '" y2="' + h[3] + '" stroke="#c9ad73" stroke-width="1.4" stroke-linecap="round"/>';
      shape += '<circle cx="' + h[0] + '" cy="' + h[1] + '" r="3.8" fill="#d8bf86" stroke="#7a5a2c" stroke-width=".6"/>';
      if (it.hl) shape += ring(h[0], h[1], 7);
      lbl = '<text class="lbl" x="' + f(h[2] + 3) + '" y="' + f(h[3] + 2) + '">' + name + '</text>';
      return { shape: shape, lbl: lbl };
    }

    if (it.type === 'arrow') {
      const ends = it.pos.split('>');
      const a = room.pos[ends[0]], b = room.pos[ends[1]];
      if (!a || !b) return { shape: '', lbl: '' };
      const dx = b[0] - a[0], dy = b[1] - a[1];
      const len = Math.sqrt(dx * dx + dy * dy) || 1;
      const ux = dx / len, uy = dy / len;
      const sx = a[0] + ux * 8, sy = a[1] + uy * 8;
      const ex = b[0] - ux * 8, ey = b[1] - uy * 8;
      const cx = (sx + ex) / 2 - uy * 7, cy = (sy + ey) / 2 + ux * 7;
      shape = '<path class="arrow-path" d="M' + f(sx) + ',' + f(sy) + ' Q' + f(cx) + ',' + f(cy) + ' ' + f(ex) + ',' + f(ey) + '" marker-end="url(#arrowHead)"/>';
      return { shape: shape, lbl: '' };
    }

    const p = room.pos[it.pos];
    if (!p) return { shape: '', lbl: '' };
    const x = p[0], y = p[1], side = p[2] || 'b', ang = p[3] || 0;
    const rad = R[it.type] || 5;

    switch (it.type) {
      case 'mizusashi':
        shape += '<circle cx="' + x + '" cy="' + y + '" r="10" fill="#6c7f84" stroke="#3d4b4f" stroke-width=".7"/>';
        shape += '<circle cx="' + x + '" cy="' + y + '" r="8" fill="#1f1b18"/>';
        shape += '<circle cx="' + x + '" cy="' + f(y - 1) + '" r="1.2" fill="#8a7a5a"/>';
        break;
      case 'chawan':
      case 'tomo':
        shape += '<circle cx="' + x + '" cy="' + y + '" r="6.2" fill="' + (it.type === 'tomo' ? '#7f8c6a' : '#a8703f') + '" stroke="#5a3a1e" stroke-width=".6"/>';
        shape += '<circle cx="' + x + '" cy="' + y + '" r="4.4" fill="' + (it.type === 'tomo' ? '#c8cfae' : '#d7b98a') + '"/>';
        break;
      case 'tsutsu':
        shape += '<circle cx="' + x + '" cy="' + y + '" r="4.8" fill="#6f5a45" stroke="#3b2c1e" stroke-width=".6"/>';
        shape += '<circle cx="' + x + '" cy="' + y + '" r="3.4" fill="#3b2f25"/>';
        break;
      case 'natsume':
        shape += '<circle cx="' + x + '" cy="' + y + '" r="3.6" fill="#1d1916" stroke="#000" stroke-width=".3"/>';
        shape += '<path d="M' + f(x - 2) + ',' + f(y - 1.5) + ' A2.5,2.5 0 0 1 ' + f(x + 1) + ',' + f(y - 2.4) + '" fill="none" stroke="rgba(255,255,255,.5)" stroke-width=".6"/>';
        break;
      case 'chaire':
        shape += '<circle cx="' + x + '" cy="' + y + '" r="3.4" fill="#6b3f1f" stroke="#3a2210" stroke-width=".4"/>';
        shape += '<circle cx="' + x + '" cy="' + y + '" r="1.9" fill="#e5dcc2"/>';
        break;
      case 'shifuku':
        shape += '<circle cx="' + x + '" cy="' + y + '" r="4.3" fill="#8c6a2f" stroke="#4a3714" stroke-width=".5"/>';
        shape += '<circle cx="' + x + '" cy="' + y + '" r="2.8" fill="none" stroke="#e1c77c" stroke-width=".5" stroke-dasharray="1 .8"/>';
        shape += '<line x1="' + x + '" y1="' + f(y + 1) + '" x2="' + f(x + 2) + '" y2="' + f(y + 6) + '" stroke="#b33d2a" stroke-width=".6"/>';
        break;
      case 'shifukuOnly':
        shape += '<path d="M' + f(x - 4) + ',' + f(y + 3) + ' Q' + x + ',' + f(y - 6) + ' ' + f(x + 4) + ',' + f(y + 3) + ' Z" fill="#8c6a2f" stroke="#4a3714" stroke-width=".5"/>';
        break;
      case 'kensui':
        shape += '<circle cx="' + x + '" cy="' + y + '" r="7.5" fill="#6b706b" stroke="#3b3f3b" stroke-width=".7"/>';
        shape += '<circle cx="' + x + '" cy="' + y + '" r="5.5" fill="#43474a"/>';
        break;
      case 'futaoki':
        shape += '<circle cx="' + x + '" cy="' + y + '" r="2.8" fill="#a88b52" stroke="#5f4a22" stroke-width=".5"/>';
        shape += '<circle cx="' + x + '" cy="' + y + '" r="1.5" fill="#7f6536"/>';
        break;
      case 'kamabuta':
        shape += '<circle cx="' + x + '" cy="' + y + '" r="8.5" fill="#4a4540" stroke="#2a2622" stroke-width=".5"/>';
        shape += '<circle cx="' + x + '" cy="' + y + '" r="1.6" fill="#2a2622"/>';
        break;
      case 'chakin':
        shape += '<rect x="' + f(x - 3.5) + '" y="' + f(y - 2) + '" width="7" height="4" rx=".6" fill="#f7f5ee" stroke="#b9b3a2" stroke-width=".4"/>';
        break;
      case 'shibori':
        shape += '<path d="M' + f(x - 4) + ',' + y + ' q2,-2.5 4,0 t4,0" fill="none" stroke="#f7f5ee" stroke-width="2.2" stroke-linecap="round"/>';
        shape += '<path d="M' + f(x - 4) + ',' + y + ' q2,-2.5 4,0 t4,0" fill="none" stroke="#b9b3a2" stroke-width=".4"/>';
        break;
      case 'chasen':
        shape += '<circle cx="' + x + '" cy="' + y + '" r="3" fill="#efe4c1" stroke="#9c8a55" stroke-width=".4"/>';
        for (let i = 0; i < 8; i++) {
          const a2 = i * Math.PI / 4;
          shape += '<line x1="' + x + '" y1="' + y + '" x2="' + f(x + Math.cos(a2) * 2.6) + '" y2="' + f(y + Math.sin(a2) * 2.6) + '" stroke="#b6a46c" stroke-width=".25"/>';
        }
        break;
      case 'chashaku': {
        const a3 = (ang || -20) * Math.PI / 180;
        const hx = Math.cos(a3) * 9, hy = Math.sin(a3) * 9;
        shape += '<line x1="' + f(x - hx) + '" y1="' + f(y - hy) + '" x2="' + f(x + hx) + '" y2="' + f(y + hy) + '" stroke="#d9c188" stroke-width="1.1" stroke-linecap="round"/>';
        shape += '<line x1="' + f(x - hx) + '" y1="' + f(y - hy) + '" x2="' + f(x + hx) + '" y2="' + f(y + hy) + '" stroke="#8a6f3a" stroke-width=".3"/>';
        break;
      }
      case 'kijindai':
        shape += '<rect x="' + (x - 10) + '" y="' + (y - 10) + '" width="20" height="20" rx="1.5" fill="#d8bf8e" stroke="#8a6a3c" stroke-width=".6"/>';
        shape += '<circle cx="' + x + '" cy="' + y + '" r="8" fill="none" stroke="#8a6a3c" stroke-width=".4"/>';
        break;
      case 'kobukusa':
        shape += '<rect x="' + (x - 7.75) + '" y="' + (y - 7.75) + '" width="15.5" height="15.5" fill="#6b2f3a" stroke="#3d161d" stroke-width=".4"/>';
        shape += '<rect x="' + (x - 6.5) + '" y="' + (y - 6.5) + '" width="13" height="13" fill="none" stroke="#c9a45a" stroke-width=".3" stroke-dasharray="1 1"/>';
        break;
      case 'shakutate':
        shape += '<circle cx="' + x + '" cy="' + y + '" r="4.5" fill="#8e9696" stroke="#4e5656" stroke-width=".5"/>';
        shape += '<circle cx="' + f(x - 1.2) + '" cy="' + f(y - 0.6) + '" r="1.6" fill="#d8bf86" stroke="#7a5a2c" stroke-width=".3"/>';
        shape += '<circle cx="' + f(x + 1.6) + '" cy="' + f(y + 0.8) + '" r=".6" fill="#2b2b2b"/><circle cx="' + f(x + 1.9) + '" cy="' + f(y - 0.6) + '" r=".6" fill="#2b2b2b"/>';
        break;
      case 'hibashi':
        shape += '<line x1="' + f(x - 1) + '" y1="' + f(y - 14) + '" x2="' + f(x - 1) + '" y2="' + f(y + 14) + '" stroke="#2b2b2b" stroke-width=".9"/>';
        shape += '<line x1="' + f(x + 1) + '" y1="' + f(y - 14) + '" x2="' + f(x + 1) + '" y2="' + f(y + 14) + '" stroke="#2b2b2b" stroke-width=".9"/>';
        break;
      case 'host':
        shape += '<g transform="translate(' + x + ',' + y + ') rotate(' + ang + ')">' +
          '<ellipse cx="0" cy="-9" rx="16" ry="7" fill="#6b7b62" stroke="#2c3627" stroke-width=".5"/>' +
          '<ellipse cx="0" cy="3" rx="21" ry="11" fill="#4d5b45" stroke="#2c3627" stroke-width=".6"/>' +
          '<circle cx="0" cy="3" r="8" fill="#2b2622"/></g>';
        break;
      default:
        shape += '<circle cx="' + x + '" cy="' + y + '" r="4" fill="#888"/>';
    }
    if (it.hl) shape += ring(x, y, rad + 3.5);

    if (it.hidden) {
      lbl = '';
    } else if (it.type === 'host') {
      lbl = labelAt(x, y, side, 13, it.label || p[4] || name);
    } else {
      lbl = labelAt(x, y, side, rad, it.labelText || name);
    }
    return { shape: shape, lbl: lbl };
  }

  function arrangeLabels(items) {
    const at = function (type, pos) { return items.find(function (o) { return o.type === type && o.pos === pos; }); };
    items.forEach(function (it) {
      if (it.type === 'futaoki' && at('kamabuta', it.pos)) it.hidden = true;
      if (it.type === 'kamabuta') {
        const onTop = at('chakin', it.pos) ? '・茶巾' : (at('shibori', it.pos) ? '・しぼり茶巾' : '');
        it.labelText = '釜の蓋' + onTop;
      }
      if (it.type === 'chakin' && at('kamabuta', it.pos)) it.hidden = true;
      if (it.type === 'shibori' && at('kamabuta', it.pos)) it.hidden = true;
      if (it.type === 'chashaku') {
        const base = at('natsume', it.pos) || at('chaire', it.pos);
        if (base) { it.hidden = true; base.labelText = (base.label || NAMES[base.type]) + '・茶杓'; }
      }
      if (/^mz/.test(it.pos)) it.hidden = true;
      if (it.type === 'mizusashi' && items.some(function (o) { return /^mz/.test(o.pos); })) {
        it.labelText = '水指（蓋に茶巾・茶筅・茶杓）';
      }
      if (it.type === 'shifuku' && at('chawan', it.pos)) it.hidden = true;
      if (it.type === 'chasen' && at('tsutsu', it.pos)) it.hidden = true;
      if (it.type === 'chaire' && at('kobukusa', it.pos)) { it.hidden = true; }
      if (it.type === 'kobukusa' && at('chaire', it.pos)) it.labelText = '茶入（古帛紗の上）';
      if (it.type === 'chawan' && at('kijindai', it.pos)) it.hidden = true;
      if (it.type === 'kijindai' && at('chawan', it.pos)) it.labelText = '茶碗（貴人台）';
    });
  }

  function buildSVG(temae, q, showGuide) {
    const room = ROOMS[temae.room];
    const list = (temae.base || []).concat(q.items || []);
    let items = mergeItems(list);
    if (!showGuide) {
      // ガイドなし：注目の輪と動きの矢印を出さない
      items = items.filter(function (i) { return i.type !== 'arrow'; });
      items.forEach(function (i) { i.hl = false; });
    }
    if (!items.some(function (i) { return i.type === 'host'; })) {
      items.push({ type: 'host', pos: 'host', hl: false, label: null });
    }
    const kamaOpen = items.some(function (i) { return i.type === 'kamabuta'; });
    arrangeLabels(items);

    items.sort(function (a, b) {
      const za = Z[a.type] !== undefined ? Z[a.type] : 2;
      const zb = Z[b.type] !== undefined ? Z[b.type] : 2;
      return za - zb;
    });

    let shapes = '';
    let labels = '';
    items.forEach(function (it) {
      const d = drawItem(it, room);
      shapes += d.shape;
      labels += d.lbl;
    });

    const aria = temae.title + 'の配置図：' + items
      .filter(function (i) { return i.type !== 'arrow'; })
      .map(function (i) { return i.label || NAMES[i.type]; })
      .filter(Boolean).join('、');

    return '<svg viewBox="0 0 300 240" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="' + esc(aria) + '">' +
      SVG_DEFS + floorLayer(room) + roLayer(room, kamaOpen) + shapes + labels + '</svg>';
  }

  /* ---------------------------------------------------------
     4. クイズ進行
     --------------------------------------------------------- */
  const KANA = ['イ', 'ロ', 'ハ', 'ニ'];
  const STORE_KEY = 'ro-temae-best-v1';

  const state = {
    temae: null,
    idx: 0,
    score: 0,
    answered: false,
    order: [],
    misses: [],
    mode: 'quiz',
    finished: false,
    guide: loadGuide()
  };

  const $tabs = document.getElementById('tabs');
  const $panel = document.getElementById('panel');
  const $diagram = document.getElementById('diagram');
  const $caption = document.getElementById('diagramCaption');
  const $title = document.getElementById('temaeTitle');
  const $lead = document.getElementById('temaeLead');
  const $group = document.getElementById('temaeGroup');
  const modeBtns = Array.prototype.slice.call(document.querySelectorAll('.mode-btn[data-mode]'));
  const guideBtns = Array.prototype.slice.call(document.querySelectorAll('.guide-btn'));

  function loadGuide() {
    try { return localStorage.getItem('ro-temae-guide-v1') !== 'off'; } catch (e) { return true; }
  }

  function saveGuide(on) {
    try { localStorage.setItem('ro-temae-guide-v1', on ? 'on' : 'off'); } catch (e) { /* 保存できない環境では無視 */ }
  }

  function esc(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function loadBest() {
    try { return JSON.parse(localStorage.getItem(STORE_KEY)) || {}; }
    catch (e) { return {}; }
  }

  function saveBest(id, score, total) {
    try {
      const best = loadBest();
      const prev = best[id];
      if (!prev || score / total > prev.score / prev.total) {
        best[id] = { score: score, total: total };
        localStorage.setItem(STORE_KEY, JSON.stringify(best));
      }
    } catch (e) { /* 保存できない環境では無視 */ }
  }

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  function renderTabs() {
    const best = loadBest();
    $tabs.innerHTML = TEMAE.map(function (t) {
      const b = best[t.id];
      const bestTxt = b ? '最高 ' + b.score + '/' + b.total : '';
      const selected = state.temae && state.temae.id === t.id;
      return '<button type="button" class="tab" role="tab" id="tab-' + t.id + '" data-id="' + t.id + '"' +
        ' aria-selected="' + (selected ? 'true' : 'false') + '" tabindex="' + (selected ? '0' : '-1') + '"' +
        ' aria-controls="panel">' +
        '<span class="tab-group">【' + esc(t.group) + '】</span>' +
        '<span class="tab-name">' + esc(t.tab) + '</span>' +
        (bestTxt ? '<span class="tab-best">' + bestTxt + '</span>' : '') +
        '</button>';
    }).join('');
  }

  function selectTemae(id, focusTab) {
    const t = TEMAE.find(function (x) { return x.id === id; }) || TEMAE[0];
    state.temae = t;
    resetQuiz();
    $group.textContent = t.group === '八炉' ? '八炉' : (t.group === '応用' ? '応用の点前' : '炉の点前');
    $title.textContent = t.title;
    $lead.textContent = t.lead;
    renderTabs();
    const tabEl = document.getElementById('tab-' + t.id);
    if (tabEl) {
      tabEl.scrollIntoView({ block: 'nearest', inline: 'center' });
      if (focusTab) tabEl.focus();
    }
    if (history.replaceState) history.replaceState(null, '', '#' + t.id);
    render();
  }

  function resetQuiz() {
    state.idx = 0;
    state.score = 0;
    state.answered = false;
    state.finished = false;
    state.misses = [];
    prepareOrder();
  }

  function prepareOrder() {
    const q = state.temae.questions[state.idx];
    if (!q) return;
    state.order = shuffle([{ text: q.a, ok: true }].concat(q.w.map(function (w) { return { text: w, ok: false }; })));
  }

  function setDiagram(q, showGuide) {
    $diagram.innerHTML = buildSVG(state.temae, q, showGuide);
    const room = ROOMS[state.temae.room];
    let cap = '上から見た配置図（' + room.label + '／実寸比・京間）。';
    if (showGuide) cap += '点線の輪は注目する道具、矢印は道具の動きです。';
    else cap += 'ガイドなし：答えると注目する道具と動きを表示します。';
    if (state.temae.caption) cap += ' ' + state.temae.caption;
    $caption.textContent = cap;
  }

  function renderGuideBtns() {
    guideBtns.forEach(function (b) {
      const on = (b.dataset.guide === 'on') === state.guide;
      b.classList.toggle('is-active', on);
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
  }

  function render() {
    renderGuideBtns();
    modeBtns.forEach(function (b) {
      const on = b.dataset.mode === state.mode;
      b.classList.toggle('is-active', on);
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
    if (state.mode === 'steps') { renderSteps(0); return; }
    if (state.finished) { renderResult(); return; }
    renderQuestion();
  }

  function renderQuestion() {
    const t = state.temae;
    const q = t.questions[state.idx];
    const total = t.questions.length;
    setDiagram(q, state.guide);

    const pct = Math.round((state.idx / total) * 100);
    let html = '';
    html += '<div class="progress-row"><span>場面 <strong>' + (state.idx + 1) + '</strong> / ' + total + '</span>' +
      '<span>正解 <strong>' + state.score + '</strong></span></div>';
    html += '<div class="bar" aria-hidden="true"><span style="width:' + pct + '%"></span></div>';
    html += '<p class="step-name">' + esc(q.step) + '</p>';
    html += '<p class="scene">' + esc(q.scene) + '</p>';
    html += '<h3 class="question" id="qText">' + esc(q.q) + '</h3>';
    html += '<ul class="choices" role="list" aria-labelledby="qText">';
    state.order.forEach(function (c, i) {
      html += '<li><button type="button" class="choice" data-i="' + i + '">' +
        '<span class="choice-kana" aria-hidden="true">' + KANA[i] + '</span>' +
        '<span>' + esc(c.text) + '</span></button></li>';
    });
    html += '</ul>';
    html += '<div id="fb"></div>';
    $panel.innerHTML = html;
  }

  function answer(i) {
    if (state.answered) return;
    state.answered = true;
    const t = state.temae;
    const q = t.questions[state.idx];
    const picked = state.order[i];
    const ok = picked.ok;
    if (ok) state.score++;
    else state.misses.push(state.idx);

    const btns = $panel.querySelectorAll('.choice');
    btns.forEach(function (b, k) {
      b.disabled = true;
      if (state.order[k].ok) b.classList.add('is-correct');
      else if (k === i) b.classList.add('is-wrong');
      else b.classList.add('is-dim');
    });

    if (!state.guide) setDiagram(q, true);   // 解答後はガイドを表示して確認

    const isLast = state.idx === t.questions.length - 1;
    let fb = '<div class="feedback ' + (ok ? 'ok' : 'ng') + '">';
    fb += '<p class="feedback-head">' + (ok ? '正解' : '不正解') + '</p>';
    if (!ok) fb += '<p class="answer-line">正しくは「' + esc(q.a) + '」</p>';
    fb += '<p>' + esc(q.exp) + '</p></div>';
    fb += '<div class="actions">' +
      '<button type="button" class="btn btn-primary" data-act="next">' + (isLast ? '結果を見る' : '次の場面へ') + '</button>' +
      '<button type="button" class="btn" data-act="retry">最初からやり直す</button></div>';
    document.getElementById('fb').innerHTML = fb;

    // スコア表示更新
    const strongs = $panel.querySelectorAll('.progress-row strong');
    if (strongs[1]) strongs[1].textContent = state.score;
    const nextBtn = $panel.querySelector('[data-act="next"]');
    if (nextBtn) nextBtn.focus({ preventScroll: true });
    const fbEl = document.getElementById('fb');
    if (fbEl && window.innerWidth < 880) fbEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function next() {
    const t = state.temae;
    if (state.idx < t.questions.length - 1) {
      state.idx++;
      state.answered = false;
      prepareOrder();
      renderQuestion();
      scrollToStage();
    } else {
      state.finished = true;
      saveBest(t.id, state.score, t.questions.length);
      renderTabs();
      renderResult();
      scrollToStage();
    }
  }

  function scrollToStage() {
    if (window.innerWidth < 880) {
      document.querySelector('.stage').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  function renderResult() {
    const t = state.temae;
    const total = t.questions.length;
    const s = state.score;
    const rate = s / total;
    let msg;
    if (rate === 1) msg = '全問正解です。手順が身についています。次は所作の美しさと心配りを意識して。';
    else if (rate >= 0.8) msg = 'よくできました。間違えた場面を見直せば、流れがさらに確かになります。';
    else if (rate >= 0.5) msg = '流れの骨組みはつかめています。「手順を確認」で順序を確かめましょう。';
    else msg = 'まずは手順を通して見て、道具の動きを追ってみましょう。繰り返すうちに流れが見えてきます。';

    setDiagram(t.questions[t.questions.length - 1], true);

    const best = loadBest()[t.id];
    let html = '<div class="result">';
    html += '<p class="result-score">' + s + '<small> / ' + total + ' 問</small></p>';
    html += '<p class="result-msg">' + msg + '</p>';
    if (best) html += '<p class="result-best">これまでの最高：' + best.score + ' / ' + best.total + '</p>';
    html += '<div class="actions">' +
      '<button type="button" class="btn btn-primary" data-act="retry">もう一度挑戦する</button>' +
      '<button type="button" class="btn" data-act="steps">手順を確認</button>';
    const ti = TEMAE.indexOf(t);
    if (ti < TEMAE.length - 1) html += '<button type="button" class="btn" data-act="nextTemae">次のお点前へ</button>';
    html += '</div>';

    if (state.misses.length) {
      html += '<div class="miss-list"><h3>見直したい場面</h3><ul>';
      state.misses.forEach(function (mi) {
        const q = t.questions[mi];
        html += '<li><strong>' + esc(q.step) + '</strong>：' + esc(q.a) + '</li>';
      });
      html += '</ul></div>';
    }
    html += '</div>';
    $panel.innerHTML = html;
  }

  function renderSteps(current) {
    const t = state.temae;
    setDiagram(t.questions[current], true);
    let html = '<h3 class="steps-head">' + esc(t.title) + ' の流れ</h3>';
    html += '<p class="steps-note">各場面の正しい所作を順に並べています。「図を見る」で配置図が切り替わります。</p>';
    html += '<ol class="steps">';
    t.questions.forEach(function (q, i) {
      html += '<li class="' + (i === current ? 'is-current' : '') + '">' +
        '<div class="s-step">' + esc(q.step) + '</div>' +
        '<p class="s-ans">' + esc(q.a) + '</p>' +
        '<p class="s-scene">' + esc(q.scene) + '</p>' +
        '<button type="button" class="s-view" data-view="' + i + '" aria-label="場面' + (i + 1) + 'の配置図を見る">図を見る</button>' +
        '</li>';
    });
    html += '</ol>';
    html += '<div class="actions"><button type="button" class="btn btn-primary" data-act="toQuiz">クイズに戻る</button></div>';
    $panel.innerHTML = html;
  }

  /* ---------------------------------------------------------
     5. イベント
     --------------------------------------------------------- */
  $tabs.addEventListener('click', function (e) {
    const btn = e.target.closest('.tab');
    if (!btn) return;
    state.mode = 'quiz';
    selectTemae(btn.dataset.id);
  });

  $tabs.addEventListener('keydown', function (e) {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    const i = TEMAE.indexOf(state.temae);
    const ni = e.key === 'ArrowRight' ? (i + 1) % TEMAE.length : (i - 1 + TEMAE.length) % TEMAE.length;
    e.preventDefault();
    state.mode = 'quiz';
    selectTemae(TEMAE[ni].id, true);
  });

  modeBtns.forEach(function (b) {
    b.addEventListener('click', function () {
      if (state.mode === b.dataset.mode) return;
      state.mode = b.dataset.mode;
      if (state.mode === 'quiz') resetQuiz();
      render();
    });
  });

  guideBtns.forEach(function (b) {
    b.addEventListener('click', function () {
      const on = b.dataset.guide === 'on';
      if (state.guide === on) return;
      state.guide = on;
      saveGuide(on);
      renderGuideBtns();
      // クイズ中で未回答なら、いまの設問の図だけ描き直す
      if (state.mode === 'quiz' && !state.finished) {
        setDiagram(state.temae.questions[state.idx], state.guide || state.answered);
      }
    });
  });

  $panel.addEventListener('click', function (e) {
    const choice = e.target.closest('.choice');
    if (choice) { answer(Number(choice.dataset.i)); return; }

    const view = e.target.closest('[data-view]');
    if (view) {
      const i = Number(view.dataset.view);
      renderSteps(i);
      if (window.innerWidth < 880) document.querySelector('.board').scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }

    const act = e.target.closest('[data-act]');
    if (!act) return;
    switch (act.dataset.act) {
      case 'next': next(); break;
      case 'retry':
        state.mode = 'quiz';
        resetQuiz();
        render();
        scrollToStage();
        break;
      case 'steps':
        state.mode = 'steps';
        render();
        break;
      case 'toQuiz':
        state.mode = 'quiz';
        resetQuiz();
        render();
        break;
      case 'nextTemae': {
        const ti = TEMAE.indexOf(state.temae);
        state.mode = 'quiz';
        selectTemae(TEMAE[Math.min(ti + 1, TEMAE.length - 1)].id);
        scrollToStage();
        break;
      }
    }
  });

  // 数字キー 1〜4 で選択（クイズ中のみ）
  document.addEventListener('keydown', function (e) {
    if (state.mode !== 'quiz' || state.finished || state.answered) return;
    if (e.target && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
    const n = Number(e.key);
    if (n >= 1 && n <= 4) answer(n - 1);
  });

  window.addEventListener('hashchange', function () {
    const id = location.hash.slice(1);
    if (id && (!state.temae || state.temae.id !== id) && TEMAE.some(function (t) { return t.id === id; })) {
      state.mode = 'quiz';
      selectTemae(id);
    }
  });

  /* 初期表示 */
  const initial = location.hash.slice(1);
  selectTemae(TEMAE.some(function (t) { return t.id === initial; }) ? initial : TEMAE[0].id);
})();
