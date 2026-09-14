export type Character = { glyph: string; name: string; category: string; keywords: string };
export const categories = [
  { id: "recent", label: "Recent", icon: "◷" },
  { id: "favorites", label: "Favorites", icon: "♡" },
  { id: "emoji", label: "Emoji", icon: "☺" },
  { id: "nature", label: "Nature", icon: "♧" },
  { id: "food", label: "Food & drink", icon: "♨" },
  { id: "activities", label: "Activities", icon: "⚽︎" },
  { id: "travel", label: "Travel", icon: "✈︎" },
  { id: "objects", label: "Objects", icon: "⌨︎" },
  { id: "arrows", label: "Arrows", icon: "→" },
  { id: "stars", label: "Bullets & stars", icon: "✳" },
  { id: "currency", label: "Currency", icon: "$" },
  { id: "latin", label: "Latin", icon: "Á" },
  { id: "math", label: "Mathematics", icon: "√" },
  { id: "punctuation", label: "Punctuation", icon: "“" },
  { id: "pictographs", label: "Pictographs", icon: "☀︎" },
];
const groups: Record<string, string> = {
  emoji: `😀|Grinning face|happy smile
😃|Grinning face with big eyes|happy smile
😄|Grinning face with smiling eyes|happy laugh
😁|Beaming face|happy grin
😆|Squinting face|laugh
🥹|Face holding back tears|grateful touched
😅|Grinning face with sweat|relief
😂|Face with tears of joy|laugh funny
🤣|Rolling on the floor laughing|funny
🥲|Smiling face with tear|bittersweet
☺️|Smiling face|happy
😊|Smiling face with smiling eyes|blush happy
😇|Smiling face with halo|angel
🙂|Slightly smiling face|happy
🙃|Upside-down face|ironic
😉|Winking face|wink
😌|Relieved face|calm
😍|Smiling face with heart eyes|love
🥰|Smiling face with hearts|love
😘|Face blowing a kiss|love
😋|Face savoring food|delicious
😜|Winking face with tongue|playful
🤨|Face with raised eyebrow|skeptical
😎|Smiling face with sunglasses|cool
🥳|Partying face|celebrate
😏|Smirking face|smug
😒|Unamused face|annoyed
😔|Pensive face|sad
😭|Loudly crying face|sad
😩|Weary face|tired
😳|Flushed face|surprised
😐|Neutral face|blank
😴|Sleeping face|tired
🤔|Thinking face|consider
🤯|Exploding head|amazed
🫶|Heart hands|love thanks
👍|Thumbs up|yes approval
👎|Thumbs down|no
👌|OK hand|okay
✌️|Victory hand|peace
👏|Clapping hands|applause
🙌|Raising hands|celebration
👋|Waving hand|hello goodbye
🤝|Handshake|agreement
🙏|Folded hands|thanks please
💪|Flexed biceps|strong
👀|Eyes|look
❤️|Red heart|love
💕|Two hearts|love
💜|Purple heart|love
💙|Blue heart|love
🖤|Black heart|love`,
  nature: `🐶|Dog face|puppy
🐱|Cat face|kitten
🐼|Panda|bear
🦊|Fox|animal
🐸|Frog|animal
🐝|Honeybee|bee
🦋|Butterfly|insect
🐢|Turtle|animal
🐙|Octopus|sea
🐳|Spouting whale|ocean
🌱|Seedling|plant grow
🌿|Herb|plant
🍀|Four leaf clover|luck
🌸|Cherry blossom|flower
🌻|Sunflower|flower
🌵|Cactus|plant
🌲|Evergreen tree|forest
🍂|Fallen leaf|autumn
☀️|Sun|weather
🌙|Crescent moon|night
🌈|Rainbow|weather
❄️|Snowflake|winter
🔥|Fire|hot
🌊|Water wave|ocean`,
  food: `🍎|Red apple|fruit
🍋|Lemon|fruit
🍊|Tangerine|orange fruit
🍓|Strawberry|fruit
🍒|Cherries|fruit
🍑|Peach|fruit
🥑|Avocado|fruit
🥦|Broccoli|vegetable
🥐|Croissant|breakfast
🥨|Pretzel|bread
🍞|Bread|toast
🧀|Cheese wedge|food
🍕|Pizza|food
🍔|Hamburger|food
🍟|French fries|food
🍣|Sushi|food
🍜|Steaming bowl|noodles
🍪|Cookie|sweet
🎂|Birthday cake|celebration
🍫|Chocolate bar|sweet
☕|Hot beverage|coffee tea
🍵|Teacup|tea
🥂|Clinking glasses|celebration
🧋|Bubble tea|drink`,
  activities: `⚽|Soccer ball|football
🏀|Basketball|sport
🎾|Tennis|sport
⚾|Baseball|sport
🏓|Ping pong|table tennis
🏸|Badminton|sport
🥏|Flying disc|frisbee
🎱|Pool eight ball|billiards
🏆|Trophy|award
🏅|Sports medal|award
🎯|Bullseye|target
🎨|Artist palette|paint
🎭|Performing arts|theater
🎬|Clapper board|movie
🎤|Microphone|sing
🎧|Headphone|music
🎹|Musical keyboard|piano
🎸|Guitar|music
🎲|Game die|dice
🧩|Puzzle piece|game
🎮|Video game|controller
🚴|Person biking|cycling
🏊|Person swimming|swim
🧘|Person in lotus position|meditate`,
  travel: `🚗|Automobile|car
🚕|Taxi|car
🚌|Bus|transit
🚲|Bicycle|bike
🚂|Locomotive|train
🚇|Metro|subway
✈️|Airplane|flight
🚀|Rocket|space
🛸|Flying saucer|space
⛵|Sailboat|sea
⚓|Anchor|sea
🏠|House|home
🏡|House with garden|home
🏙️|Cityscape|city
🏕️|Camping|tent
⛰️|Mountain|outdoors
🏝️|Desert island|beach
🌍|Globe showing Europe and Africa|world
🗺️|World map|travel
🧭|Compass|direction`,
  objects: `💡|Light bulb|idea
📌|Pushpin|pin
📎|Paperclip|attachment
✏️|Pencil|write
🖋️|Fountain pen|write
📓|Notebook|notes
📚|Books|read
📁|File folder|files
📅|Calendar|date
📝|Memo|notes
💻|Laptop|computer
⌨️|Keyboard|computer
📱|Mobile phone|device
📷|Camera|photo
🔍|Magnifying glass|search
🔑|Key|unlock
🔒|Locked|security
🛠️|Hammer and wrench|tools
⚙️|Gear|settings
🧪|Test tube|science
🧬|DNA|science
🔭|Telescope|space
🎁|Wrapped gift|present
🎈|Balloon|party`,
  arrows: `←|Leftwards arrow|left
↑|Upwards arrow|up
→|Rightwards arrow|right
↓|Downwards arrow|down
↔|Left right arrow|horizontal
↕|Up down arrow|vertical
↖|North west arrow|diagonal
↗|North east arrow|diagonal
↘|South east arrow|diagonal
↙|South west arrow|diagonal
↩|Leftwards arrow with hook|return
↪|Rightwards arrow with hook|return
↶|Anticlockwise top semicircle arrow|undo
↷|Clockwise top semicircle arrow|redo
⇐|Leftwards double arrow|left
⇒|Rightwards double arrow|implies
⇔|Left right double arrow|equivalent
⇧|Upwards white arrow|shift
⇥|Rightwards arrow to bar|tab
⏎|Return symbol|enter
➜|Heavy round-tipped rightwards arrow|right
➝|Triangle-headed rightwards arrow|right
⟶|Long rightwards arrow|right
⟷|Long left right arrow|horizontal`,
  stars: `•|Bullet|dot
◦|White bullet|dot
‣|Triangular bullet|list
⁃|Hyphen bullet|list
·|Middle dot|dot
★|Black star|favorite
☆|White star|favorite
✦|Black four pointed star|sparkle
✧|White four pointed star|sparkle
✶|Six pointed black star|sparkle
✳|Eight spoked asterisk|star
✴|Eight pointed black star|star
❋|Heavy eight teardrop spoked propeller asterisk|flower
✽|Heavy teardrop spoked asterisk|flower
✿|Black florette|flower
❀|White florette|flower
◆|Black diamond|shape
◇|White diamond|shape
●|Black circle|shape
○|White circle|shape
■|Black square|shape
□|White square|shape
▲|Black up-pointing triangle|shape
△|White up-pointing triangle|shape`,
  currency: `$|Dollar sign|usd
¢|Cent sign|money
£|Pound sign|gbp
¤|Currency sign|money
¥|Yen sign|jpy yuan
€|Euro sign|eur
₹|Indian rupee sign|inr
₩|Won sign|krw
₽|Ruble sign|rub
₺|Turkish lira sign|try
₫|Dong sign|vnd
₴|Hryvnia sign|uah
₿|Bitcoin sign|btc
฿|Thai baht sign|thb
₪|New sheqel sign|ils
₱|Peso sign|php`,
  latin: `À|Latin capital A with grave|accent
Á|Latin capital A with acute|accent
Â|Latin capital A with circumflex|accent
Ã|Latin capital A with tilde|accent
Ä|Latin capital A with diaeresis|umlaut
Å|Latin capital A with ring above|accent
Æ|Latin capital AE|ligature
Ç|Latin capital C with cedilla|accent
È|Latin capital E with grave|accent
É|Latin capital E with acute|accent
Ñ|Latin capital N with tilde|accent
Ö|Latin capital O with diaeresis|umlaut
Ø|Latin capital O with stroke|accent
Ü|Latin capital U with diaeresis|umlaut
ß|Latin small sharp S|eszett
à|Latin small A with grave|accent
á|Latin small A with acute|accent
ä|Latin small A with diaeresis|umlaut
æ|Latin small AE|ligature
ç|Latin small C with cedilla|accent
é|Latin small E with acute|accent
ñ|Latin small N with tilde|accent
ö|Latin small O with diaeresis|umlaut
ü|Latin small U with diaeresis|umlaut`,
  math: `±|Plus-minus sign|plus minus
×|Multiplication sign|times
÷|Division sign|divide
−|Minus sign|subtract
≠|Not equal to|inequality
≈|Almost equal to|approximately
≡|Identical to|equivalent
≤|Less-than or equal to|comparison
≥|Greater-than or equal to|comparison
∞|Infinity|unbounded
√|Square root|radical
∛|Cube root|radical
∑|N-ary summation|sum
∏|N-ary product|product
∫|Integral|calculus
∂|Partial differential|calculus
∆|Increment|delta
∇|Nabla|gradient
∈|Element of|set
∉|Not an element of|set
∅|Empty set|set
∪|Union|set
∩|Intersection|set
∀|For all|logic
∃|There exists|logic
¬|Not sign|logic
∧|Logical and|logic
∨|Logical or|logic
π|Greek small letter pi|pi
µ|Micro sign|micro`,
  punctuation: `“|Left double quotation mark|quote
”|Right double quotation mark|quote
‘|Left single quotation mark|quote
’|Right single quotation mark|apostrophe
«|Left double angle quotation mark|quote
»|Right double angle quotation mark|quote
‹|Single left angle quotation mark|quote
›|Single right angle quotation mark|quote
—|Em dash|dash
–|En dash|dash
…|Horizontal ellipsis|dots
¡|Inverted exclamation mark|punctuation
¿|Inverted question mark|punctuation
§|Section sign|section
¶|Pilcrow sign|paragraph
†|Dagger|footnote
‡|Double dagger|footnote
©|Copyright sign|copyright
®|Registered sign|trademark
™|Trade mark sign|trademark
（|Fullwidth left parenthesis|bracket
）|Fullwidth right parenthesis|bracket
【|Left black lenticular bracket|bracket
】|Right black lenticular bracket|bracket`,
  pictographs: `☀︎|Black sun with rays|sun weather
☼|White sun with rays|sun weather
☾|Last quarter moon|moon
☽|First quarter moon|moon
☁︎|Cloud|weather
☂︎|Umbrella|rain
☃︎|Snowman|snow
♠︎|Black spade suit|card
♣︎|Black club suit|card
♥︎|Black heart suit|card love
♦︎|Black diamond suit|card
♤|White spade suit|card
♧|White club suit|card
♡|White heart suit|card love
♢|White diamond suit|card
♚|Black chess king|chess
♛|Black chess queen|chess
♜|Black chess rook|chess
♝|Black chess bishop|chess
♞|Black chess knight|chess
♟︎|Black chess pawn|chess
♔|White chess king|chess
♕|White chess queen|chess
♖|White chess rook|chess
♗|White chess bishop|chess
♘|White chess knight|chess
♙|White chess pawn|chess
⚀|Die face one|dice
⚁|Die face two|dice
⚂|Die face three|dice
⚃|Die face four|dice
⚄|Die face five|dice
⚅|Die face six|dice
☕︎|Hot beverage text symbol|coffee
♫|Beamed eighth notes|music
♪|Eighth note|music
✎|Lower right pencil|write
✂︎|Scissors|cut
✉︎|Envelope|mail
☮︎|Peace symbol|peace
☯︎|Yin yang|balance
⌘|Place of interest sign|command
⌥|Option key|alt
⌫|Erase to the left|backspace
⌦|Erase to the right|delete
⏏︎|Eject symbol|eject
♈︎|Aries|zodiac
♉︎|Taurus|zodiac
♊︎|Gemini|zodiac
♋︎|Cancer|zodiac
♌︎|Leo|zodiac
♍︎|Virgo|zodiac`,
};
export const characters: Character[] = Object.entries(groups).flatMap(([category, text]) =>
  text.split("\n").map((line) => {
    const [glyph = "", name = "", keywords = ""] = line.split("|");
    return { glyph, name, category, keywords };
  }),
);
export const codePoints = (glyph: string): string =>
  Array.from(
    glyph,
    (character) => `U+${character.codePointAt(0)!.toString(16).toUpperCase().padStart(4, "0")}`,
  ).join(" ");
