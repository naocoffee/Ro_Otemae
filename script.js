/* =========================================================
   炉点前 稽古帖 — script.js
   ・お点前データ（TEMAE）
   ・配置図データ（ROOMS）と SVG 描画
   ・クイズ進行
   ========================================================= */
(function () {
  'use strict';

  /* ---------------------------------------------------------
     1. 配置図の座標データ
     viewBox 0 0 300 248。点前畳は x50-150 / y15-215（上が「向こう」）。
     pos: [x, y, ラベル位置(b/t/l/r/n)]
     hishaku: [合(カップ)x, 合y, 柄の端x, 柄の端y]
     rects: [x, y, w, h]
     --------------------------------------------------------- */
  const HONKATTE_POS = {
    mizu: [110, 52, 'b'],
    frontL: [93, 93, 'l'],
    frontR: [125, 93, 'r'],
    frontC: [110, 92, 'r'],
    knee: [98, 148, 'l'],
    mid: [98, 169, 'l'],
    midR: [118, 169, 't'],
    kensui: [64, 198, 'l'],
    kensuiIn: [64, 198, 'n'],
    futaoki: [144, 178, 'b'],
    shifukuPos: [72, 74, 'l'],
    shelfTop: [131, 33, 'r'],
    dasu: [172, 192, 'b'],
    haiken1: [176, 196, 'b'],
    haiken2: [198, 196, 'b'],
    haiken3: [220, 196, 'b'],
    tomoOut: [60, 110, 'l'],
    nKensui: [70, 49, 'b'],
    nFutaoki: [70, 49, 'n'],
    nShaku: [98, 49, 'b'],
    nMizu: [127, 49, 'b'],
    door: [28, 226, 'r'],
    host: [98, 201, 'b']
  };

  const HONKATTE_HISHAKU = {
    onKama: [170, 143, 139, 188],
    onFutaoki: [144, 178, 126, 203],
    kensuiSet: [63, 196, 86, 182],
    tanaKazari: [103, 30, 133, 50],
    shakutate: [98, 49, 98, 26]
  };

  const ROOMS = {
    honkatte: {
      label: '本勝手・四畳半切',
      ro: { x: 153, y: 118, s: 45, kind: 'cut' },
      half: true,
      pos: HONKATTE_POS,
      hishaku: HONKATTE_HISHAKU,
      rects: { tana: [80, 22, 62, 58], nagaita: [53, 31, 92, 36] }
    },
    okiro: {
      label: '置炉（切炉の位置に準じて据えた例）',
      ro: { x: 153, y: 118, s: 45, kind: 'oki' },
      half: true,
      pos: HONKATTE_POS,
      hishaku: HONKATTE_HISHAKU,
      rects: {}
    },
    mukogiri: {
      label: '向切（点前畳の向こう・客付寄りに炉）',
      ro: { x: 102, y: 20, s: 45, kind: 'cut' },
      half: false,
      pos: {
        mizu: [72, 44, 'l'],
        frontL: [68, 101, 'l'],
        frontR: [96, 101, 'r'],
        knee: [98, 146, 'l'],
        mid: [98, 166, 'l'],
        midR: [118, 166, 't'],
        kensui: [64, 196, 'l'],
        kensuiIn: [64, 196, 'n'],
        futaoki: [93, 74, 'l'],
        shifukuPos: [68, 80, 'l'],
        dasu: [168, 150, 'b'],
        haiken1: [176, 186, 'b'],
        haiken2: [198, 186, 'b'],
        haiken3: [220, 186, 'b'],
        door: [28, 226, 'r'],
        host: [98, 201, 'b']
      },
      hishaku: {
        onKama: [121, 45, 108, 104],
        onFutaoki: [93, 74, 116, 106],
        kensuiSet: [63, 194, 86, 180]
      },
      rects: {}
    },
    sumiro: {
      label: '隅炉（点前畳の向こう・勝手付の隅に炉）',
      ro: { x: 53, y: 20, s: 45, kind: 'cut' },
      half: false,
      pos: {
        mizu: [124, 44, 'r'],
        frontL: [100, 101, 'l'],
        frontR: [128, 101, 'r'],
        knee: [98, 146, 'l'],
        mid: [98, 166, 'l'],
        midR: [118, 166, 't'],
        kensui: [64, 196, 'l'],
        kensuiIn: [64, 196, 'n'],
        futaoki: [106, 74, 'r'],
        shifukuPos: [132, 76, 'r'],
        dasu: [168, 150, 'b'],
        haiken1: [176, 186, 'b'],
        haiken2: [198, 186, 'b'],
        haiken3: [220, 186, 'b'],
        door: [28, 226, 'r'],
        host: [98, 201, 'b']
      },
      hishaku: {
        onKama: [78, 45, 92, 104],
        onFutaoki: [106, 74, 124, 108],
        kensuiSet: [63, 194, 86, 180]
      },
      rects: {}
    }
  };

  const NAMES = {
    mizusashi: '水指', chawan: '茶碗', tsutsu: '筒茶碗', tomo: '供茶碗',
    natsume: '棗', chaire: '茶入', shifuku: '茶入（仕覆）', kensui: '建水',
    futaoki: '蓋置', hishaku: '柄杓', chasen: '茶筅', chashaku: '茶杓',
    kamabuta: '釜の蓋', chakin: '茶巾', kijindai: '貴人台', shakutate: '杓立',
    tana: '更好棚', nagaita: '長板', host: '亭主', shifukuOnly: '仕覆', arrow: ''
  };

  /* ---------------------------------------------------------
     2. お点前データ
     各設問: step(場面名) / scene(状況) / items(配置) / q(問い)
             a(正解) / w(誤答3つ) / exp(解説)
     items の書式: "種類@位置"、先頭 "!" で強調、":名前" でラベル変更
     --------------------------------------------------------- */
  const U_SET = ['mizusashi@mizu', 'chawan@frontL', 'natsume@frontR'];
  const HIKI = ['kensui@kensui', 'futaoki@futaoki', 'hishaku@onFutaoki'];
  const HIKI_W = ['kensui@kensui', 'kamabuta@futaoki', 'chakin@futaoki', 'hishaku@onKama'];

  const TEMAE = [
    /* ===== 1. 薄茶運び点前 ===== */
    {
      id: 'usucha-hakobi',
      group: '炉',
      tab: '薄茶 運び点前',
      title: '【炉】薄茶運び点前（平点前）',
      room: 'honkatte',
      lead: '水指・茶碗・棗・建水を順に運び出して点てる、炉の薄茶の基本です。道具を運ぶ順序と、置き合わせの位置を確かめましょう。',
      questions: [
        {
          step: '運び出し',
          scene: '茶道口に座り、襖を開けて総礼をした。点前座にはまだ何も置かれていない。',
          items: ['host@door'],
          q: '最初に運び出す道具はどれか。',
          a: '水指を運び出し、点前座の定位置に据える',
          w: ['茶碗と棗を先に運び出し、点前座の中央に置く', '建水を先に運び出し、左膝の横に置く', '柄杓と蓋置だけを持ち出し、炉縁の横に置く'],
          exp: '運び点前は「水指 → 茶碗・棗 → 建水」の順に運びます。大きく重い水指を先に据えると、ほかの道具を置き合わせる基準ができます。'
        },
        {
          step: '運び出し',
          scene: '水指を据えて、いったん水屋に下がった。',
          items: ['!mizusashi@mizu', 'host@door'],
          q: '次に運び出すものと、その置き方はどれか。',
          a: '右手に棗、左手に茶碗を持って出て、水指の前に茶碗と棗を置き合わせる',
          w: ['茶碗だけを持って出て、水指の蓋の上に載せる', '棗だけを持って出て、炉縁の上に置く', '茶碗と棗を建水に入れ、一度に運び出す'],
          exp: '茶碗は左手、棗は右手に持って運び出し、水指の前に茶碗を左、棗を右にして置き合わせます。茶巾・茶筅・茶杓は茶碗に仕組んであります。'
        },
        {
          step: '運び出し',
          scene: '茶碗と棗を水指の前に置き合わせ、水屋に下がった。',
          items: U_SET.concat(['!chawan@frontL', '!natsume@frontR', 'host@door']),
          q: '次に運び出すのはどれか。',
          a: '柄杓と蓋置を仕組んだ建水を持ち出す',
          w: ['釜の蓋を持ち出して炉縁に置く', '茶筅だけを別に持ち出し、棗の右に置く', '水次を持ち出し、水指に水を足す'],
          exp: '建水に蓋置を入れ、柄杓を載せて（仕組んで）持ち出します。茶筅・茶巾・茶杓は茶碗に仕組んであるので、別に運ぶことはありません。'
        },
        {
          step: '点前座に着く',
          scene: '建水を持って点前座に座り、建水を左膝の横に置いた。',
          items: U_SET.concat(['!kensui@kensui', 'futaoki@kensuiIn', 'hishaku@kensuiSet']),
          q: '次の所作はどれか。',
          a: '柄杓を構え、蓋置を取り出して炉縁の左角近くに置き、柄杓を蓋置に引く',
          w: ['すぐに茶碗を膝前に取り込む', '帛紗をさばき、先に釜の蓋を取る', '蓋置を水指の前に置き、柄杓を水指の上に載せる'],
          exp: '左手で柄杓を構え、右手で建水から蓋置を取り出して炉縁の左角近くに置き、柄杓を蓋置に引きます（引柄杓）。道具が定位置に据わってから総礼に移ります。'
        },
        {
          step: '総礼',
          scene: '柄杓を蓋置に引いた。',
          items: U_SET.concat(['kensui@kensui', '!futaoki@futaoki', '!hishaku@onFutaoki']),
          q: '次の所作はどれか。',
          a: '建水を膝頭の線まで進め、居住まいを正して総礼をする',
          w: ['建水を客付に出して拝見に供する', '総礼はせず、すぐに茶杓を清める', '水指の水を一杓汲んで釜に足す'],
          exp: '建水を進めて座りを整え、客と総礼をします。ここからが点前の本番。建水を進めておくと、後の湯を捨てる所作が無理なく行えます。'
        },
        {
          step: '道具の取り込み',
          scene: '総礼をした。',
          items: U_SET.concat(['!chawan@frontL', '!natsume@frontR']).concat(HIKI).concat(['arrow@frontL>knee']),
          q: '次の所作はどれか。',
          a: '茶碗を膝前に取り込み、棗を茶碗と膝の間に置く',
          w: ['棗を先に取り、右膝の横に置く', '茶碗を取って客付に仮置きする', '茶碗と棗を入れ替えて置き直す'],
          exp: 'まず茶碗を膝前に取り込み、続いて棗を茶碗と膝の間に置きます。これで点前に使う道具が手元にそろいます。'
        },
        {
          step: '清め',
          scene: '茶碗と棗を取り込んだ。',
          items: ['mizusashi@mizu', '!chawan@knee', '!natsume@mid'].concat(HIKI),
          q: '次の所作はどれか。',
          a: '帛紗をさばいて棗を清め、続いて茶杓を清めて棗の上に置く',
          w: ['茶杓を先に清め、その後で帛紗をさばく', '茶巾で棗の蓋を拭き清める', '帛紗で茶碗の内側を拭く'],
          exp: '腰の帛紗を取ってさばき、棗 → 茶杓の順に清めます。薄茶の棗は蓋の上を「こ」の字に拭きます。清めた茶杓は棗の蓋の上に置きます。'
        },
        {
          step: '茶筅を出す',
          scene: '棗と茶杓を清め、茶杓を棗の上に置いた。',
          items: ['mizusashi@mizu', 'chawan@knee', 'natsume@mid', 'chashaku@mid'].concat(HIKI),
          q: '次の所作はどれか。',
          a: '茶碗から茶筅を取り出し、棗の右に置く',
          w: ['茶筅を建水の縁に置く', '茶筅を水指の蓋の上に置く', '茶筅は茶碗に入れたまま湯を注ぐ'],
          exp: '茶筅を茶碗から取り出して棗の右に置きます。茶碗の中を空けてから、釜の蓋を開ける所作に進みます。'
        },
        {
          step: '釜の蓋・茶巾',
          scene: '茶筅を棗の右に置いた。',
          items: ['mizusashi@mizu', 'chawan@knee', 'natsume@mid', 'chashaku@mid', '!chasen@midR'].concat(HIKI),
          q: '次の所作はどれか。',
          a: '柄杓を取って構え、帛紗で釜の蓋を取って蓋置に置き、茶巾を釜の蓋の上に置く',
          w: ['素手で釜の蓋を取り、畳の上に置く', '柄杓を建水に入れ、蓋置を片付ける', '釜の蓋は開けずに、水指の水で茶碗を温める'],
          exp: '釜の蓋は熱いので帛紗を用いて取り、蓋置の上に置きます。茶巾は茶碗から取り出し、釜の蓋の上に置いておきます。'
        },
        {
          step: '茶筅通し',
          scene: '釜から湯を汲み、茶碗に入れた。',
          items: ['mizusashi@mizu', '!chawan@knee', 'natsume@mid', 'chashaku@mid', 'chasen@midR'].concat(HIKI_W),
          q: '次の所作はどれか。',
          a: '茶筅通しをして穂先を改め、湯を建水に捨てて茶巾で茶碗を拭く',
          w: ['湯を入れたまま抹茶を入れて点てる', '茶碗の湯を水指に戻す', '茶巾を湯に浸して釜の蓋を拭く'],
          exp: '茶筅通しで穂先を改め、茶碗を温めます。湯を建水に捨て、茶巾で茶碗を拭いてから、茶巾を釜の蓋の上に戻します。'
        },
        {
          step: '茶を入れる',
          scene: '茶碗を拭き、茶巾を釜の蓋の上に戻した。',
          items: ['mizusashi@mizu', 'chawan@knee', '!natsume@mid', '!chashaku@mid', 'chasen@midR'].concat(HIKI_W),
          q: '次の所作はどれか。',
          a: '茶杓を取り「お菓子をどうぞ」と勧め、棗の蓋を取って抹茶を茶碗に入れる',
          w: ['先に湯を注ぎ、あとから抹茶を入れる', '抹茶を入れ終えてから、菓子を勧める', '茶杓で茶碗の縁を打ってから棗を開ける'],
          exp: '茶杓を取ったところで客に菓子を勧めます。薄茶は茶杓に一杓半ほどが目安。入れ終えたら茶杓の抹茶を茶碗の縁で軽く払います。'
        },
        {
          step: '茶を出す',
          scene: '湯を注ぎ、茶筅で薄茶を点てた。',
          items: ['mizusashi@mizu', '!chawan@knee', 'natsume@mid', 'chasen@midR'].concat(HIKI_W).concat(['arrow@knee>dasu']),
          q: '点てた茶碗はどう扱うか。',
          a: '茶碗の正面を客の方に向け、客付に出す',
          w: ['正面を自分に向けたまま客付に出す', '茶筅を入れたまま客付に出す', '建水の上を通して左側から出す'],
          exp: '茶碗の正面は客へ向けて出します。自分が正面から飲まないのと同じく、客に最もよい面を見ていただくための心配りです。'
        },
        {
          step: '仕舞い',
          scene: '茶碗が戻り、湯ですすいだ。正客から「どうぞおしまいください」と挨拶があった。',
          items: ['mizusashi@mizu', 'chawan@knee', 'natsume@mid', 'chasen@midR'].concat(HIKI_W),
          q: '次の所作はどれか。',
          a: '「おしまいにいたします」と挨拶し、茶碗に水を汲んで茶筅通しをする',
          w: ['湯を汲んで、もう一服点て始める', 'すぐに道具を持って退出する', '水指の水を建水にあける'],
          exp: '仕舞いの挨拶のあとは、水で茶筅通しをして茶巾・茶筅・茶杓を茶碗に仕組み直していきます。仕舞いは点前の始めを逆にたどる流れです。'
        },
        {
          step: '拝見',
          scene: '仕舞い付けを終え、正客から棗と茶杓の拝見を請われた。',
          items: U_SET.concat(['!natsume@frontR']).concat(HIKI).concat(['arrow@frontR>haiken1']),
          q: '拝見に出す手順はどれか。',
          a: '棗を帛紗で清めてから客付に出し、続いて茶杓を出す',
          w: ['清めずにそのまま棗と茶杓を出す', '茶碗も一緒に拝見に出す', '茶杓だけを出し、棗は持ち帰る'],
          exp: '拝見に出す棗はもう一度帛紗で清めてから出します。棗、茶杓の順に出し、客に向けて正面を整えます。'
        }
      ]
    },

    /* ===== 2. 濃茶運び点前 ===== */
    {
      id: 'koicha-hakobi',
      group: '炉',
      tab: '濃茶 運び点前',
      title: '【炉】濃茶運び点前（平点前）',
      room: 'honkatte',
      lead: '仕覆に入れた茶入を用い、濃茶を練る点前です。仕覆の扱い、帛紗の四方さばき、濃茶を練る所作を確かめます。',
      questions: [
        {
          step: '運び出し',
          scene: '水指を据えて水屋に下がった。濃茶では茶入を仕覆に入れて用いる。',
          items: ['!mizusashi@mizu', 'host@door'],
          q: '次に運び出すものと置き方はどれか。',
          a: '仕覆に入れた茶入と、仕組んだ茶碗を運び、水指の前に置き合わせる',
          w: ['仕覆を脱がせた茶入を運び、水指の蓋の上に置く', '茶碗だけを運び、茶入は点前の途中で取りに行く', '茶入は懐に入れて運び出す'],
          exp: '濃茶の茶入は仕覆に入れたまま運び出し、茶碗とともに水指の前に置き合わせます。仕覆を脱がせるのは、総礼をして道具を取り込んでからです。'
        },
        {
          step: '道具の取り込み',
          scene: '建水を運び、柄杓と蓋置を据えて総礼をした。',
          items: ['mizusashi@mizu', '!chawan@frontL', '!shifuku@frontR'].concat(HIKI),
          q: '次の所作はどれか。',
          a: '茶碗を膝前に取り込み、茶入を茶碗と膝の間に置く',
          w: ['茶入を右膝の横に置き、茶碗は水指の前に残す', '茶入を建水の後ろに置く', '茶碗と茶入を入れ替えて置き直す'],
          exp: '薄茶と同じく、茶碗を膝前に、茶入を茶碗と膝の間に取り込みます。'
        },
        {
          step: '仕覆を脱がせる',
          scene: '茶碗と、仕覆に入った茶入を取り込んだ。',
          items: ['mizusashi@mizu', 'chawan@knee', '!shifuku@mid'].concat(HIKI),
          q: '次の所作はどれか。',
          a: '茶入を取り、仕覆の緒を解いて仕覆を脱がせる',
          w: ['仕覆に入れたまま茶入の蓋を開ける', '仕覆のまま帛紗で拭いて清める', '仕覆ごと茶碗の中に入れる'],
          exp: '緒を解き、仕覆の口を広げて茶入を出します。脱がせた仕覆は形を整え、定められた位置に置きます（図の位置は目安です）。'
        },
        {
          step: '清め',
          scene: '仕覆を脱がせ、茶入を膝前に置いた。',
          items: ['mizusashi@mizu', 'chawan@knee', '!chaire@mid', 'shifukuOnly@shifukuPos'].concat(HIKI),
          q: '次の所作はどれか。',
          a: '帛紗を四方さばきして、茶入を清める',
          w: ['帛紗を二つ折りのまま茶入の蓋だけ拭く', '茶巾で茶入を拭く', '茶入は清めず、茶杓だけを清める'],
          exp: '濃茶の茶入は、帛紗を「四方さばき」で丁寧に改めてから清めます。蓋の甲と胴を清め、続いて茶杓を清めます。'
        },
        {
          step: '茶筅・釜の蓋',
          scene: '茶入と茶杓を清めた。',
          items: ['mizusashi@mizu', 'chawan@knee', 'chaire@mid', 'chashaku@mid', 'shifukuOnly@shifukuPos'].concat(HIKI),
          q: '次の所作はどれか。',
          a: '茶筅を茶入の右に出し、帛紗で釜の蓋を取って蓋置に置く',
          w: ['茶筅を仕覆の中に入れておく', '先に湯を汲み、茶入に注ぐ', '釜の蓋を素手で取り、水指の前に置く'],
          exp: '茶筅を取り出して茶入の右に置き、柄杓を構えて帛紗で釜の蓋を取ります。以降、湯を汲んで茶筅通し、茶碗を温めて拭く流れは薄茶と同じです。'
        },
        {
          step: '茶を入れる',
          scene: '茶筅通しをし、茶碗を温めて茶巾で拭いた。',
          items: ['mizusashi@mizu', 'chawan@knee', '!chaire@mid', '!chashaku@mid', 'chasen@midR', 'shifukuOnly@shifukuPos'].concat(HIKI_W),
          q: '次の所作はどれか。',
          a: '茶杓と茶入を取り、菓子を勧めてから茶入の抹茶を茶碗に入れる',
          w: ['茶入の蓋を開けたまま、湯を先に注ぐ', '茶入から直接、茶碗に抹茶を振り入れる', '菓子は茶を練り終えてから勧める'],
          exp: '茶杓を取ったところで菓子を勧めます。濃茶は一人分およそ茶杓三杓が目安です。'
        },
        {
          step: '回し出し',
          scene: '茶杓で抹茶を三杓ほど入れた。',
          items: ['mizusashi@mizu', '!chawan@knee', '!chaire@mid', 'chasen@midR', 'shifukuOnly@shifukuPos'].concat(HIKI_W),
          q: '茶入に残った抹茶はどうするか。',
          a: '茶入を回しながら、残りの抹茶を茶碗に出す（回し出し）',
          w: ['残りは茶入に戻し、後で薄茶に使う', '茶入を建水の上で逆さにして払う', '茶杓で茶入の縁を何度も叩いて出す'],
          exp: '茶入には客数分の抹茶を入れてあるので、残りは茶入を回しながら茶碗に出し切ります。茶杓は茶碗の縁で軽く払い、茶入に蓋をします。'
        },
        {
          step: '練る',
          scene: '抹茶を茶碗に入れ、茶入に蓋をした。',
          items: ['mizusashi@mizu', '!chawan@knee', 'chaire@mid', 'chasen@midR', 'shifukuOnly@shifukuPos'].concat(HIKI_W),
          q: '次の所作はどれか。',
          a: '湯を汲んで適量を注いで練り、さらに湯を加えて練り上げる',
          w: ['一度にたっぷり湯を注ぎ、薄茶のように泡立てる', '水指の水を汲んで練る', '茶筅を使わず、茶杓でかき混ぜる'],
          exp: '濃茶は「点てる」ではなく「練る」。少量の湯で抹茶をよく練り、湯を足して練り上げ、なめらかなとろみに仕上げます。'
        },
        {
          step: '服加減',
          scene: '練り上げた茶碗を出し、正客が一口飲んだ。',
          items: ['mizusashi@mizu', '!chawan@dasu', 'chaire@mid', 'chasen@midR', 'shifukuOnly@shifukuPos'].concat(HIKI_W),
          q: 'このとき亭主はどうするか。',
          a: '「お服加減はいかがでございますか」と尋ねる',
          w: ['黙って仕舞いの所作を始める', '次客のために新しく茶を練り始める', '正客に茶碗の拝見を勧める'],
          exp: '正客が一口飲んだところで服加減を尋ねます。濃茶は一碗を客が順に飲み回すため、正客の一口目で練り具合を確かめるのです。'
        },
        {
          step: '拝見',
          scene: '仕舞い付けを終え、正客から茶入・茶杓・仕覆の拝見を請われた。',
          items: ['mizusashi@mizu', 'chawan@frontL', '!chaire@frontR', 'shifukuOnly@shifukuPos'].concat(HIKI).concat(['arrow@frontR>haiken1']),
          q: '拝見に出す手順はどれか。',
          a: '茶入を帛紗で清めて出し、続いて茶杓、仕覆を出す',
          w: ['茶入を仕覆に入れ直してから出す', '仕覆だけを出し、茶入・茶杓は持ち帰る', '茶碗・茶入・茶杓をまとめて出す'],
          exp: '茶入をもう一度清めて出し、茶杓、仕覆の順に拝見に出します。仕覆に入れ直さないのは、茶入そのものと仕覆の両方を見ていただくためです。'
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
      lead: '棚に水指と棗を荘りつけて行う薄茶点前。荘ってある道具を下ろす順序と、終わりに柄杓・蓋置を荘る「棚の扱い」がポイントです。',
      caption: '棚の形は略図です。天板・地板の使い方や荘りの位置は、棚ごとの決まりに従います。',
      questions: [
        {
          step: '運び出し',
          scene: '棚の地板に水指、天板に棗が荘ってある。茶道口で総礼をした。',
          items: ['mizusashi@mizu', '!natsume@shelfTop', 'host@door'],
          q: '最初に運び出すものはどれか。',
          a: '茶巾・茶筅・茶杓を仕組んだ茶碗を持ち出す',
          w: ['棚から水指を下ろすため、何も持たずに出る', '棗を水屋から持ち出す', '建水を持ち出し、茶碗は最後に運ぶ'],
          exp: '棚点前では水指と棗が荘ってあるので、まず茶碗を運び出します。'
        },
        {
          step: '棗を下ろす',
          scene: '茶碗を持って点前座に座り、茶碗を膝前に置いた。',
          items: ['mizusashi@mizu', 'natsume@shelfTop', '!chawan@knee', 'arrow@knee>frontL'],
          q: '次の所作はどれか。',
          a: '天板の棗を取り下ろして水指の前に置き、茶碗をその左に置き合わせる',
          w: ['茶碗を天板に上げ、棗と並べる', '棗は荘ったまま、茶碗だけで点前を始める', '棗を右膝の横に置き、茶碗は水指の上に載せる'],
          exp: '天板の棗を下ろして水指の前に置き、茶碗を左に置き合わせます。運び点前で運んだときと同じ置き合わせになります。'
        },
        {
          step: '建水',
          scene: '茶碗と棗を水指の前に置き合わせた。',
          items: U_SET.concat(['!chawan@frontL', '!natsume@frontR', 'host@door']),
          q: '次の所作はどれか。',
          a: '水屋に戻り、柄杓・蓋置を仕組んだ建水を持ち出す',
          w: ['水指の蓋を開けて水屋に戻る', '総礼をして、そのまま茶碗を取り込む', '地板の水指を点前座の中央に引き出す'],
          exp: '建水を運び出して座り、柄杓を構えて蓋置を置き、柄杓を引いて総礼。ここからは平点前と同じ流れです。'
        },
        {
          step: '清め',
          scene: '総礼をし、茶碗と棗を取り込んだ。',
          items: ['mizusashi@mizu', '!chawan@knee', '!natsume@mid'].concat(HIKI),
          q: '次の所作はどれか。',
          a: '帛紗をさばいて棗を清め、茶杓を清める',
          w: ['棗を天板に戻してから清める', '帛紗で水指の蓋を清める', '茶筅を先に出して茶筅通しをする'],
          exp: '棚点前でも、取り込んだ後の清めは平点前と同じです。'
        },
        {
          step: '荘り',
          scene: '仕舞い付けを終えた。正客から棗・茶杓の拝見を請われた。',
          items: U_SET.concat(HIKI).concat(['!hishaku@onFutaoki', '!futaoki@futaoki']),
          q: '柄杓と蓋置はどうするか。',
          a: '柄杓と蓋置を棚に荘り、棗・茶杓を拝見に出す',
          w: ['柄杓と蓋置も拝見に出す', '柄杓を水指の蓋の上に置いたままにする', '柄杓と蓋置は建水に入れて先に下げる'],
          exp: '棚点前の特徴は、終わりに柄杓・蓋置を棚に荘ることです。どの段にどう荘るかは棚によって決まりがあるので、稽古で確認しましょう。'
        },
        {
          step: '拝見の後',
          scene: '柄杓・蓋置を棚に荘り、棗・茶杓を拝見に出した。',
          items: ['mizusashi@mizu', 'chawan@frontL', 'hishaku@tanaKazari', 'kensui@kensui', 'natsume@haiken1', 'chashaku@haiken2'],
          q: '拝見に出したあと、亭主が次にすることはどれか。',
          a: '建水を持って水屋に下がり、続いて茶碗を下げる',
          w: ['客付に座ったまま拝見が終わるのを待ち続ける', '棚の水指を下げて水屋に戻る', '拝見中に次の茶を点て始める'],
          exp: '拝見に出したら、建水・茶碗の順に下げます（道具を下げる順は運び出しの逆）。拝見の道具が戻れば、それを受け取りに出ます。'
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
      lead: '由緒ある茶入などを大切に扱うため、仕覆に入れた茶入を点前座に荘りつけて行う濃茶点前です。',
      caption: '茶入は荘ってある状態から始まります。',
      questions: [
        {
          step: '趣旨',
          scene: '点前座に水指が置かれ、その前に仕覆に入った茶入が荘られている。',
          items: ['mizusashi@mizu', '!shifuku@frontC'],
          q: '茶入荘の点前を行うのは、どのようなときか。',
          a: '由緒ある茶入や拝領の茶入など、茶入を特に大切に扱うとき',
          w: ['茶入の数が足りず、棗で代用するとき', '客の人数が多く、濃茶を二碗練るとき', '茶入を床の間に飾る代わりとして行うとき'],
          exp: '茶入に特別な由緒があるときなどに、敬意を表して点前座に荘りつけます。客は席入りの際から茶入を目にすることになります。'
        },
        {
          step: '運び出し',
          scene: '茶道口で総礼をした。点前座には水指と、荘った茶入がある。',
          items: ['mizusashi@mizu', 'shifuku@frontC', 'host@door'],
          q: '最初に運び出すものはどれか。',
          a: '茶巾・茶筅・茶杓を仕組んだ茶碗を持ち出し、茶入と置き合わせる',
          w: ['水屋から新しい茶入を持ち出す', '茶入を水屋に下げ、仕覆を着せ直す', '建水を持ち出し、茶碗は運ばない'],
          exp: '水指と茶入は荘ってあるので、茶碗を運び出して茶入と置き合わせます。続いて建水を運び出します。'
        },
        {
          step: '建水',
          scene: '茶碗を茶入と置き合わせ、水屋に下がった。',
          items: ['mizusashi@mizu', '!chawan@frontL', 'shifuku@frontR', 'host@door'],
          q: '次に運び出すのはどれか。',
          a: '柄杓・蓋置を仕組んだ建水',
          w: ['帛紗の替えと古帛紗', '水次', '菓子器'],
          exp: '建水を運び出し、柄杓・蓋置を据えて総礼します。以降は濃茶平点前の流れに沿って進めます。'
        },
        {
          step: '仕覆',
          scene: '総礼をして、茶碗と茶入を取り込んだ。',
          items: ['mizusashi@mizu', 'chawan@knee', '!shifuku@mid'].concat(HIKI),
          q: '次の所作はどれか。',
          a: '仕覆を脱がせて茶入を膝前に置き、帛紗を四方さばきして清める',
          w: ['荘られていた茶入なので、仕覆のまま点前を進める', '仕覆は脱がせずに客に拝見に出す', '茶入を清めずに茶を入れる'],
          exp: '荘ってあった茶入も、点前では平点前と同じく仕覆を脱がせ、四方さばきで清めてから用います。大切な茶入ほど、扱いは静かに丁寧に。'
        },
        {
          step: '拝見',
          scene: '濃茶を出し終え、仕舞い付けをした。正客から拝見を請われた。',
          items: ['mizusashi@mizu', 'chawan@frontL', '!chaire@frontR', 'shifukuOnly@shifukuPos'].concat(HIKI).concat(['arrow@frontR>haiken1']),
          q: '拝見に出すものの組み合わせとして正しいのはどれか。',
          a: '茶入・茶杓・仕覆',
          w: ['茶入のみ', '茶碗・茶入', '水指・茶入・茶杓'],
          exp: '濃茶の拝見物は茶入・茶杓・仕覆です。茶入を清めてから出し、茶杓、仕覆の順に出します。'
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
      lead: '由緒ある茶碗を用いるとき、茶碗を点前座に荘りつけて行う濃茶点前です。運び出す道具が少ない分、荘ってある道具の扱いが要になります。',
      caption: '茶碗と茶入は、点前座に荘りつけた状態から始まります。',
      questions: [
        {
          step: '趣旨',
          scene: '水指の前に、仕組んだ茶碗と仕覆の茶入が荘りつけてある。',
          items: ['mizusashi@mizu', '!chawan@frontL', 'shifuku@frontR'],
          q: '茶碗荘の点前を行うのは、どのようなときか。',
          a: '由緒ある茶碗など、茶碗を特に大切に扱うとき',
          w: ['茶碗が大きく、運び出せないとき', '薄茶と濃茶を同じ茶碗で続けて点てるとき', '客に茶碗を持ち帰ってもらうとき'],
          exp: '茶碗に由緒があるときなどに、敬意を表して初めから点前座に荘りつけておきます。'
        },
        {
          step: '運び出し',
          scene: '茶道口で総礼をした。点前座には水指・茶碗・茶入が荘ってある。',
          items: ['mizusashi@mizu', 'chawan@frontL', 'shifuku@frontR', 'host@door'],
          q: '亭主が運び出すものはどれか。',
          a: '柄杓・蓋置を仕組んだ建水',
          w: ['茶碗をいったん水屋に下げて仕組み直す', '別の茶碗を持ち出し、荘りの茶碗と並べる', '茶入を水屋から持ち出す'],
          exp: '茶碗・茶入・水指が荘ってあるので、運び出すのは建水だけです。'
        },
        {
          step: '座る',
          scene: '建水を持って座り、左膝の横に置いた。',
          items: ['mizusashi@mizu', 'chawan@frontL', 'shifuku@frontR', '!kensui@kensui', 'futaoki@kensuiIn', 'hishaku@kensuiSet'],
          q: '次の所作はどれか。',
          a: '柄杓を構えて蓋置を炉縁の左角近くに置き、柄杓を引いて建水を進め、総礼をする',
          w: ['総礼より先に、荘ってある茶碗を取り込む', '柄杓を茶碗の上に置く', '蓋置を茶入の右に置く'],
          exp: '運び出す道具が少なくても、柄杓・蓋置を定位置に据えてから総礼をする流れは変わりません。'
        },
        {
          step: '取り込み',
          scene: '総礼をした。',
          items: ['mizusashi@mizu', '!chawan@frontL', 'shifuku@frontR'].concat(HIKI).concat(['arrow@frontL>knee']),
          q: '荘ってあった茶碗はどう扱うか。',
          a: '両手で丁寧に膝前へ取り込み、続いて茶入を茶碗と膝の間に置く',
          w: ['片手で素早く引き寄せる', '荘ったまま、水指の前で茶を練る', '茶入より先に仕覆を脱がせてから茶碗を取る'],
          exp: '取り込みの順序は平点前と同じですが、由緒ある道具ほど扱いを丁寧に。道具を大切にする心が所作に表れます。'
        },
        {
          step: '服加減',
          scene: '濃茶を練って出し、正客が一口飲んだ。',
          items: ['mizusashi@mizu', '!chawan@dasu', 'chaire@mid', 'chasen@midR', 'shifukuOnly@shifukuPos'].concat(HIKI_W),
          q: '亭主の所作はどれか。',
          a: '「お服加減はいかがでございますか」と尋ねる',
          w: ['茶碗の由来を説明し始める', '仕舞いの挨拶をする', '黙って建水を下げる'],
          exp: '荘りの点前でも、濃茶で服加減を尋ねる流れは同じです。'
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
      lead: '貴人（身分の高い方）に茶を差し上げる格式ある点前。貴人茶碗を貴人台に載せて用い、お供には供茶碗で点てます（貴人清次）。',
      caption: '貴人台は茶碗の下の四角で示しています。',
      questions: [
        {
          step: '趣旨',
          scene: '水指の前に、貴人台に載せた茶碗と茶器が置き合わせてある。',
          items: ['mizusashi@mizu', '!kijindai@frontL', 'chawan@frontL', 'natsume@frontR'],
          q: '貴人点とはどのような点前か。',
          a: '貴人に対し、貴人台を用いるなど格式を整えて茶を差し上げる点前',
          w: ['亭主が貴人の席に座って茶を飲む点前', '客自身が茶を点てる点前', '道具をすべて客前に並べて点てる略式の点前'],
          exp: '貴人を敬い、貴人台を用いるなど格式を整えて点てる点前です。'
        },
        {
          step: '茶を出す',
          scene: '貴人のための茶が点った。',
          items: ['mizusashi@mizu', '!kijindai@dasu', 'chawan@dasu', 'natsume@mid', 'chasen@midR'].concat(HIKI_W),
          q: '貴人への茶の出し方はどれか。',
          a: '茶碗を貴人台に載せ、台ごと貴人の前に出す',
          w: ['茶碗だけを畳に置いて出す', '茶碗を古帛紗に載せて出す', '供茶碗に移し替えて出す'],
          exp: '貴人の茶碗は貴人台に載せて台ごと出します。台を用いること自体が、貴人への敬意の表れです。'
        },
        {
          step: '貴人清次',
          scene: '貴人のお供（相伴の客）にも茶を差し上げる。',
          items: ['mizusashi@mizu', 'kijindai@dasu', 'chawan@dasu', '!tomo@tomoOut', 'natsume@mid', 'chasen@midR'].concat(HIKI_W),
          q: 'お供の茶の扱いとして正しいのはどれか。',
          a: '供茶碗を用い、貴人の茶の後に点てて出す',
          w: ['貴人茶碗で続けて点て、同じ台に載せて出す', '貴人と同時に出すため、先に供の茶を点てる', 'お供には茶を出さない'],
          exp: '貴人とお供で茶碗を区別し、貴人の茶を先に、次いで供茶碗でお供の茶を点てます（貴人清次）。'
        },
        {
          step: '台の扱い',
          scene: '貴人台に載せた茶碗を扱う。',
          items: ['mizusashi@mizu', '!kijindai@frontL', 'chawan@frontL', 'natsume@frontR'],
          q: '貴人台の扱いで心得るべきことはどれか。',
          a: '台の縁を両手で持ち、茶碗が傾いたり揺れたりしないよう静かに扱う',
          w: ['台は茶碗より先に客へ回して拝見してもらう', '台は片手で持ち、茶碗を指で押さえる', '台を裏返して茶碗を載せる'],
          exp: '台に載った茶碗は揺れやすいもの。両手で安定させ、静かに扱います。'
        },
        {
          step: '清浄',
          scene: '貴人点の準備をする。',
          items: ['mizusashi@mizu', 'kijindai@frontL', '!chawan@frontL', 'natsume@frontR'],
          q: '貴人点の準備の心得として、ふさわしいものはどれか。',
          a: '茶筅・茶巾などはとりわけ清らかなものを整える',
          w: ['使い慣れて傷んだ道具をあえて用いる', '茶巾は省略する', '茶碗を仕組まずに運び出す'],
          exp: '貴人をもてなすため、茶筅・茶巾などは清浄なものを整えるのが心得とされます。'
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
      lead: '長板の上に水指・杓立・建水を荘りつけて行う点前です（総荘）。建水を運び出さず、長板から下ろして用いるのが特徴です。',
      caption: '長板の上は、左から建水（蓋置を入れる）・杓立（柄杓・火箸）・水指。',
      questions: [
        {
          step: '荘り',
          scene: '長板の上に道具が荘りつけてある。',
          items: ['!kensui@nKensui', 'futaoki@nFutaoki', '!shakutate@nShaku', 'hishaku@shakutate', '!mizusashi@nMizu'],
          q: '総荘で長板に荘る道具の組み合わせとして正しいのはどれか。',
          a: '建水（蓋置を入れる）・杓立（柄杓と火箸）・水指',
          w: ['水指・茶碗・茶入', '建水・茶碗・棗', '水指・釜・蓋置'],
          exp: '総荘は、水指・杓立・建水の皆具をすべて長板に荘る形です。蓋置は建水の中に入れておきます。'
        },
        {
          step: '運び出し',
          scene: '茶道口で総礼をした。',
          items: ['kensui@nKensui', 'futaoki@nFutaoki', 'shakutate@nShaku', 'hishaku@shakutate', 'mizusashi@nMizu', 'host@door'],
          q: '亭主が運び出すものはどれか。',
          a: '茶碗と茶器（濃茶は茶入、薄茶は棗）',
          w: ['建水', '水指', '柄杓と蓋置'],
          exp: '建水・柄杓・蓋置・水指は荘ってあるので、運び出すのは茶碗と茶器だけです。'
        },
        {
          step: '建水を下ろす',
          scene: '茶碗と茶器を置き合わせ、点前座に座った。',
          items: ['!kensui@nKensui', 'futaoki@nFutaoki', 'shakutate@nShaku', 'hishaku@shakutate', 'mizusashi@nMizu', 'chawan@frontL', 'natsume@frontR', 'arrow@nKensui>kensui'],
          q: '次の所作はどれか。',
          a: '建水を長板から下ろし、左膝の横の定位置に置く',
          w: ['建水を長板に置いたまま、湯を捨てる', '水指を長板から下ろす', '杓立ごと膝前に取り込む'],
          exp: '総荘では建水を運び出さない代わりに、長板から下ろして用います。'
        },
        {
          step: '柄杓・蓋置',
          scene: '建水を下ろした。',
          items: ['kensui@kensui', '!futaoki@kensuiIn', 'shakutate@nShaku', '!hishaku@shakutate', 'mizusashi@nMizu', 'chawan@frontL', 'natsume@frontR'],
          q: '次の所作はどれか。',
          a: '杓立から柄杓を取って構え、建水から蓋置を取り出して定位置に置き、柄杓を引く',
          w: ['火箸を杓立から取り出して炉縁に置く', '柄杓は杓立に立てたまま点前を進める', '蓋置を長板の上に置く'],
          exp: '柄杓は杓立から取り、蓋置は建水から取り出して据えます。引柄杓のあと総礼、以降は平点前と同様に進めます。'
        },
        {
          step: '火箸',
          scene: '杓立には柄杓とともに火箸が立ててある。',
          items: ['kensui@kensui', 'futaoki@futaoki', '!shakutate@nShaku', 'hishaku@onFutaoki', 'mizusashi@nMizu', 'chawan@frontL', 'natsume@frontR'],
          q: '杓立の火箸は、点前中どう扱うか。',
          a: '荘りとして立てておき、茶を点てる点前では用いない',
          w: ['茶碗を温めるのに用いる', '茶筅の穂先を整えるのに用いる', '総礼の前に建水に入れておく'],
          exp: '総荘の火箸は皆具の荘りの一部です。茶を点てる点前の中で使うことはありません。'
        },
        {
          step: '荘り直し',
          scene: '点前を終え、拝見の道具も戻って片付けに入る。',
          items: ['!kensui@kensui', '!futaoki@futaoki', '!hishaku@onFutaoki', 'shakutate@nShaku', 'mizusashi@nMizu'],
          q: '柄杓・蓋置・建水はどうするか。',
          a: '柄杓は杓立へ、蓋置は建水に入れ、建水を長板の元の位置に荘り戻す',
          w: ['建水は水屋に下げ、長板には何も戻さない', '柄杓と蓋置は拝見に出す', '柄杓を長板の上に横たえて置く'],
          exp: '総荘は、終わりに初めと同じ荘りの形に戻します。長板の上が整った姿で客を送り出します。'
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
      lead: '点前畳の中に炉を切る八炉のひとつ。炉が向こうの客付寄りにあるため、道具の位置関係が四畳半切とは変わります。',
      caption: '向切の配置は目安を示した略図です。',
      questions: [
        {
          step: '八炉',
          scene: '炉の切り方には何通りかある。',
          items: ['mizusashi@mizu'],
          q: '「八炉」とは何を指すか。',
          a: '四畳半切・台目切・向切・隅炉の四つの炉の切り方に、本勝手・逆勝手を合わせた八通り',
          w: ['一年のうち炉を用いる八か月', '八畳の広間に切る炉', '八種類の炉縁の塗り'],
          exp: '炉の切り方四種 × 本勝手・逆勝手の二通りで八通り。これを総称して八炉といいます。'
        },
        {
          step: '炉の位置',
          scene: '向切の点前座を上から見ている。',
          items: ['mizusashi@mizu'],
          q: '向切の炉はどこに切られているか。',
          a: '点前畳の中、向こう側の客付寄り',
          w: ['点前畳の外、客畳との間の半畳', '点前畳の中、手前の勝手付寄り', '床の間の前の客畳'],
          exp: '向切は点前畳の向こう（前方）、客付寄りに炉を切ります。四畳半切のように畳の外ではなく、点前畳の中にあるのが特徴です。'
        },
        {
          step: '水指',
          scene: '炉が向こうの客付寄りにあるため、水指の置き場所が四畳半切と異なる。',
          items: ['!mizusashi@mizu'],
          q: '向切での水指の位置として、図に示したものはどれか。',
          a: '炉の勝手付（左）側、点前畳の向こう寄り',
          w: ['炉の客付（右）側の客畳の上', '亭主の右膝の横', '炉の真上の炉縁の上'],
          exp: '炉が向こうの客付寄りにあるので、水指は向こうの勝手付側に据えます（図は目安）。'
        },
        {
          step: '取り込み',
          scene: '建水を運び、柄杓・蓋置を据えて総礼をした。',
          items: ['mizusashi@mizu', '!chawan@frontL', '!shifuku@frontR'].concat(HIKI),
          q: '次の所作はどれか。',
          a: '茶碗を膝前に取り込み、茶入を茶碗と膝の間に置く',
          w: ['茶碗を炉縁の上に置く', '茶入を水指の蓋の上に置く', '茶入を仕覆のまま客付に出す'],
          exp: '炉の位置が変わっても、茶碗・茶入を取り込む順と位置関係は平点前と同じです。'
        },
        {
          step: '清め',
          scene: '仕覆を脱がせ、茶入を膝前に置いた。',
          items: ['mizusashi@mizu', 'chawan@knee', '!chaire@mid', 'shifukuOnly@shifukuPos'].concat(HIKI),
          q: '次の所作はどれか。',
          a: '帛紗を四方さばきして茶入を清める',
          w: ['茶入を炉縁に置いて清める', '茶巾で茶入を拭く', '茶入を清めずに茶杓を炉縁で払う'],
          exp: '濃茶の茶入は、八炉でも四方さばきで清めます。'
        },
        {
          step: '練る',
          scene: '茶入の抹茶を茶碗に入れ、回し出しをした。',
          items: ['mizusashi@mizu', '!chawan@knee', 'chaire@mid', 'chasen@midR', 'shifukuOnly@shifukuPos'].concat(HIKI_W),
          q: '次の所作はどれか。',
          a: '炉の釜から湯を汲み、適量を注いで練り、湯を足して練り上げる',
          w: ['水指の水で練る', '湯を一度に注いで泡立てる', '茶碗を炉縁の上に置いて練る'],
          exp: '向切では釜が向こうにあるため、湯を汲む柄杓の運びが四畳半切とは変わります。茶碗は膝前で練ります。'
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
      lead: '点前畳の向こう、勝手付の隅に炉を切る八炉のひとつ。向切と左右が入れ替わる位置関係を意識しましょう。',
      caption: '隅炉の配置は目安を示した略図です。',
      questions: [
        {
          step: '炉の位置',
          scene: '隅炉の点前座を上から見ている。',
          items: ['mizusashi@mizu'],
          q: '隅炉の炉はどこに切られているか。',
          a: '点前畳の中、向こう側の勝手付の隅',
          w: ['点前畳の中、向こう側の客付寄り', '点前畳の外、客畳の半畳', '点前畳の手前、茶道口の近く'],
          exp: '隅炉は点前畳の向こう、勝手付の隅に炉を切ります。向こうの客付寄りに切る向切とは、左右が逆の関係です。'
        },
        {
          step: '向切との違い',
          scene: '向切と隅炉を比べる。',
          items: ['mizusashi@mizu'],
          q: '隅炉と向切の違いとして正しいのはどれか。',
          a: 'どちらも点前畳の向こうに切るが、隅炉は勝手付、向切は客付寄りに切る',
          w: ['隅炉は畳の外、向切は畳の中に切る', '隅炉は風炉の季節、向切は炉の季節に用いる', '隅炉は薄茶専用、向切は濃茶専用'],
          exp: 'いずれも点前畳の中に切る炉です。炉が勝手付か客付かで、水指・蓋置・柄杓の運びが変わります。'
        },
        {
          step: '水指',
          scene: '炉が勝手付の隅にある。',
          items: ['!mizusashi@mizu'],
          q: '図に示した水指の位置はどれか。',
          a: '炉の客付側（右）、点前畳の向こう寄り',
          w: ['炉の勝手付側の壁際', '亭主の左膝の横', '客畳の上'],
          exp: '炉が勝手付の隅にあるので、水指は炉の客付側に据えます（図は目安）。'
        },
        {
          step: '取り込み',
          scene: '総礼をした。',
          items: ['mizusashi@mizu', '!chawan@frontL', '!shifuku@frontR'].concat(HIKI),
          q: '次の所作はどれか。',
          a: '茶碗を膝前に取り込み、茶入を茶碗と膝の間に置く',
          w: ['茶入を炉の手前に置く', '茶碗を建水の後ろに置く', '茶碗と茶入を同時に左手で取る'],
          exp: '炉の位置が変わっても、取り込みの順と位置関係は変わりません。'
        },
        {
          step: '仕覆',
          scene: '茶碗と、仕覆に入った茶入を取り込んだ。',
          items: ['mizusashi@mizu', 'chawan@knee', '!shifuku@mid'].concat(HIKI),
          q: '次の所作はどれか。',
          a: '仕覆の緒を解いて仕覆を脱がせ、茶入を膝前に置く',
          w: ['仕覆のまま四方さばきで清める', '仕覆を炉縁に掛けておく', '茶入の蓋を開けてから仕覆を脱がせる'],
          exp: '仕覆を脱がせた後、帛紗を四方さばきして茶入を清めます。'
        },
        {
          step: '拝見',
          scene: '仕舞い付けを終え、正客から拝見を請われた。',
          items: ['mizusashi@mizu', 'chawan@frontL', '!chaire@frontR', 'shifukuOnly@shifukuPos'].concat(HIKI).concat(['arrow@frontR>haiken1']),
          q: '拝見に出すものはどれか。',
          a: '茶入・茶杓・仕覆',
          w: ['茶入・茶碗', '茶杓のみ', '水指・茶入'],
          exp: '濃茶の拝見物は、八炉でも茶入・茶杓・仕覆です。'
        }
      ]
    },

    /* ===== 10. 絞り茶巾・筒茶碗 ===== */
    {
      id: 'shibori',
      group: '応用',
      tab: '絞り茶巾・筒茶碗',
      title: '絞り茶巾 / 筒茶碗の点前',
      room: 'honkatte',
      lead: '寒さの厳しい時期に、深い筒茶碗を用いる点前。茶巾を絞ったまま茶碗に仕組む「絞り茶巾」の扱いを確かめます。',
      caption: '筒茶碗は、ふつうの茶碗より小さく深い円で示しています。',
      questions: [
        {
          step: '季節',
          scene: '筒茶碗を用意する。',
          items: ['mizusashi@mizu', '!tsutsu@frontL', 'natsume@frontR'],
          q: '筒茶碗が主に用いられるのはどの時期か。',
          a: '寒さの厳しい時期（厳冬）',
          w: ['盛夏', '初夏の風炉の始まり', '季節を問わず、客が多いとき'],
          exp: '筒茶碗は口が狭く深いため、茶が冷めにくいのが特徴。寒さの厳しい時期に用いられます。'
        },
        {
          step: '絞り茶巾',
          scene: '筒茶碗に茶巾を仕組む。',
          items: ['mizusashi@mizu', '!tsutsu@frontL', 'natsume@frontR'],
          q: '「絞り茶巾」とはどのような仕組み方か。',
          a: '茶巾を絞った形のまま、茶碗に入れて仕組む',
          w: ['茶巾を濡らさず、乾いたまま入れる', '茶巾を茶碗の外側に巻きつける', '茶巾を建水に入れて運び出す'],
          exp: '深い筒茶碗には、たたんだ茶巾が収まりにくいため、絞った形のまま入れて仕組みます。'
        },
        {
          step: '茶巾を扱う',
          scene: '釜の蓋を取り、茶巾を取り出す場面になった。',
          items: ['mizusashi@mizu', '!tsutsu@knee', 'natsume@mid', 'chasen@midR', 'kensui@kensui', 'kamabuta@futaoki', 'hishaku@onKama'],
          q: '絞った茶巾はどう扱うか。',
          a: '茶碗から取り出して広げ、たたみ直してから釜の蓋の上に置く',
          w: ['絞ったまま釜の蓋の上に置く', '絞ったまま建水に捨てる', '茶碗の中に入れたまま茶筅通しをする'],
          exp: '絞り茶巾は、取り出したところで広げてたたみ直し、ふだんの茶巾と同じように釜の蓋の上に置きます。'
        },
        {
          step: '拭く',
          scene: '茶筅通しをして、湯を建水に捨てた。',
          items: ['mizusashi@mizu', '!tsutsu@knee', 'natsume@mid', 'chasen@midR', 'kensui@kensui', 'kamabuta@futaoki', 'chakin@futaoki', 'hishaku@onKama'],
          q: '筒茶碗を拭くときの心得はどれか。',
          a: '深さがあるので、茶巾を底まで届かせて内側をていねいに拭く',
          w: ['深いので内側は拭かず、縁だけを拭く', '帛紗で内側を拭く', '茶筅で水気を払って拭いたことにする'],
          exp: '筒茶碗は深いぶん、茶巾の扱いに工夫が要ります。底に水気が残らないよう、落ち着いて拭きます。'
        },
        {
          step: '茶を出す',
          scene: '筒茶碗で茶を点てた。',
          items: ['mizusashi@mizu', '!tsutsu@knee', 'natsume@mid', 'chasen@midR', 'kensui@kensui', 'kamabuta@futaoki', 'chakin@futaoki', 'hishaku@onKama', 'arrow@knee>dasu'],
          q: '茶碗の出し方として正しいのはどれか。',
          a: '正面を客に向けて出す（ふだんの茶碗と同じ）',
          w: ['筒茶碗は横に寝かせて出す', '正面を自分に向けて出す', '貴人台に載せて出す'],
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
      lead: '炉が切られていない部屋でも炉の季節の点前ができるよう、畳の上に据えて用いる炉です。',
      caption: '置炉は据える場所や道具により位置が変わります。図は切炉の位置に準じた一例です。',
      questions: [
        {
          step: '置炉とは',
          scene: '炉の切られていない部屋で、炉の季節に稽古をする。',
          items: ['mizusashi@mizu'],
          q: '置炉とはどのようなものか。',
          a: '炉が切られていない部屋で、畳などの上に据えて炉として用いる道具',
          w: ['風炉の季節に炉の代わりに用いる火鉢', '炉の灰だけを入れておく箱', '炉縁を外して掃除する道具'],
          exp: '置炉は、切炉のない部屋でも炉の点前ができるように据えて用いる炉です。'
        },
        {
          step: '季節',
          scene: '置炉を用いる時期を考える。',
          items: ['mizusashi@mizu'],
          q: '置炉を用いるのは、主にどの季節か。',
          a: '炉の季節（おおむね十一月から四月）',
          w: ['風炉の季節（五月から十月）', '夏の盛りだけ', '一年中いつでも'],
          exp: '置炉も炉の一種なので、炉の季節に用います。十一月の炉開きから四月までが炉の季節です。'
        },
        {
          step: '点前',
          scene: '置炉で薄茶の点前をする。',
          items: U_SET.concat(HIKI),
          q: '点前の基本はどれに準じるか。',
          a: '炉の点前に準じて行う',
          w: ['風炉の点前に準じて行う', '立礼の点前に準じ、椅子に座って行う', '点前は行わず、水屋で点てて運ぶ'],
          exp: '置炉でも、道具の運び出しや清め、点て方などは炉の点前に準じて行います。'
        },
        {
          step: '安全',
          scene: '置炉を据えて炭を入れた。',
          items: U_SET.concat(HIKI),
          q: '置炉を扱う上での注意として適切なものはどれか。',
          a: '据える場所が平らで安定しているかを確かめ、周りの熱や火の扱いに気を配る',
          w: ['置炉は動かせるので、点前の途中で位置を変えてよい', '釜は載せずに湯を別に運ぶ', '炉縁の上に建水を置く'],
          exp: '置炉は床に切り込まれていないため、安定と火の安全への配慮が特に大切です。'
        },
        {
          step: '運び出し',
          scene: '置炉を据えた部屋で、薄茶運び点前を始める。',
          items: ['host@door'],
          q: '最初に運び出す道具はどれか。',
          a: '水指',
          w: ['建水', '茶碗と棗', '柄杓と蓋置'],
          exp: '置炉でも運び点前の順序は「水指 → 茶碗・茶器 → 建水」です。'
        }
      ]
    }
  ];

  /* ---------------------------------------------------------
     3. SVG 描画
     --------------------------------------------------------- */
  const SVG_DEFS =
    '<defs>' +
    '<pattern id="tmH" width="4" height="3" patternUnits="userSpaceOnUse">' +
    '<rect width="4" height="3" fill="#cfc58d"/><line x1="0" y1="2.6" x2="4" y2="2.6" stroke="#b7ac6f" stroke-width=".55"/></pattern>' +
    '<pattern id="tmV" width="3" height="4" patternUnits="userSpaceOnUse">' +
    '<rect width="3" height="4" fill="#bdb277"/><line x1="2.6" y1="0" x2="2.6" y2="4" stroke="#a79c62" stroke-width=".55"/></pattern>' +
    '<pattern id="tmHalf" width="4" height="3" patternUnits="userSpaceOnUse">' +
    '<rect width="4" height="3" fill="#c3b87c"/><line x1="0" y1="2.6" x2="4" y2="2.6" stroke="#aa9f64" stroke-width=".55"/></pattern>' +
    '<linearGradient id="woodG" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#7d5635"/><stop offset="1" stop-color="#4f341f"/></linearGradient>' +
    '<radialGradient id="kamaG" cx=".4" cy=".35" r=".7"><stop offset="0" stop-color="#5b5550"/><stop offset="1" stop-color="#26221f"/></radialGradient>' +
    '<radialGradient id="waterG" cx=".45" cy=".4" r=".7"><stop offset="0" stop-color="#6d8d98"/><stop offset="1" stop-color="#34505a"/></radialGradient>' +
    '<marker id="arrowHead" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">' +
    '<path d="M0,0 L10,5 L0,10 z" fill="#b8431f"/></marker>' +
    '</defs>';

  const Z = { nagaita: 0, tana: 0, kijindai: 1, hishaku: 4, chashaku: 4, kamabuta: 3, chakin: 5, host: 6, arrow: 7 };

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
    // 同じ「種類@位置」は1つにまとめ、強調があれば残す
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

  function tatamiLayer(room) {
    let s = '';
    s += '<rect x="0" y="0" width="300" height="248" fill="url(#tmV)"/>';
    // 客畳の区切り
    s += '<line x1="150" y1="115" x2="300" y2="115" stroke="#2f3a30" stroke-width="2.4"/>';
    s += '<line x1="150" y1="215" x2="300" y2="215" stroke="#2f3a30" stroke-width="2.4"/>';
    if (room.half) {
      s += '<rect x="150" y="115" width="100" height="100" fill="url(#tmHalf)"/>';
      s += '<line x1="250" y1="115" x2="250" y2="215" stroke="#2f3a30" stroke-width="2.4"/>';
    }
    // 点前畳
    s += '<rect x="50" y="15" width="100" height="200" fill="url(#tmH)"/>';
    s += '<rect x="50" y="15" width="3.6" height="200" fill="#27312a"/>';
    s += '<rect x="146.4" y="15" width="3.6" height="200" fill="#27312a"/>';
    s += '<rect x="50" y="15" width="100" height="200" fill="none" stroke="#6f6640" stroke-width=".6"/>';
    s += '<text class="lbl-mat" x="100" y="128" text-anchor="middle">点前畳</text>';
    // 方位
    s += '<text class="lbl-dir" x="100" y="10" text-anchor="middle">向こう</text>';
    s += '<text class="lbl-dir" x="100" y="226" text-anchor="middle">手前</text>';
    s += '<text class="lbl-dir" x="25" y="112" text-anchor="middle">勝手付</text>';
    s += '<text class="lbl-dir" x="25" y="121" text-anchor="middle">←</text>';
    s += '<text class="lbl-dir" x="276" y="70" text-anchor="middle">客付 →</text>';
    s += '<text class="lbl-dir" x="276" y="80" text-anchor="middle">（客座）</text>';
    return s;
  }

  function roLayer(room, kamaOpen) {
    const r = room.ro;
    const cx = r.x + r.s / 2;
    const cy = r.y + r.s / 2;
    let s = '';
    if (r.kind === 'oki') {
      s += '<rect x="' + (r.x + 3) + '" y="' + (r.y + 4) + '" width="' + (r.s + 2) + '" height="' + (r.s + 2) + '" rx="2" fill="rgba(40,25,10,.28)"/>';
      s += '<rect x="' + (r.x - 3) + '" y="' + (r.y - 3) + '" width="' + (r.s + 6) + '" height="' + (r.s + 6) + '" rx="2" fill="#3d2818" stroke="#23160c" stroke-width=".8"/>';
    }
    s += '<rect x="' + r.x + '" y="' + r.y + '" width="' + r.s + '" height="' + r.s + '" fill="url(#woodG)" stroke="#2c1d10" stroke-width=".8"/>';
    s += '<rect x="' + (r.x + 5.5) + '" y="' + (r.y + 5.5) + '" width="' + (r.s - 11) + '" height="' + (r.s - 11) + '" fill="#a79d8e"/>';
    s += '<circle cx="' + cx + '" cy="' + cy + '" r="15.5" fill="url(#kamaG)" stroke="#1c1916" stroke-width=".8"/>';
    if (kamaOpen) {
      s += '<circle cx="' + cx + '" cy="' + cy + '" r="9.5" fill="url(#waterG)"/>';
    } else {
      s += '<circle cx="' + cx + '" cy="' + cy + '" r="10" fill="#4a4540" stroke="#2a2622" stroke-width=".6"/>';
      s += '<circle cx="' + cx + '" cy="' + cy + '" r="2.4" fill="#2a2622"/>';
    }
    const roName = r.kind === 'oki' ? '置炉' : '炉';
    s += '<text class="lbl" x="' + (r.x + r.s + 3) + '" y="' + (r.y + 8) + '">' + roName + '</text>';
    s += '<text class="lbl" x="' + (r.x + r.s + 3) + '" y="' + (r.y + r.s - 2) + '">釜</text>';
    return s;
  }

  function ring(x, y, rad) {
    return '<circle class="hl-ring" cx="' + x + '" cy="' + y + '" r="' + rad + '"/>';
  }

  function labelAt(x, y, side, rad, text) {
    if (!text || side === 'n') return '';
    const gap = rad + 4;
    let tx = x, ty = y, anchor = 'middle';
    if (side === 'b') { ty = y + gap + 6; }
    else if (side === 't') { ty = y - gap; }
    else if (side === 'l') { tx = x - gap; ty = y + 2.6; anchor = 'end'; }
    else if (side === 'r') { tx = x + gap; ty = y + 2.6; anchor = 'start'; }
    return '<text class="lbl" x="' + tx + '" y="' + ty + '" text-anchor="' + anchor + '">' + text + '</text>';
  }

  function drawItem(it, room) {
    const name = it.label || NAMES[it.type] || '';
    let shape = '';
    let lbl = '';

    // 棚・長板（矩形）
    if (it.type === 'tana' || it.type === 'nagaita') {
      const rc = room.rects[it.pos];
      if (!rc) return { shape: '', lbl: '' };
      const x = rc[0], y = rc[1], w = rc[2], h = rc[3];
      if (it.type === 'tana') {
        shape += '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" fill="rgba(122,86,52,.30)" stroke="#5c3e24" stroke-width="1.4" stroke-dasharray="4 2"/>';
        shape += '<rect x="' + x + '" y="' + y + '" width="4" height="4" fill="#5c3e24"/><rect x="' + (x + w - 4) + '" y="' + y + '" width="4" height="4" fill="#5c3e24"/>';
        shape += '<rect x="' + x + '" y="' + (y + h - 4) + '" width="4" height="4" fill="#5c3e24"/><rect x="' + (x + w - 4) + '" y="' + (y + h - 4) + '" width="4" height="4" fill="#5c3e24"/>';
        lbl = '<text class="lbl" x="' + (x + 2) + '" y="' + (y - 2) + '">' + name + '（天板・地板）</text>';
      } else {
        shape += '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="1" fill="#7a5433" stroke="#43291a" stroke-width=".8"/>';
        for (let i = 1; i < 6; i++) {
          shape += '<line x1="' + x + '" y1="' + (y + i * h / 6) + '" x2="' + (x + w) + '" y2="' + (y + i * h / 6 + 1) + '" stroke="rgba(0,0,0,.12)" stroke-width=".5"/>';
        }
        lbl = '<text class="lbl" x="' + (x - 3) + '" y="' + (y + h / 2 + 2.6) + '" text-anchor="end">' + name + '</text>';
      }
      if (it.hl) shape += '<rect class="hl-ring" x="' + (x - 3) + '" y="' + (y - 3) + '" width="' + (w + 6) + '" height="' + (h + 6) + '"/>';
      return { shape: shape, lbl: lbl };
    }

    // 柄杓（線）
    if (it.type === 'hishaku') {
      const h = room.hishaku[it.pos];
      if (!h) return { shape: '', lbl: '' };
      shape += '<line x1="' + h[0] + '" y1="' + h[1] + '" x2="' + h[2] + '" y2="' + h[3] + '" stroke="#c9ad73" stroke-width="2.4" stroke-linecap="round"/>';
      shape += '<line x1="' + h[0] + '" y1="' + h[1] + '" x2="' + h[2] + '" y2="' + h[3] + '" stroke="#8a6a36" stroke-width=".6" stroke-linecap="round"/>';
      shape += '<circle cx="' + h[0] + '" cy="' + h[1] + '" r="4.4" fill="#d8bf86" stroke="#7a5a2c" stroke-width=".8"/>';
      if (it.hl) shape += ring(h[0], h[1], 8);
      const mx = (h[0] + h[2]) / 2 + 5, my = (h[1] + h[3]) / 2;
      lbl = '<text class="lbl" x="' + mx + '" y="' + my + '">' + name + '</text>';
      return { shape: shape, lbl: lbl };
    }

    // 矢印
    if (it.type === 'arrow') {
      const ends = it.pos.split('>');
      const a = room.pos[ends[0]], b = room.pos[ends[1]];
      if (!a || !b) return { shape: '', lbl: '' };
      const dx = b[0] - a[0], dy = b[1] - a[1];
      const len = Math.sqrt(dx * dx + dy * dy) || 1;
      const ux = dx / len, uy = dy / len;
      const sx = a[0] + ux * 12, sy = a[1] + uy * 12;
      const ex = b[0] - ux * 12, ey = b[1] - uy * 12;
      const cx = (sx + ex) / 2 - uy * 10, cy = (sy + ey) / 2 + ux * 10;
      shape = '<path class="arrow-path" d="M' + sx + ',' + sy + ' Q' + cx + ',' + cy + ' ' + ex + ',' + ey + '" marker-end="url(#arrowHead)"/>';
      return { shape: shape, lbl: '' };
    }

    const p = room.pos[it.pos];
    if (!p) return { shape: '', lbl: '' };
    const x = p[0], y = p[1], side = p[2] || 'b';
    let rad = 8;

    switch (it.type) {
      case 'mizusashi':
        rad = 15;
        shape += '<circle cx="' + x + '" cy="' + y + '" r="15" fill="#6c7f84" stroke="#3d4b4f" stroke-width="1"/>';
        shape += '<circle cx="' + x + '" cy="' + y + '" r="11" fill="#1f1b18" stroke="#57504a" stroke-width=".6"/>';
        shape += '<circle cx="' + x + '" cy="' + y + '" r="1.8" fill="#8a7a5a"/>';
        break;
      case 'chawan':
      case 'tomo':
        rad = 10;
        shape += '<circle cx="' + x + '" cy="' + y + '" r="10" fill="' + (it.type === 'tomo' ? '#7f8c6a' : '#a8703f') + '" stroke="#5a3a1e" stroke-width=".9"/>';
        shape += '<circle cx="' + x + '" cy="' + y + '" r="6.6" fill="' + (it.type === 'tomo' ? '#c8cfae' : '#d7b98a') + '"/>';
        break;
      case 'tsutsu':
        rad = 8;
        shape += '<circle cx="' + x + '" cy="' + y + '" r="8" fill="#6f5a45" stroke="#3b2c1e" stroke-width=".9"/>';
        shape += '<circle cx="' + x + '" cy="' + y + '" r="5.6" fill="#3b2f25"/>';
        shape += '<circle cx="' + x + '" cy="' + y + '" r="2.4" fill="#e9e4d5"/>';
        break;
      case 'natsume':
        rad = 6.5;
        shape += '<circle cx="' + x + '" cy="' + y + '" r="6.5" fill="#1d1916" stroke="#000" stroke-width=".5"/>';
        shape += '<path d="M' + (x - 3.6) + ',' + (y - 2.6) + ' A4.4,4.4 0 0 1 ' + (x + 1.6) + ',' + (y - 4.4) + '" fill="none" stroke="rgba(255,255,255,.45)" stroke-width="1"/>';
        break;
      case 'chaire':
        rad = 6;
        shape += '<circle cx="' + x + '" cy="' + y + '" r="6" fill="#6b3f1f" stroke="#3a2210" stroke-width=".6"/>';
        shape += '<circle cx="' + x + '" cy="' + y + '" r="3.4" fill="#e5dcc2" stroke="#8a7a5a" stroke-width=".4"/>';
        break;
      case 'shifuku':
        rad = 7.5;
        shape += '<circle cx="' + x + '" cy="' + y + '" r="7.5" fill="#8c6a2f" stroke="#4a3714" stroke-width=".8"/>';
        shape += '<circle cx="' + x + '" cy="' + y + '" r="5" fill="none" stroke="#e1c77c" stroke-width=".8" stroke-dasharray="1.4 1.2"/>';
        shape += '<line x1="' + x + '" y1="' + (y + 2) + '" x2="' + (x + 3) + '" y2="' + (y + 10) + '" stroke="#b33d2a" stroke-width=".9"/>';
        break;
      case 'shifukuOnly':
        rad = 6;
        shape += '<path d="M' + (x - 6) + ',' + (y + 5) + ' Q' + x + ',' + (y - 10) + ' ' + (x + 6) + ',' + (y + 5) + ' Z" fill="#8c6a2f" stroke="#4a3714" stroke-width=".7"/>';
        shape += '<line x1="' + (x - 4) + '" y1="' + (y + 4) + '" x2="' + (x + 4) + '" y2="' + (y + 4) + '" stroke="#b33d2a" stroke-width=".9"/>';
        break;
      case 'kensui':
        rad = 11.5;
        shape += '<circle cx="' + x + '" cy="' + y + '" r="11.5" fill="#6b706b" stroke="#3b3f3b" stroke-width="1"/>';
        shape += '<circle cx="' + x + '" cy="' + y + '" r="8" fill="#43474a"/>';
        break;
      case 'futaoki':
        rad = 4.6;
        shape += '<circle cx="' + x + '" cy="' + y + '" r="4.6" fill="#a88b52" stroke="#5f4a22" stroke-width=".8"/>';
        shape += '<circle cx="' + x + '" cy="' + y + '" r="2.4" fill="#7f6536"/>';
        break;
      case 'kamabuta':
        rad = 8.5;
        shape += '<circle cx="' + x + '" cy="' + y + '" r="8.5" fill="#4a4540" stroke="#2a2622" stroke-width=".7"/>';
        shape += '<circle cx="' + x + '" cy="' + y + '" r="2" fill="#2a2622"/>';
        break;
      case 'chakin':
        rad = 5;
        shape += '<rect x="' + (x - 4.5) + '" y="' + (y - 3) + '" width="9" height="6" rx="1" fill="#f7f5ee" stroke="#b9b3a2" stroke-width=".6"/>';
        break;
      case 'chasen':
        rad = 5.5;
        shape += '<circle cx="' + x + '" cy="' + y + '" r="5.5" fill="#efe4c1" stroke="#9c8a55" stroke-width=".7"/>';
        for (let i = 0; i < 8; i++) {
          const ang = i * Math.PI / 4;
          shape += '<line x1="' + x + '" y1="' + y + '" x2="' + (x + Math.cos(ang) * 4.6) + '" y2="' + (y + Math.sin(ang) * 4.6) + '" stroke="#b6a46c" stroke-width=".45"/>';
        }
        break;
      case 'chashaku':
        rad = 6;
        shape += '<line x1="' + (x - 9) + '" y1="' + (y + 1) + '" x2="' + (x + 9) + '" y2="' + (y - 1) + '" stroke="#d9c188" stroke-width="2" stroke-linecap="round"/>';
        shape += '<line x1="' + (x - 9) + '" y1="' + (y + 1) + '" x2="' + (x + 9) + '" y2="' + (y - 1) + '" stroke="#8a6f3a" stroke-width=".5" stroke-linecap="round"/>';
        break;
      case 'kijindai':
        rad = 15;
        shape += '<rect x="' + (x - 14) + '" y="' + (y - 14) + '" width="28" height="28" rx="3" fill="#3a2317" stroke="#1d110a" stroke-width=".8"/>';
        shape += '<rect x="' + (x - 11) + '" y="' + (y - 11) + '" width="22" height="22" rx="2" fill="none" stroke="#a4873d" stroke-width=".6"/>';
        break;
      case 'shakutate':
        rad = 6.5;
        shape += '<circle cx="' + x + '" cy="' + y + '" r="6.5" fill="#8e9696" stroke="#4e5656" stroke-width=".8"/>';
        shape += '<line x1="' + (x + 2) + '" y1="' + (y + 1) + '" x2="' + (x + 4) + '" y2="' + (y - 16) + '" stroke="#3a3a3a" stroke-width="1"/>';
        shape += '<line x1="' + (x + 3.4) + '" y1="' + (y + 1) + '" x2="' + (x + 5.8) + '" y2="' + (y - 16) + '" stroke="#3a3a3a" stroke-width="1"/>';
        break;
      case 'host':
        rad = 14;
        shape += '<ellipse cx="' + x + '" cy="' + (y + 3) + '" rx="15" ry="9" fill="#4d5b45" stroke="#2c3627" stroke-width=".8"/>';
        shape += '<circle cx="' + x + '" cy="' + (y - 1) + '" r="6.4" fill="#2b2622"/>';
        break;
      default:
        shape += '<circle cx="' + x + '" cy="' + y + '" r="6" fill="#888"/>';
    }
    if (it.hl) shape += ring(x, y, rad + 4.5);
    if (it.type === 'chakin' || it.hidden) {
      lbl = '';
    } else if (it.type === 'kamabuta') {
      lbl = labelAt(x, y, 'b', rad, '釜の蓋' + (it.withChakin ? '・茶巾' : ''));
    } else if (it.type === 'chashaku') {
      lbl = '<text class="lbl" x="' + (x - 12) + '" y="' + (y + 13) + '" text-anchor="end">' + name + '</text>';
    } else if (it.type === 'kijindai') {
      lbl = '<text class="lbl" x="' + x + '" y="' + (y - 17) + '" text-anchor="middle">' + name + '</text>';
    } else {
      lbl = labelAt(x, it.type === 'host' ? y + 2 : y, side, rad, name);
    }
    return { shape: shape, lbl: lbl };
  }

  function buildSVG(temae, q) {
    const room = ROOMS[temae.room];
    const list = (temae.base || []).concat(q.items || []);
    const items = mergeItems(list);
    if (!items.some(function (i) { return i.type === 'host'; })) {
      items.push({ type: 'host', pos: 'host', hl: false, label: null });
    }
    const kamaOpen = items.some(function (i) { return i.type === 'kamabuta'; });
    // 同じ位置に重なる道具のラベル整理（蓋置の上の釜の蓋・茶巾など）
    items.forEach(function (it) {
      if (it.type === 'futaoki' && items.some(function (o) { return o.type === 'kamabuta' && o.pos === it.pos; })) it.hidden = true;
      if (it.type === 'kamabuta' && items.some(function (o) { return o.type === 'chakin' && o.pos === it.pos; })) it.withChakin = true;
    });

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

    const onDoor = items.some(function (i) { return i.type === 'host' && i.pos === 'door'; });
    const doorMark = onDoor
      ? '<text class="lbl-dir" x="28" y="244" text-anchor="middle">茶道口</text>'
      : '';

    const aria = temae.title + 'の配置図：' + items
      .filter(function (i) { return i.type !== 'arrow'; })
      .map(function (i) { return i.label || NAMES[i.type]; })
      .filter(Boolean).join('、');

    return '<svg viewBox="0 0 300 248" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="' + esc(aria) + '">' +
      SVG_DEFS + tatamiLayer(room) + roLayer(room, kamaOpen) + shapes + labels + doorMark + '</svg>';
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
    finished: false
  };

  const $tabs = document.getElementById('tabs');
  const $panel = document.getElementById('panel');
  const $diagram = document.getElementById('diagram');
  const $caption = document.getElementById('diagramCaption');
  const $title = document.getElementById('temaeTitle');
  const $lead = document.getElementById('temaeLead');
  const $group = document.getElementById('temaeGroup');
  const modeBtns = Array.prototype.slice.call(document.querySelectorAll('.mode-btn'));

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

  function setDiagram(q) {
    $diagram.innerHTML = buildSVG(state.temae, q);
    const room = ROOMS[state.temae.room];
    const cap = '上から見た配置図（' + room.label + '）。点線の輪は、この場面で注目する道具です。' +
      (state.temae.caption ? ' ' + state.temae.caption : '');
    $caption.textContent = cap;
  }

  function render() {
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
    setDiagram(q);

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
    else if (rate >= 0.5) msg = '流れの骨組みはつかめています。「手順を通して見る」で順序を確かめましょう。';
    else msg = 'まずは手順を通して見て、道具の動きを追ってみましょう。繰り返すうちに流れが見えてきます。';

    setDiagram(t.questions[t.questions.length - 1]);

    const best = loadBest()[t.id];
    let html = '<div class="result">';
    html += '<p class="result-score">' + s + '<small> / ' + total + ' 問</small></p>';
    html += '<p class="result-msg">' + msg + '</p>';
    if (best) html += '<p class="result-best">これまでの最高：' + best.score + ' / ' + best.total + '</p>';
    html += '<div class="actions">' +
      '<button type="button" class="btn btn-primary" data-act="retry">もう一度挑戦する</button>' +
      '<button type="button" class="btn" data-act="steps">手順を通して見る</button>';
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
    setDiagram(t.questions[current]);
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
    html += '<div class="actions"><button type="button" class="btn btn-primary" data-act="toQuiz">クイズで答える</button></div>';
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
