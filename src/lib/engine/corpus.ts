// Themed Japanese lesson dialogues used by the built-in transcript engine when
// no speech-to-text provider is configured. Each block is a self-contained
// dialogue with Japanese, romaji and English lines.

export type CorpusLine = {
  ja: string;
  romaji: string;
  en: string;
  speaker: string;
};

export type CorpusBlock = {
  topic: string;
  level: "N5" | "N4" | "N3";
  lines: CorpusLine[];
};

export const CORPUS: CorpusBlock[] = [
  {
    topic: "train-station",
    level: "N5",
    lines: [
      { speaker: "A", ja: "すみません、切符はどこで買えますか？", romaji: "Sumimasen, kippu wa doko de kaemasu ka?", en: "Excuse me, where can I buy a ticket?" },
      { speaker: "B", ja: "あそこの券売機で買えます。", romaji: "Asoko no kenbaiki de kaemasu.", en: "You can buy one at that ticket machine over there." },
      { speaker: "A", ja: "新宿までいくらですか？", romaji: "Shinjuku made ikura desu ka?", en: "How much is it to Shinjuku?" },
      { speaker: "B", ja: "二百円です。", romaji: "Nihyaku en desu.", en: "It's two hundred yen." },
      { speaker: "A", ja: "ありがとうございます。", romaji: "Arigatou gozaimasu.", en: "Thank you very much." },
    ],
  },
  {
    topic: "restaurant",
    level: "N5",
    lines: [
      { speaker: "A", ja: "いらっしゃいませ。何名様ですか？", romaji: "Irasshaimase. Nanmei-sama desu ka?", en: "Welcome. How many people?" },
      { speaker: "B", ja: "二人です。", romaji: "Futari desu.", en: "Two people." },
      { speaker: "A", ja: "こちらへどうぞ。ご注文はお決まりですか？", romaji: "Kochira e douzo. Gochuumon wa okimari desu ka?", en: "This way please. Have you decided on your order?" },
      { speaker: "B", ja: "ラーメンを一つお願いします。", romaji: "Raamen o hitotsu onegaishimasu.", en: "One ramen, please." },
      { speaker: "A", ja: "お飲み物はいかがですか？", romaji: "Onomimono wa ikaga desu ka?", en: "Would you like something to drink?" },
      { speaker: "B", ja: "お水で大丈夫です。", romaji: "Omizu de daijoubu desu.", en: "Water is fine." },
    ],
  },
  {
    topic: "convenience-store",
    level: "N5",
    lines: [
      { speaker: "A", ja: "袋はご利用ですか？", romaji: "Fukuro wa goriyou desu ka?", en: "Would you like a bag?" },
      { speaker: "B", ja: "いいえ、大丈夫です。", romaji: "Iie, daijoubu desu.", en: "No, I'm fine." },
      { speaker: "A", ja: "お弁当は温めますか？", romaji: "Obentou wa atatamemasu ka?", en: "Shall I heat up the bento?" },
      { speaker: "B", ja: "はい、お願いします。", romaji: "Hai, onegaishimasu.", en: "Yes, please." },
      { speaker: "A", ja: "ポイントカードはお持ちですか？", romaji: "Pointo kaado wa omochi desu ka?", en: "Do you have a point card?" },
      { speaker: "B", ja: "持っていません。", romaji: "Motte imasen.", en: "I don't have one." },
    ],
  },
  {
    topic: "directions",
    level: "N4",
    lines: [
      { speaker: "A", ja: "すみません、駅はどこですか？", romaji: "Sumimasen, eki wa doko desu ka?", en: "Excuse me, where is the station?" },
      { speaker: "B", ja: "この道をまっすぐ行って、二つ目の信号を右に曲がってください。", romaji: "Kono michi o massugu itte, futatsume no shingou o migi ni magatte kudasai.", en: "Go straight down this road and turn right at the second traffic light." },
      { speaker: "A", ja: "歩いてどのくらいかかりますか？", romaji: "Aruite dono kurai kakarimasu ka?", en: "How long does it take on foot?" },
      { speaker: "B", ja: "五分ぐらいです。", romaji: "Gofun gurai desu.", en: "About five minutes." },
      { speaker: "A", ja: "分かりました。ありがとうございます。", romaji: "Wakarimashita. Arigatou gozaimasu.", en: "I understand. Thank you." },
    ],
  },
  {
    topic: "self-introduction",
    level: "N5",
    lines: [
      { speaker: "A", ja: "はじめまして。田中です。", romaji: "Hajimemashite. Tanaka desu.", en: "Nice to meet you. I'm Tanaka." },
      { speaker: "B", ja: "はじめまして。エミリーです。アメリカから来ました。", romaji: "Hajimemashite. Emirii desu. Amerika kara kimashita.", en: "Nice to meet you. I'm Emily. I came from America." },
      { speaker: "A", ja: "日本語が上手ですね。", romaji: "Nihongo ga jouzu desu ne.", en: "Your Japanese is good." },
      { speaker: "B", ja: "いえいえ、まだまだです。", romaji: "Ieie, madamada desu.", en: "Oh no, I still have a long way to go." },
      { speaker: "A", ja: "どうぞよろしくお願いします。", romaji: "Douzo yoroshiku onegaishimasu.", en: "Pleased to meet you." },
    ],
  },
  {
    topic: "hotel",
    level: "N4",
    lines: [
      { speaker: "A", ja: "チェックインをお願いします。", romaji: "Chekku-in o onegaishimasu.", en: "I'd like to check in, please." },
      { speaker: "B", ja: "お名前をお伺いしてもよろしいですか？", romaji: "Onamae o oukagai shite mo yoroshii desu ka?", en: "May I have your name?" },
      { speaker: "A", ja: "スミスです。三泊の予約をしています。", romaji: "Sumisu desu. Sanpaku no yoyaku o shite imasu.", en: "It's Smith. I have a reservation for three nights." },
      { speaker: "B", ja: "朝食は七時から十時までです。", romaji: "Choushoku wa shichiji kara juuji made desu.", en: "Breakfast is from seven to ten." },
      { speaker: "A", ja: "Wi-Fiのパスワードを教えてください。", romaji: "Wai-fai no pasuwaado o oshiete kudasai.", en: "Please tell me the Wi-Fi password." },
    ],
  },
  {
    topic: "shopping",
    level: "N5",
    lines: [
      { speaker: "A", ja: "これはいくらですか？", romaji: "Kore wa ikura desu ka?", en: "How much is this?" },
      { speaker: "B", ja: "三千五百円です。", romaji: "Sanzen gohyaku en desu.", en: "It's 3,500 yen." },
      { speaker: "A", ja: "もう少し安いのはありますか？", romaji: "Mou sukoshi yasui no wa arimasu ka?", en: "Do you have anything a little cheaper?" },
      { speaker: "B", ja: "こちらは二千円です。", romaji: "Kochira wa nisen en desu.", en: "This one is 2,000 yen." },
      { speaker: "A", ja: "じゃあ、これをください。", romaji: "Jaa, kore o kudasai.", en: "Then I'll take this one." },
      { speaker: "B", ja: "カードでもお支払いできますか？", romaji: "Kaado demo oshiharai dekimasu ka?", en: "Can I pay by card?" },
    ],
  },
  {
    topic: "grammar-te-form",
    level: "N4",
    lines: [
      { speaker: "T", ja: "今日は「〜てもいいですか」を勉強しましょう。", romaji: "Kyou wa 'te mo ii desu ka' o benkyou shimashou.", en: "Today let's study 'te mo ii desu ka'." },
      { speaker: "T", ja: "許可をもらいたい時に使います。", romaji: "Kyoka o moraitai toki ni tsukaimasu.", en: "We use it when we want to ask for permission." },
      { speaker: "T", ja: "例えば、「写真を撮ってもいいですか？」", romaji: "Tatoeba, 'shashin o totte mo ii desu ka?'", en: "For example, 'May I take a photo?'" },
      { speaker: "T", ja: "「ここに座ってもいいですか？」", romaji: "'Koko ni suwatte mo ii desu ka?'", en: "'May I sit here?'" },
      { speaker: "T", ja: "答え方は、「はい、どうぞ」です。", romaji: "Kotaekata wa, 'hai, douzo' desu.", en: "The way to answer is 'yes, go ahead'." },
    ],
  },
  {
    topic: "grammar-tai",
    level: "N5",
    lines: [
      { speaker: "T", ja: "次は「〜たい」です。したいことを言う時に使います。", romaji: "Tsugi wa 'tai' desu. Shitai koto o iu toki ni tsukaimasu.", en: "Next is 'tai'. Use it to say what you want to do." },
      { speaker: "T", ja: "「日本に行きたいです。」", romaji: "'Nihon ni ikitai desu.'", en: "'I want to go to Japan.'" },
      { speaker: "T", ja: "「寿司が食べたいです。」", romaji: "'Sushi ga tabetai desu.'", en: "'I want to eat sushi.'" },
      { speaker: "T", ja: "あなたは何がしたいですか？", romaji: "Anata wa nani ga shitai desu ka?", en: "What do you want to do?" },
    ],
  },
  {
    topic: "weather-smalltalk",
    level: "N5",
    lines: [
      { speaker: "A", ja: "今日はいい天気ですね。", romaji: "Kyou wa ii tenki desu ne.", en: "It's nice weather today, isn't it?" },
      { speaker: "B", ja: "そうですね。でも、明日は雨だそうです。", romaji: "Sou desu ne. Demo, ashita wa ame da sou desu.", en: "It is. But I hear it'll rain tomorrow." },
      { speaker: "A", ja: "本当ですか？傘を持って行かないと。", romaji: "Hontou desu ka? Kasa o motte ikanai to.", en: "Really? I'd better bring an umbrella." },
      { speaker: "B", ja: "最近、寒くなりましたね。", romaji: "Saikin, samuku narimashita ne.", en: "It's gotten cold recently, hasn't it?" },
    ],
  },
  {
    topic: "phone-call",
    level: "N4",
    lines: [
      { speaker: "A", ja: "もしもし、山田さんのお宅ですか？", romaji: "Moshimoshi, Yamada-san no otaku desu ka?", en: "Hello, is this the Yamada residence?" },
      { speaker: "B", ja: "はい、そうです。どちら様ですか？", romaji: "Hai, sou desu. Dochira-sama desu ka?", en: "Yes, it is. May I ask who's calling?" },
      { speaker: "A", ja: "田中と申します。ゆきさんはいらっしゃいますか？", romaji: "Tanaka to moushimasu. Yuki-san wa irasshaimasu ka?", en: "This is Tanaka. Is Yuki there?" },
      { speaker: "B", ja: "少々お待ちください。", romaji: "Shoushou omachi kudasai.", en: "Please wait a moment." },
    ],
  },
  {
    topic: "doctor",
    level: "N4",
    lines: [
      { speaker: "A", ja: "どうしましたか？", romaji: "Dou shimashita ka?", en: "What seems to be the problem?" },
      { speaker: "B", ja: "昨日から頭が痛くて、熱もあります。", romaji: "Kinou kara atama ga itakute, netsu mo arimasu.", en: "I've had a headache since yesterday, and I have a fever too." },
      { speaker: "A", ja: "薬を出しますので、食後に飲んでください。", romaji: "Kusuri o dashimasu node, shokugo ni nonde kudasai.", en: "I'll prescribe medicine, so please take it after meals." },
      { speaker: "B", ja: "はい、分かりました。お大事に、と言いますか？", romaji: "Hai, wakarimashita. Odaiji ni, to iimasu ka?", en: "Yes, understood. Do you say 'take care'?" },
      { speaker: "A", ja: "そうです。お大事に。", romaji: "Sou desu. Odaiji ni.", en: "That's right. Take care." },
    ],
  },
  {
    topic: "counting",
    level: "N5",
    lines: [
      { speaker: "T", ja: "物を数える時、「一つ、二つ、三つ」と言います。", romaji: "Mono o kazoeru toki, 'hitotsu, futatsu, mittsu' to iimasu.", en: "When counting objects we say 'hitotsu, futatsu, mittsu'." },
      { speaker: "T", ja: "「りんごを三つください。」", romaji: "'Ringo o mittsu kudasai.'", en: "'Three apples, please.'" },
      { speaker: "T", ja: "人を数える時は、「一人、二人、三人」です。", romaji: "Hito o kazoeru toki wa, 'hitori, futari, sannin' desu.", en: "When counting people, it's 'hitori, futari, sannin'." },
      { speaker: "T", ja: "もう一度、聞いてみましょう。", romaji: "Mou ichido, kiite mimashou.", en: "Let's listen once more." },
    ],
  },
  {
    topic: "apology-thanks",
    level: "N5",
    lines: [
      { speaker: "A", ja: "遅れてすみません。", romaji: "Okurete sumimasen.", en: "Sorry I'm late." },
      { speaker: "B", ja: "大丈夫ですよ。気にしないでください。", romaji: "Daijoubu desu yo. Ki ni shinaide kudasai.", en: "It's fine. Please don't worry about it." },
      { speaker: "A", ja: "手伝ってくれてありがとう。", romaji: "Tetsudatte kurete arigatou.", en: "Thanks for helping me." },
      { speaker: "B", ja: "どういたしまして。", romaji: "Dou itashimashite.", en: "You're welcome." },
    ],
  },
  {
    topic: "ordering-cafe",
    level: "N5",
    lines: [
      { speaker: "A", ja: "ご注文をどうぞ。", romaji: "Gochuumon o douzo.", en: "Your order, please." },
      { speaker: "B", ja: "アイスコーヒーをください。サイズはMで。", romaji: "Aisu koohii o kudasai. Saizu wa emu de.", en: "An iced coffee, please. Medium size." },
      { speaker: "A", ja: "店内でお召し上がりですか？", romaji: "Tennai de omeshiagari desu ka?", en: "Will you be eating in?" },
      { speaker: "B", ja: "持ち帰りでお願いします。", romaji: "Mochikaeri de onegaishimasu.", en: "Takeout, please." },
    ],
  },
  {
    topic: "grammar-kara-node",
    level: "N3",
    lines: [
      { speaker: "T", ja: "「から」と「ので」は、どちらも理由を表します。", romaji: "'Kara' to 'node' wa, dochira mo riyuu o arawashimasu.", en: "'Kara' and 'node' both express reasons." },
      { speaker: "T", ja: "「ので」の方が丁寧で、柔らかい印象になります。", romaji: "'Node' no hou ga teinei de, yawarakai inshou ni narimasu.", en: "'Node' is more polite and gives a softer impression." },
      { speaker: "T", ja: "「雨が降っているので、今日は家にいます。」", romaji: "'Ame ga futte iru node, kyou wa ie ni imasu.'", en: "'Because it's raining, I'm staying home today.'" },
      { speaker: "T", ja: "ビジネスの場面では「ので」をよく使います。", romaji: "Bijinesu no bamen de wa 'node' o yoku tsukaimasu.", en: "In business situations, 'node' is often used." },
    ],
  },
  {
    topic: "lost-item",
    level: "N4",
    lines: [
      { speaker: "A", ja: "すみません、財布を落としてしまいました。", romaji: "Sumimasen, saifu o otoshite shimaimashita.", en: "Excuse me, I've lost my wallet." },
      { speaker: "B", ja: "どんな財布ですか？", romaji: "Donna saifu desu ka?", en: "What kind of wallet is it?" },
      { speaker: "A", ja: "黒くて、小さい財布です。", romaji: "Kurokute, chiisai saifu desu.", en: "It's a small black wallet." },
      { speaker: "B", ja: "こちらに届いていますよ。", romaji: "Kochira ni todoite imasu yo.", en: "It's been turned in here." },
      { speaker: "A", ja: "よかった！本当にありがとうございます。", romaji: "Yokatta! Hontou ni arigatou gozaimasu.", en: "Thank goodness! Thank you so much." },
    ],
  },
];

export const FILLER_LINES: CorpusLine[] = [
  { speaker: "T", ja: "では、もう一度聞いてみましょう。", romaji: "Dewa, mou ichido kiite mimashou.", en: "Now, let's listen once more.", },
  { speaker: "T", ja: "ゆっくり言います。", romaji: "Yukkuri iimasu.", en: "I'll say it slowly." },
  { speaker: "T", ja: "リピートしてください。", romaji: "Ripiito shite kudasai.", en: "Please repeat." },
  { speaker: "T", ja: "次の会話を聞きましょう。", romaji: "Tsugi no kaiwa o kikimashou.", en: "Let's listen to the next conversation." },
  { speaker: "T", ja: "ポイントは、この表現です。", romaji: "Pointo wa, kono hyougen desu.", en: "The key point is this expression." },
  { speaker: "T", ja: "覚えておくと便利ですよ。", romaji: "Oboete oku to benri desu yo.", en: "It's handy to remember." },
];

export const INTRO_LINES: CorpusLine[] = [
  { speaker: "T", ja: "みなさん、こんにちは。今日も日本語を勉強しましょう。", romaji: "Minasan, konnichiwa. Kyou mo nihongo o benkyou shimashou.", en: "Hello everyone. Let's study Japanese again today." },
  { speaker: "T", ja: "今日のレッスンでは、日常会話でよく使う表現を練習します。", romaji: "Kyou no ressun de wa, nichijou kaiwa de yoku tsukau hyougen o renshuu shimasu.", en: "In today's lesson we'll practice expressions often used in daily conversation." },
];

export const OUTRO_LINES: CorpusLine[] = [
  { speaker: "T", ja: "今日はここまでです。お疲れ様でした。", romaji: "Kyou wa koko made desu. Otsukaresama deshita.", en: "That's all for today. Good work." },
  { speaker: "T", ja: "また次回のレッスンで会いましょう。", romaji: "Mata jikai no ressun de aimashou.", en: "See you in the next lesson." },
];

export const TOPIC_LABELS: Record<string, string> = {
  "train-station": "Travel Japanese",
  restaurant: "Daily Japanese",
  "convenience-store": "Daily Japanese",
  directions: "Travel Japanese",
  "self-introduction": "Natural Japanese Conversation",
  hotel: "Travel Japanese",
  shopping: "Daily Japanese",
  "grammar-te-form": "JLPT Grammar",
  "grammar-tai": "JLPT Grammar",
  "weather-smalltalk": "Natural Japanese Conversation",
  "phone-call": "Polite Japanese",
  doctor: "Practical Japanese",
  counting: "Vocabulary",
  "apology-thanks": "Daily Japanese",
  "ordering-cafe": "Daily Japanese",
  "grammar-kara-node": "JLPT Grammar",
  "lost-item": "Practical Japanese",
};
