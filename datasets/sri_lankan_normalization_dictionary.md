sri_lankan_normalization_dictionary.json

	
	intent_signals.json             → done ✅
		Batch 1: Anger & Apology Signals
			[
{
"id": "IS001",
"input": "kelissa",
"normalized": "angry",
"language": "Singlish",
"category": "emotion",
"confidence": "HIGH",
"implied_intent": "GIFT_APOLOGY",
"implied_flag": "APOLOGY",
"usage_example": "mage badu kelissa",
"aliases": ["kelissa","kelisa","kelissai","kelisi","kelissaa"],
"do_not_confuse_with": null
},
{
"id": "IS002",
"input": "taraha wela",
"normalized": "angry",
"language": "Singlish",
"category": "emotion",
"confidence": "HIGH",
"implied_intent": "GIFT_APOLOGY",
"implied_flag": "APOLOGY",
"usage_example": "nona taraha wela inne",
"aliases": ["taraha wela","tharaha wela","taraha","tharaha"],
"do_not_confuse_with": null
},
{
"id": "IS003",
"input": "upset",
"normalized": "upset",
"language": "English",
"category": "emotion",
"confidence": "HIGH",
"implied_intent": "GIFT_APOLOGY",
"implied_flag": "APOLOGY",
"usage_example": "girlfriend upset machan",
"aliases": ["upset","upsetti","upset wage"],
"do_not_confuse_with": null
},
{
"id": "IS004",
"input": "fight una",
"normalized": "had a fight",
"language": "Singlish",
"category": "emotion",
"confidence": "HIGH",
"implied_intent": "GIFT_APOLOGY",
"implied_flag": "APOLOGY",
"usage_example": "api fight una iye",
"aliases": ["fight una","fight wela","fight ekak una"],
"do_not_confuse_with": null
},
{
"id": "IS005",
"input": "sorry kiyanna one",
"normalized": "need to apologize",
"language": "Singlish",
"category": "emotion",
"confidence": "HIGH",
"implied_intent": "GIFT_APOLOGY",
"implied_flag": "APOLOGY",
"usage_example": "mata sorry kiyanna one",
"aliases": ["sorry kiyanna one","sorry kiyanna oni","sorry kiyanna one"],
"do_not_confuse_with": null
},
{
"id": "IS006",
"input": "shape karaganna one",
"normalized": "need to make up",
"language": "Singlish",
"category": "emotion",
"confidence": "HIGH",
"implied_intent": "GIFT_APOLOGY",
"implied_flag": "APOLOGY",
"usage_example": "eka shape karaganna one",
"aliases": ["shape karaganna one","shape karanna one","shape karamu"],
"do_not_confuse_with": null
},
{
"id": "IS007",
"input": "wife angry",
"normalized": "wife angry",
"language": "Mixed",
"category": "emotion",
"confidence": "HIGH",
"implied_intent": "GIFT_APOLOGY",
"implied_flag": "APOLOGY",
"usage_example": "wife angry machan",
"aliases": ["wife angry","wife upset","nona angry"],
"do_not_confuse_with": null
},
{
"id": "IS008",
"input": "girlfriend angry",
"normalized": "girlfriend angry",
"language": "Mixed",
"category": "emotion",
"confidence": "HIGH",
"implied_intent": "GIFT_APOLOGY",
"implied_flag": "APOLOGY",
"usage_example": "girlfriend angry bn",
"aliases": ["girlfriend angry","gf angry","girlfriend upset"],
"do_not_confuse_with": null
},
{
"id": "IS009",
"input": "kovama",
"normalized": "angry",
"language": "Tanglish",
"category": "emotion",
"confidence": "HIGH",
"implied_intent": "GIFT_APOLOGY",
"implied_flag": "APOLOGY",
"usage_example": "ava kovama irukka",
"aliases": ["kovama","kovam","kobam"],
"do_not_confuse_with": null
},
{
"id": "IS010",
"input": "mannichikkanum",
"normalized": "need forgiveness",
"language": "Tanglish",
"category": "emotion",
"confidence": "HIGH",
"implied_intent": "GIFT_APOLOGY",
"implied_flag": "APOLOGY",
"usage_example": "naan mannichikkanum sollanum",
"aliases": ["mannichikkanum","mannikanum","mannichikanum"],
"do_not_confuse_with": null
},
{
"id": "IS011",
"input": "கோபம்",
"normalized": "anger",
"language": "Tamil",
"category": "emotion",
"confidence": "HIGH",
"implied_intent": "GIFT_APOLOGY",
"implied_flag": "APOLOGY",
"usage_example": "avalukku கோபம் irukku",
"aliases": ["கோபம்"],
"do_not_confuse_with": null
},
{
"id": "IS012",
"input": "තරහයි",
"normalized": "angry",
"language": "Sinhala",
"category": "emotion",
"confidence": "HIGH",
"implied_intent": "GIFT_APOLOGY",
"implied_flag": "APOLOGY",
"usage_example": "eya tarahai",
"aliases": ["තරහයි","තරහායි"],
"do_not_confuse_with": null
}
]  -  (Add:

"weight": 0.95,
"trigger_strength": "STRONG"

Example:

{
  "input":"wife angry",
  "implied_intent":"GIFT_APOLOGY",
  "weight":0.99,
  "trigger_strength":"STRONG"
}

Because:

wife angry

should influence intent classification far more than:

upset

alone.)

Batch 2
URGENCY_SIGNALS.json

[
{
"id": "IS028",
"input": "heta",
"normalized": "tomorrow",
"language": "Singlish",
"category": "urgency",
"confidence": "HIGH",
"implied_intent": null,
"implied_flag": "URGENT",
"usage_example": "birthday eka heta",
"aliases": ["heta","hetai","heta ma"],
"do_not_confuse_with": null
},
{
"id": "IS029",
"input": "ada",
"normalized": "today",
"language": "Singlish",
"category": "urgency",
"confidence": "HIGH",
"implied_intent": null,
"implied_flag": "URGENT",
"usage_example": "ada delivery puluwanda",
"aliases": ["ada","adama","todayma"],
"do_not_confuse_with": null
},
{
"id": "IS030",
"input": "ikmanata",
"normalized": "quickly",
"language": "Singlish",
"category": "urgency",
"confidence": "HIGH",
"implied_intent": null,
"implied_flag": "URGENT",
"usage_example": "ikmanata one",
"aliases": ["ikmanata","ikmanin","ikmanata puluwanda"],
"do_not_confuse_with": null
},
{
"id": "IS031",
"input": "danma",
"normalized": "right now",
"language": "Singlish",
"category": "urgency",
"confidence": "HIGH",
"implied_intent": null,
"implied_flag": "URGENT",
"usage_example": "danma order karanna one",
"aliases": ["danma","dan","danma oni"],
"do_not_confuse_with": null
},
{
"id": "IS032",
"input": "adama",
"normalized": "today itself",
"language": "Singlish",
"category": "urgency",
"confidence": "HIGH",
"implied_intent": null,
"implied_flag": "URGENT",
"usage_example": "adama deliver karanna puluwanda",
"aliases": ["adama","ada ma","todayma"],
"do_not_confuse_with": null
},
{
"id": "IS033",
"input": "todayma",
"normalized": "today itself",
"language": "Mixed",
"category": "urgency",
"confidence": "HIGH",
"implied_intent": null,
"implied_flag": "URGENT",
"usage_example": "todayma one",
"aliases": ["todayma","today ma","today itself"],
"do_not_confuse_with": null
},
{
"id": "IS034",
"input": "tomorrowma",
"normalized": "tomorrow itself",
"language": "Mixed",
"category": "urgency",
"confidence": "HIGH",
"implied_intent": null,
"implied_flag": "URGENT",
"usage_example": "tomorrowma reach wenna one",
"aliases": ["tomorrowma","tomorrow ma"],
"do_not_confuse_with": null
},
{
"id": "IS035",
"input": "rathriyata kalin",
"normalized": "before tonight",
"language": "Singlish",
"category": "urgency",
"confidence": "HIGH",
"implied_intent": null,
"implied_flag": "URGENT",
"usage_example": "rathriyata kalin hamba wenna one",
"aliases": ["rathriyata kalin","night ekata kalin"],
"do_not_confuse_with": null
},
{
"id": "IS036",
"input": "before evening",
"normalized": "before evening",
"language": "English",
"category": "urgency",
"confidence": "HIGH",
"implied_intent": null,
"implied_flag": "URGENT",
"usage_example": "before evening deliver karanna",
"aliases": ["before evening","before tonight","before night"],
"do_not_confuse_with": null
},
{
"id": "IS037",
"input": "6ta kalin",
"normalized": "before 6 PM",
"language": "Singlish",
"category": "urgency",
"confidence": "HIGH",
"implied_intent": null,
"implied_flag": "URGENT",
"usage_example": "6ta kalin deliver wenna one",
"aliases": ["6ta kalin","6ta issella","6 pm kalin"],
"do_not_confuse_with": null
},
{
"id": "IS038",
"input": "naalaikku",
"normalized": "tomorrow",
"language": "Tanglish",
"category": "urgency",
"confidence": "HIGH",
"implied_intent": null,
"implied_flag": "URGENT",
"usage_example": "naalaikku birthday",
"aliases": ["naalaikku","nalikku","naaliku"],
"do_not_confuse_with": null
},
{
"id": "IS039",
"input": "seekiram",
"normalized": "quickly",
"language": "Tanglish",
"category": "urgency",
"confidence": "HIGH",
"implied_intent": null,
"implied_flag": "URGENT",
"usage_example": "seekiram venum",
"aliases": ["seekiram","sikiram","seekrama"],
"do_not_confuse_with": null
},
{
"id": "IS040",
"input": "indru",
"normalized": "today",
"language": "Tanglish",
"category": "urgency",
"confidence": "HIGH",
"implied_intent": null,
"implied_flag": "URGENT",
"usage_example": "indru delivery venum",
"aliases": ["indru","inniku","indaiku"],
"do_not_confuse_with": null
},
{
"id": "IS041",
"input": "நாளைக்கு",
"normalized": "tomorrow",
"language": "Tamil",
"category": "urgency",
"confidence": "HIGH",
"implied_intent": null,
"implied_flag": "URGENT",
"usage_example": "நாளைக்கு வேண்டும்",
"aliases": ["நாளைக்கு"],
"do_not_confuse_with": null
},
{
"id": "IS042",
"input": "சீக்கிரம்",
"normalized": "quickly",
"language": "Tamil",
"category": "urgency",
"confidence": "HIGH",
"implied_intent": null,
"implied_flag": "URGENT",
"usage_example": "சீக்கிரம் வேண்டும்",
"aliases": ["சீக்கிரம்"],
"do_not_confuse_with": null
},
{
"id": "IS043",
"input": "හෙට",
"normalized": "tomorrow",
"language": "Sinhala",
"category": "urgency",
"confidence": "HIGH",
"implied_intent": null,
"implied_flag": "URGENT",
"usage_example": "හෙට ඕනේ",
"aliases": ["හෙට"],
"do_not_confuse_with": null
},
{
"id": "IS044",
"input": "අද",
"normalized": "today",
"language": "Sinhala",
"category": "urgency",
"confidence": "HIGH",
"implied_intent": null,
"implied_flag": "URGENT",
"usage_example": "අදම ඕනේ",
"aliases": ["අද","අදම"],
"do_not_confuse_with": null
},
{
"id": "IS045",
"input": "ඉක්මනින්",
"normalized": "quickly",
"language": "Sinhala",
"category": "urgency",
"confidence": "HIGH",
"implied_intent": null,
"implied_flag": "URGENT",
"usage_example": "ඉක්මනින් එවන්න",
"aliases": ["ඉක්මනින්"],
"do_not_confuse_with": null
},
{
"id": "IS046",
"input": "birthday eka heta",
"normalized": "birthday tomorrow",
"language": "Mixed",
"category": "urgency",
"confidence": "HIGH",
"implied_intent": "GIFT_GENERAL",
"implied_flag": "URGENT",
"usage_example": "amma ge birthday eka heta",
"aliases": ["birthday eka heta","birthday heta"],
"do_not_confuse_with": null
},
{
"id": "IS047",
"input": "last minute",
"normalized": "last minute",
"language": "English",
"category": "urgency",
"confidence": "HIGH",
"implied_intent": null,
"implied_flag": "URGENT",
"usage_example": "last minute gift ekak one",
"aliases": ["last minute","very urgent","urgent"],
"do_not_confuse_with": null
}
]
(Important note before continuing

You're now building something more useful than a simple dictionary.

What you're actually creating is a rule-based pre-intent engine.

Example:

wife kelissa + heta birthday

Should produce:

{
  "intent": "GIFT_APOLOGY",
  "flags": [
    "APOLOGY",
    "URGENT"
  ]
}

before the LLM even runs.

That's exactly the type of preprocessing that will dramatically improve Kappy's understanding of Singlish, Tanglish, Sinhala, and Tamil inputs.


Batch 3
REORDER_SIGNALS.json

[
{
"id": "IS013",
"input": "ayeth",
"normalized": "again",
"language": "Singlish",
"category": "reorder",
"confidence": "HIGH",
"implied_intent": "REORDER",
"implied_flag": "REORDER",
"usage_example": "coffee eka ayeth one",
"aliases": ["ayeth","aayeth","aye"],
"do_not_confuse_with": null
},
{
"id": "IS014",
"input": "kalin",
"normalized": "previously",
"language": "Singlish",
"category": "reorder",
"confidence": "HIGH",
"implied_intent": "REORDER",
"implied_flag": "REORDER",
"usage_example": "kalin gatta eka one",
"aliases": ["kalin","kaling","kalinma"],
"do_not_confuse_with": null
},
{
"id": "IS015",
"input": "kalin gatta",
"normalized": "previously purchased",
"language": "Singlish",
"category": "reorder",
"confidence": "HIGH",
"implied_intent": "REORDER",
"implied_flag": "REORDER",
"usage_example": "kalin gatta coffee eka ayeth one",
"aliases": ["kalin gatta","kalin order kara","kalin gatta"],
"do_not_confuse_with": null
},
{
"id": "IS016",
"input": "same eka",
"normalized": "same item",
"language": "Singlish",
"category": "reorder",
"confidence": "HIGH",
"implied_intent": "REORDER",
"implied_flag": "REORDER",
"usage_example": "same eka ayeth denna",
"aliases": ["same eka","same item eka","same one"],
"do_not_confuse_with": null
},
{
"id": "IS017",
"input": "mathakada",
"normalized": "do you remember",
"language": "Singlish",
"category": "reorder",
"confidence": "MEDIUM",
"implied_intent": "REORDER",
"implied_flag": "REORDER",
"usage_example": "mathakada kalin gatta coffee eka",
"aliases": ["mathakada","mathakada bn","mathakada machan"],
"do_not_confuse_with": "general memory questions"
},
{
"id": "IS018",
"input": "usual eka",
"normalized": "usual item",
"language": "Singlish",
"category": "reorder",
"confidence": "HIGH",
"implied_intent": "REORDER",
"implied_flag": "REORDER",
"usage_example": "mage usual eka denna",
"aliases": ["usual eka","usual one","usual order"],
"do_not_confuse_with": null
},
{
"id": "IS019",
"input": "regular eka",
"normalized": "regular order",
"language": "Singlish",
"category": "reorder",
"confidence": "HIGH",
"implied_intent": "REORDER",
"implied_flag": "REORDER",
"usage_example": "regular eka ayeth one",
"aliases": ["regular eka","regular order","regular one"],
"do_not_confuse_with": null
},
{
"id": "IS020",
"input": "api gatta eka",
"normalized": "the item we bought",
"language": "Singlish",
"category": "reorder",
"confidence": "HIGH",
"implied_intent": "REORDER",
"implied_flag": "REORDER",
"usage_example": "api gatta eka ayeth denna",
"aliases": ["api gatta eka","api order kara eka"],
"do_not_confuse_with": null
},
{
"id": "IS021",
"input": "again order karanna",
"normalized": "order again",
"language": "Mixed",
"category": "reorder",
"confidence": "HIGH",
"implied_intent": "REORDER",
"implied_flag": "REORDER",
"usage_example": "meka again order karanna",
"aliases": ["again order karanna","order again","repeat order"],
"do_not_confuse_with": null
},
{
"id": "IS022",
"input": "munnadiye",
"normalized": "previously",
"language": "Tanglish",
"category": "reorder",
"confidence": "HIGH",
"implied_intent": "REORDER",
"implied_flag": "REORDER",
"usage_example": "munnadiye vangina adhe venum",
"aliases": ["munnadiye","munadiye","munnadi"],
"do_not_confuse_with": null
},
{
"id": "IS023",
"input": "marupadiyum",
"normalized": "again",
"language": "Tanglish",
"category": "reorder",
"confidence": "HIGH",
"implied_intent": "REORDER",
"implied_flag": "REORDER",
"usage_example": "marupadiyum adhe venum",
"aliases": ["marupadiyum","marubadiyum","marupadi"],
"do_not_confuse_with": null
},
{
"id": "IS024",
"input": "adhe venum",
"normalized": "want the same",
"language": "Tanglish",
"category": "reorder",
"confidence": "HIGH",
"implied_intent": "REORDER",
"implied_flag": "REORDER",
"usage_example": "munnadi vangina adhe venum",
"aliases": ["adhe venum","same venum","same maari"],
"do_not_confuse_with": null
},
{
"id": "IS025",
"input": "மறுபடியும்",
"normalized": "again",
"language": "Tamil",
"category": "reorder",
"confidence": "HIGH",
"implied_intent": "REORDER",
"implied_flag": "REORDER",
"usage_example": "மறுபடியும் அதே வேண்டும்",
"aliases": ["மறுபடியும்"],
"do_not_confuse_with": null
},
{
"id": "IS026",
"input": "ආයෙත්",
"normalized": "again",
"language": "Sinhala",
"category": "reorder",
"confidence": "HIGH",
"implied_intent": "REORDER",
"implied_flag": "REORDER",
"usage_example": "ආයෙත් ඒක ඕනේ",
"aliases": ["ආයෙත්","ආයෙමත්"],
"do_not_confuse_with": null
},
{
"id": "IS027",
"input": "coffee eka ayeth one",
"normalized": "want previous coffee again",
"language": "Singlish",
"category": "reorder",
"confidence": "HIGH",
"implied_intent": "REORDER",
"implied_flag": "REORDER",
"usage_example": "coffee eka ayeth one",
"aliases": ["coffee eka ayeth one","coffee ayeth one"],
"do_not_confuse_with": null
}
]
(Important improvement

Don't only detect reorder from keywords.

Create phrase triggers with stronger weights.

Examples you should definitely add later:

{
  "input":"api kalin gatta water bottle eka ayeth one",
  "weight":0.99,
  "implied_intent":"REORDER"
}
{
  "input":"same quantity",
  "weight":0.95,
  "implied_intent":"REORDER"
}
{
  "input":"last time gatta eka",
  "weight":0.98,
  "implied_intent":"REORDER"
}

Those phrase-level triggers will outperform isolated vocabulary entries.)

Batch 4
CONFIRMATION_SIGNALS.json
Target: 25 entries

[
{
"id": "IS048",
"input": "ow",
"normalized": "yes",
"language": "Singlish",
"category": "confirmation",
"confidence": "HIGH",
"implied_intent": "CHECKOUT_CONFIRM",
"implied_flag": "CONFIRM",
"usage_example": "ow meka hari",
"aliases": ["ow","oww","ow bn","ow machan"],
"do_not_confuse_with": null
},
{
"id": "IS049",
"input": "hari",
"normalized": "okay",
"language": "Singlish",
"category": "confirmation",
"confidence": "HIGH",
"implied_intent": "CHECKOUT_CONFIRM",
"implied_flag": "CONFIRM",
"usage_example": "hari meka gannam",
"aliases": ["hari","hari bn","hari machan"],
"do_not_confuse_with": "hariyata"
},
{
"id": "IS050",
"input": "hari hari",
"normalized": "okay proceed",
"language": "Singlish",
"category": "confirmation",
"confidence": "HIGH",
"implied_intent": "CHECKOUT_CONFIRM",
"implied_flag": "CONFIRM",
"usage_example": "hari hari order karamu",
"aliases": ["hari hari","hari hari bn"],
"do_not_confuse_with": null
},
{
"id": "IS051",
"input": "okey",
"normalized": "okay",
"language": "Mixed",
"category": "confirmation",
"confidence": "HIGH",
"implied_intent": "CHECKOUT_CONFIRM",
"implied_flag": "CONFIRM",
"usage_example": "okey meka hari",
"aliases": ["okey","okay","ok"],
"do_not_confuse_with": null
},
{
"id": "IS052",
"input": "done",
"normalized": "confirmed",
"language": "English",
"category": "confirmation",
"confidence": "HIGH",
"implied_intent": "CHECKOUT_CONFIRM",
"implied_flag": "CONFIRM",
"usage_example": "done machan",
"aliases": ["done","done bn","done machan"],
"do_not_confuse_with": null
},
{
"id": "IS053",
"input": "go ahead",
"normalized": "proceed",
"language": "English",
"category": "confirmation",
"confidence": "HIGH",
"implied_intent": "CHECKOUT_CONFIRM",
"implied_flag": "CONFIRM",
"usage_example": "go ahead with that",
"aliases": ["go ahead","proceed","continue"],
"do_not_confuse_with": null
},
{
"id": "IS054",
"input": "place it",
"normalized": "place order",
"language": "English",
"category": "confirmation",
"confidence": "HIGH",
"implied_intent": "CHECKOUT_CONFIRM",
"implied_flag": "CONFIRM",
"usage_example": "place it machan",
"aliases": ["place it","place order","submit it"],
"do_not_confuse_with": null
},
{
"id": "IS055",
"input": "confirm",
"normalized": "confirm",
"language": "English",
"category": "confirmation",
"confidence": "HIGH",
"implied_intent": "CHECKOUT_CONFIRM",
"implied_flag": "CONFIRM",
"usage_example": "confirm karanna",
"aliases": ["confirm","confirmed","confirm karanna"],
"do_not_confuse_with": null
},
{
"id": "IS056",
"input": "ow meka hari",
"normalized": "yes this is correct",
"language": "Mixed",
"category": "confirmation",
"confidence": "HIGH",
"implied_intent": "CHECKOUT_CONFIRM",
"implied_flag": "CONFIRM",
"usage_example": "ow meka hari",
"aliases": ["ow meka hari","ow hari"],
"do_not_confuse_with": null
},
{
"id": "IS057",
"input": "meka gannam",
"normalized": "i will take this",
"language": "Singlish",
"category": "confirmation",
"confidence": "HIGH",
"implied_intent": "CHECKOUT_CONFIRM",
"implied_flag": "CONFIRM",
"usage_example": "hari meka gannam",
"aliases": ["meka gannam","eka gannam"],
"do_not_confuse_with": null
},
{
"id": "IS058",
"input": "seri",
"normalized": "okay",
"language": "Tanglish",
"category": "confirmation",
"confidence": "HIGH",
"implied_intent": "CHECKOUT_CONFIRM",
"implied_flag": "CONFIRM",
"usage_example": "seri athu podhum",
"aliases": ["seri","sari","seri pa"],
"do_not_confuse_with": null
},
{
"id": "IS059",
"input": "aama",
"normalized": "yes",
"language": "Tanglish",
"category": "confirmation",
"confidence": "HIGH",
"implied_intent": "CHECKOUT_CONFIRM",
"implied_flag": "CONFIRM",
"usage_example": "aama venum",
"aliases": ["aama","ama","aamam"],
"do_not_confuse_with": null
},
{
"id": "IS060",
"input": "confirm pannunga",
"normalized": "please confirm",
"language": "Tanglish",
"category": "confirmation",
"confidence": "HIGH",
"implied_intent": "CHECKOUT_CONFIRM",
"implied_flag": "CONFIRM",
"usage_example": "confirm pannunga",
"aliases": ["confirm pannunga","confirm pannu","confirm pannalam"],
"do_not_confuse_with": null
},
{
"id": "IS061",
"input": "athu podhum",
"normalized": "that is enough",
"language": "Tanglish",
"category": "confirmation",
"confidence": "MEDIUM",
"implied_intent": "CHECKOUT_CONFIRM",
"implied_flag": "CONFIRM",
"usage_example": "seri athu podhum",
"aliases": ["athu podhum","podhum"],
"do_not_confuse_with": "quantity limitation"
},
{
"id": "IS062",
"input": "ஆமா",
"normalized": "yes",
"language": "Tamil",
"category": "confirmation",
"confidence": "HIGH",
"implied_intent": "CHECKOUT_CONFIRM",
"implied_flag": "CONFIRM",
"usage_example": "ஆமா வேண்டும்",
"aliases": ["ஆமா"],
"do_not_confuse_with": null
},
{
"id": "IS063",
"input": "சரி",
"normalized": "okay",
"language": "Tamil",
"category": "confirmation",
"confidence": "HIGH",
"implied_intent": "CHECKOUT_CONFIRM",
"implied_flag": "CONFIRM",
"usage_example": "சரி வாங்கலாம்",
"aliases": ["சரி"],
"do_not_confuse_with": null
},
{
"id": "IS064",
"input": "ஒத்துக்கிட்டேன்",
"normalized": "agreed",
"language": "Tamil",
"category": "confirmation",
"confidence": "HIGH",
"implied_intent": "CHECKOUT_CONFIRM",
"implied_flag": "CONFIRM",
"usage_example": "நான் ஒத்துக்கிட்டேன்",
"aliases": ["ஒத்துக்கிட்டேன்"],
"do_not_confuse_with": null
},
{
"id": "IS065",
"input": "ඔව්",
"normalized": "yes",
"language": "Sinhala",
"category": "confirmation",
"confidence": "HIGH",
"implied_intent": "CHECKOUT_CONFIRM",
"implied_flag": "CONFIRM",
"usage_example": "ඔව් ඒක හරි",
"aliases": ["ඔව්"],
"do_not_confuse_with": null
},
{
"id": "IS066",
"input": "හරි",
"normalized": "okay",
"language": "Sinhala",
"category": "confirmation",
"confidence": "HIGH",
"implied_intent": "CHECKOUT_CONFIRM",
"implied_flag": "CONFIRM",
"usage_example": "හරි ඒක ගන්නම්",
"aliases": ["හරි"],
"do_not_confuse_with": null
},
{
"id": "IS067",
"input": "කරන්න",
"normalized": "do it",
"language": "Sinhala",
"category": "confirmation",
"confidence": "HIGH",
"implied_intent": "CHECKOUT_CONFIRM",
"implied_flag": "CONFIRM",
"usage_example": "හරි කරන්න",
"aliases": ["කරන්න","එවන්න","දාන්න"],
"do_not_confuse_with": null
},
{
"id": "IS068",
"input": "yes do it",
"normalized": "confirm purchase",
"language": "English",
"category": "confirmation",
"confidence": "HIGH",
"implied_intent": "CHECKOUT_CONFIRM",
"implied_flag": "CONFIRM",
"usage_example": "yes do it",
"aliases": ["yes do it","yes proceed","yes place it"],
"do_not_confuse_with": null
}
]
(Important refinement

For checkout signals, I would actually assign a checkout confidence score.

Example:

{
  "input":"place it",
  "checkout_strength":0.99
}

vs

{
  "input":"hari",
  "checkout_strength":0.55
}

Because:

hari

can simply mean:

understood
okay
continue conversation

while:

place it

almost certainly means:

CREATE_ORDER

So don't treat all confirmation signals equally.)

Batch 5
CANCELLATION_SIGNALS.json
Target: 20 entries

[
{
"id": "IS069",
"input": "ne",
"normalized": "no",
"language": "Singlish",
"category": "cancellation",
"confidence": "MEDIUM",
"implied_intent": "CANCELLATION",
"implied_flag": "CANCEL",
"usage_example": "ne machan meka epa",
"aliases": ["ne","nee","nae"],
"do_not_confuse_with": "sentence-ending 'ne' used as emphasis"
},
{
"id": "IS070",
"input": "nehe",
"normalized": "no",
"language": "Singlish",
"category": "cancellation",
"confidence": "HIGH",
"implied_intent": "CANCELLATION",
"implied_flag": "CANCEL",
"usage_example": "eka nehe",
"aliases": ["nehe","nahe","naehe"],
"do_not_confuse_with": null
},
{
"id": "IS071",
"input": "epa",
"normalized": "don't want",
"language": "Singlish",
"category": "cancellation",
"confidence": "HIGH",
"implied_intent": "CANCELLATION",
"implied_flag": "CANCEL",
"usage_example": "flowers epa",
"aliases": ["epa","epa bn","ehenam epa"],
"do_not_confuse_with": null
},
{
"id": "IS072",
"input": "awashya ne",
"normalized": "not needed",
"language": "Singlish",
"category": "cancellation",
"confidence": "HIGH",
"implied_intent": "CANCELLATION",
"implied_flag": "CANCEL",
"usage_example": "meka awashya ne",
"aliases": ["awashya ne","awashya nehe","one ne"],
"do_not_confuse_with": null
},
{
"id": "IS073",
"input": "cancel",
"normalized": "cancel",
"language": "English",
"category": "cancellation",
"confidence": "HIGH",
"implied_intent": "CANCELLATION",
"implied_flag": "CANCEL",
"usage_example": "order eka cancel karanna",
"aliases": ["cancel","cancel karanna","cancel kara"],
"do_not_confuse_with": null
},
{
"id": "IS074",
"input": "cancel karanna",
"normalized": "cancel order",
"language": "Mixed",
"category": "cancellation",
"confidence": "HIGH",
"implied_intent": "CANCELLATION",
"implied_flag": "CANCEL",
"usage_example": "eka cancel karanna",
"aliases": ["cancel karanna","cancel karamu","cancel kara"],
"do_not_confuse_with": null
},
{
"id": "IS075",
"input": "anik eka balamu",
"normalized": "let's see another one",
"language": "Singlish",
"category": "cancellation",
"confidence": "MEDIUM",
"implied_intent": "CANCELLATION",
"implied_flag": "CANCEL",
"usage_example": "anik eka balamu machan",
"aliases": ["anik eka","anik eka balamu","wena eka"],
"do_not_confuse_with": "comparison intent"
},
{
"id": "IS076",
"input": "meka hari ne",
"normalized": "this isn't right",
"language": "Mixed",
"category": "cancellation",
"confidence": "MEDIUM",
"implied_intent": "CANCELLATION",
"implied_flag": "CANCEL",
"usage_example": "meka hari ne",
"aliases": ["hari ne","meka hari ne"],
"do_not_confuse_with": "feedback rather than cancellation"
},
{
"id": "IS077",
"input": "venda",
"normalized": "don't want",
"language": "Tanglish",
"category": "cancellation",
"confidence": "HIGH",
"implied_intent": "CANCELLATION",
"implied_flag": "CANCEL",
"usage_example": "athu venda",
"aliases": ["venda","vendam","venam"],
"do_not_confuse_with": null
},
{
"id": "IS078",
"input": "illai",
"normalized": "no",
"language": "Tanglish",
"category": "cancellation",
"confidence": "HIGH",
"implied_intent": "CANCELLATION",
"implied_flag": "CANCEL",
"usage_example": "illai venam",
"aliases": ["illai","illa","ille"],
"do_not_confuse_with": null
},
{
"id": "IS079",
"input": "cancel pannunga",
"normalized": "please cancel",
"language": "Tanglish",
"category": "cancellation",
"confidence": "HIGH",
"implied_intent": "CANCELLATION",
"implied_flag": "CANCEL",
"usage_example": "order cancel pannunga",
"aliases": ["cancel pannunga","cancel pannu","cancel pannalam"],
"do_not_confuse_with": null
},
{
"id": "IS080",
"input": "வேண்டாம்",
"normalized": "don't want",
"language": "Tamil",
"category": "cancellation",
"confidence": "HIGH",
"implied_intent": "CANCELLATION",
"implied_flag": "CANCEL",
"usage_example": "அது வேண்டாம்",
"aliases": ["வேண்டாம்"],
"do_not_confuse_with": null
},
{
"id": "IS081",
"input": "இல்லை",
"normalized": "no",
"language": "Tamil",
"category": "cancellation",
"confidence": "HIGH",
"implied_intent": "CANCELLATION",
"implied_flag": "CANCEL",
"usage_example": "இல்லை நன்றி",
"aliases": ["இல்லை"],
"do_not_confuse_with": null
},
{
"id": "IS082",
"input": "නෑ",
"normalized": "no",
"language": "Sinhala",
"category": "cancellation",
"confidence": "HIGH",
"implied_intent": "CANCELLATION",
"implied_flag": "CANCEL",
"usage_example": "නෑ එපා",
"aliases": ["නෑ"],
"do_not_confuse_with": null
},
{
"id": "IS083",
"input": "නැහැ",
"normalized": "no",
"language": "Sinhala",
"category": "cancellation",
"confidence": "HIGH",
"implied_intent": "CANCELLATION",
"implied_flag": "CANCEL",
"usage_example": "එක නැහැ",
"aliases": ["නැහැ"],
"do_not_confuse_with": null
},
{
"id": "IS084",
"input": "අවශ්‍ය නෑ",
"normalized": "not required",
"language": "Sinhala",
"category": "cancellation",
"confidence": "HIGH",
"implied_intent": "CANCELLATION",
"implied_flag": "CANCEL",
"usage_example": "දැන් අවශ්‍ය නෑ",
"aliases": ["අවශ්‍ය නෑ"],
"do_not_confuse_with": null
},
{
"id": "IS085",
"input": "never mind",
"normalized": "forget it",
"language": "English",
"category": "cancellation",
"confidence": "HIGH",
"implied_intent": "CANCELLATION",
"implied_flag": "CANCEL",
"usage_example": "never mind machan",
"aliases": ["never mind","nvm"],
"do_not_confuse_with": null
},
{
"id": "IS086",
"input": "forget it",
"normalized": "cancel request",
"language": "English",
"category": "cancellation",
"confidence": "HIGH",
"implied_intent": "CANCELLATION",
"implied_flag": "CANCEL",
"usage_example": "forget it",
"aliases": ["forget it","leave it"],
"do_not_confuse_with": null
},
{
"id": "IS087",
"input": "stop",
"normalized": "stop process",
"language": "English",
"category": "cancellation",
"confidence": "HIGH",
"implied_intent": "CANCELLATION",
"implied_flag": "CANCEL",
"usage_example": "stop stop",
"aliases": ["stop","stop it","hold it"],
"do_not_confuse_with": "pause conversation"
},
{
"id": "IS088",
"input": "cancel that",
"normalized": "cancel current selection",
"language": "English",
"category": "cancellation",
"confidence": "HIGH",
"implied_intent": "CANCELLATION",
"implied_flag": "CANCEL",
"usage_example": "cancel that and show another",
"aliases": ["cancel that","cancel this","remove it"],
"do_not_confuse_with": "cart item removal"
}
]
(Very important observation

Do not automatically kill the shopping flow when you see a cancellation signal.

Example:

User: flowers epa

This does not mean:

{
  "intent":"CANCELLATION"
}

It may mean:

{
  "intent":"PRODUCT_REJECTION",
  "continue_shopping":true
}

Big difference.

You should eventually separate:

ORDER_CANCELLATION

from

PRODUCT_REJECTION

because:

"cancel order eka" → stop everything
"flowers epa" → keep helping, suggest alternatives

That's one of the easiest places an intent engine can make expensive mistakes.)



Batch 6
QUANTITY_SIGNALS.json
Target: 15 entries

Important correction

Some of the earlier examples you proposed like:

tharum
kopiya
hariyata

are weak or incorrect reorder/apology signals.

The strongest real-world reorder triggers for Kappy are actually:

ayeth
kalin gatta
same eka
usual eka
regular eka
iwara wenawa
stock ne
mudinjidhu
last packet
coffee iwara wenawa

These are the phrases you'll repeatedly see in actual Sri Lankan shopping conversations.

Batch 7
RUNNING_OUT_SIGNALS.json
Target: 20 entries

[
{
"id": "IS109",
"input": "iwara wenawa",
"normalized": "running out",
"language": "Singlish",
"category": "running_out",
"confidence": "HIGH",
"implied_intent": "REORDER",
"implied_flag": "REORDER",
"usage_example": "coffee eka iwara wenawa",
"aliases": ["iwara wenawa","ivarai wenawa","iwarai"],
"do_not_confuse_with": null
},
{
"id": "IS110",
"input": "iwarai",
"normalized": "almost finished",
"language": "Singlish",
"category": "running_out",
"confidence": "HIGH",
"implied_intent": "REORDER",
"implied_flag": "REORDER",
"usage_example": "watura bottle eka iwarai",
"aliases": ["iwarai","iwarai bn"],
"do_not_confuse_with": null
},
{
"id": "IS111",
"input": "stock ne",
"normalized": "out of stock at home",
"language": "Singlish",
"category": "running_out",
"confidence": "HIGH",
"implied_intent": "REORDER",
"implied_flag": "REORDER",
"usage_example": "mage coffee stock ne",
"aliases": ["stock ne","stock nehe","stock na"],
"do_not_confuse_with": "store inventory availability"
},
{
"id": "IS112",
"input": "packet finish",
"normalized": "packet finished",
"language": "Mixed",
"category": "running_out",
"confidence": "HIGH",
"implied_intent": "REORDER",
"implied_flag": "REORDER",
"usage_example": "tea packet finish",
"aliases": ["packet finish","packet finished"],
"do_not_confuse_with": null
},
{
"id": "IS113",
"input": "bottle empty",
"normalized": "bottle empty",
"language": "English",
"category": "running_out",
"confidence": "HIGH",
"implied_intent": "REORDER",
"implied_flag": "REORDER",
"usage_example": "water bottle empty",
"aliases": ["bottle empty","empty bottle"],
"do_not_confuse_with": null
},
{
"id": "IS114",
"input": "gas iwara wenawa",
"normalized": "gas running out",
"language": "Mixed",
"category": "running_out",
"confidence": "HIGH",
"implied_intent": "REORDER",
"implied_flag": "REORDER",
"usage_example": "gas iwara wenawa bn",
"aliases": ["gas iwara wenawa","gas iwarai"],
"do_not_confuse_with": null
},
{
"id": "IS115",
"input": "coffee iwara wenawa",
"normalized": "coffee running out",
"language": "Mixed",
"category": "running_out",
"confidence": "HIGH",
"implied_intent": "REORDER",
"implied_flag": "REORDER",
"usage_example": "coffee iwara wenawa",
"aliases": ["coffee iwara wenawa","coffee iwarai"],
"do_not_confuse_with": null
},
{
"id": "IS116",
"input": "last packet",
"normalized": "using final packet",
"language": "English",
"category": "running_out",
"confidence": "HIGH",
"implied_intent": "REORDER",
"implied_flag": "REORDER",
"usage_example": "this is my last packet",
"aliases": ["last packet","final packet"],
"do_not_confuse_with": null
},
{
"id": "IS117",
"input": "almost finish",
"normalized": "almost finished",
"language": "English",
"category": "running_out",
"confidence": "HIGH",
"implied_intent": "REORDER",
"implied_flag": "REORDER",
"usage_example": "coffee almost finish",
"aliases": ["almost finish","almost finished"],
"do_not_confuse_with": null
},
{
"id": "IS118",
"input": "no more left",
"normalized": "none remaining",
"language": "English",
"category": "running_out",
"confidence": "HIGH",
"implied_intent": "REORDER",
"implied_flag": "REORDER",
"usage_example": "no more left at home",
"aliases": ["no more left","nothing left"],
"do_not_confuse_with": null
},
{
"id": "IS119",
"input": "mudiyudhu",
"normalized": "finished",
"language": "Tanglish",
"category": "running_out",
"confidence": "HIGH",
"implied_intent": "REORDER",
"implied_flag": "REORDER",
"usage_example": "coffee mudiyudhu",
"aliases": ["mudiyudhu","mudinjidhu","mudinjudhu"],
"do_not_confuse_with": null
},
{
"id": "IS120",
"input": "mudinjidhu",
"normalized": "used up",
"language": "Tanglish",
"category": "running_out",
"confidence": "HIGH",
"implied_intent": "REORDER",
"implied_flag": "REORDER",
"usage_example": "tea powder mudinjidhu",
"aliases": ["mudinjidhu","mudinju pochu"],
"do_not_confuse_with": null
},
{
"id": "IS121",
"input": "stock illa",
"normalized": "no stock at home",
"language": "Tanglish",
"category": "running_out",
"confidence": "HIGH",
"implied_intent": "REORDER",
"implied_flag": "REORDER",
"usage_example": "veetla stock illa",
"aliases": ["stock illa","stock illai"],
"do_not_confuse_with": "merchant stock availability"
},
{
"id": "IS122",
"input": "veetla illa",
"normalized": "don't have any at home",
"language": "Tanglish",
"category": "running_out",
"confidence": "MEDIUM",
"implied_intent": "REORDER",
"implied_flag": "REORDER",
"usage_example": "coffee veetla illa",
"aliases": ["veetla illa","veetule illa"],
"do_not_confuse_with": null
},
{
"id": "IS123",
"input": "முடிஞ்சிடுச்சு",
"normalized": "finished",
"language": "Tamil",
"category": "running_out",
"confidence": "HIGH",
"implied_intent": "REORDER",
"implied_flag": "REORDER",
"usage_example": "காபி முடிஞ்சிடுச்சு",
"aliases": ["முடிஞ்சிடுச்சு"],
"do_not_confuse_with": null
},
{
"id": "IS124",
"input": "இல்லை",
"normalized": "none left",
"language": "Tamil",
"category": "running_out",
"confidence": "MEDIUM",
"implied_intent": "REORDER",
"implied_flag": "REORDER",
"usage_example": "வீட்டில் இல்லை",
"aliases": ["இல்லை"],
"do_not_confuse_with": "general rejection/cancellation"
},
{
"id": "IS125",
"input": "ඉවර වෙනවා",
"normalized": "running out",
"language": "Sinhala",
"category": "running_out",
"confidence": "HIGH",
"implied_intent": "REORDER",
"implied_flag": "REORDER",
"usage_example": "කෝපි ඉවර වෙනවා",
"aliases": ["ඉවර වෙනවා"],
"do_not_confuse_with": null
},
{
"id": "IS126",
"input": "ඉවරයි",
"normalized": "finished",
"language": "Sinhala",
"category": "running_out",
"confidence": "HIGH",
"implied_intent": "REORDER",
"implied_flag": "REORDER",
"usage_example": "සීනි ඉවරයි",
"aliases": ["ඉවරයි"],
"do_not_confuse_with": null
},
{
"id": "IS127",
"input": "ගෙදර නෑ",
"normalized": "none at home",
"language": "Sinhala",
"category": "running_out",
"confidence": "MEDIUM",
"implied_intent": "REORDER",
"implied_flag": "REORDER",
"usage_example": "වතුර ගෙදර නෑ",
"aliases": ["ගෙදර නෑ"],
"do_not_confuse_with": "delivery location discussions"
},
{
"id": "IS128",
"input": "last one left",
"normalized": "only one remaining",
"language": "English",
"category": "running_out",
"confidence": "HIGH",
"implied_intent": "REORDER",
"implied_flag": "REORDER",
"usage_example": "last one left at home",
"aliases": ["last one left","only one left"],
"do_not_confuse_with": null
}
]


Batch 8
GIFT_SIGNALS.json
Target: 20 entries

[
{
"id": "IS089",
"input": "gift ekak",
"normalized": "gift",
"language": "Singlish",
"category": "gift",
"confidence": "HIGH",
"implied_intent": "GIFT_GENERAL",
"implied_flag": null,
"usage_example": "amma ta gift ekak one",
"aliases": ["gift ekak","gift eka","gif ekak"],
"do_not_confuse_with": null
},
{
"id": "IS090",
"input": "denna one",
"normalized": "want to give",
"language": "Singlish",
"category": "gift",
"confidence": "HIGH",
"implied_intent": "GIFT_GENERAL",
"implied_flag": null,
"usage_example": "yaluwekta denna one",
"aliases": ["denna one","denna oni","dunna one"],
"do_not_confuse_with": "general delivery requests"
},
{
"id": "IS091",
"input": "thagiyak",
"normalized": "gift",
"language": "Singlish",
"category": "gift",
"confidence": "HIGH",
"implied_intent": "GIFT_GENERAL",
"implied_flag": null,
"usage_example": "thagiyak hoyanawa",
"aliases": ["thagiyak","thagiyak","thagi ekak"],
"do_not_confuse_with": null
},
{
"id": "IS092",
"input": "present ekak",
"normalized": "present",
"language": "Singlish",
"category": "gift",
"confidence": "HIGH",
"implied_intent": "GIFT_GENERAL",
"implied_flag": null,
"usage_example": "present ekak one",
"aliases": ["present ekak","present eka","present"],
"do_not_confuse_with": null
},
{
"id": "IS093",
"input": "surprise karanna",
"normalized": "surprise someone",
"language": "Singlish",
"category": "gift",
"confidence": "HIGH",
"implied_intent": "GIFT_GENERAL",
"implied_flag": null,
"usage_example": "nangiwa surprise karanna one",
"aliases": ["surprise karanna","surprise ekak","surprise karamu"],
"do_not_confuse_with": null
},
{
"id": "IS094",
"input": "amma ta",
"normalized": "for mother",
"language": "Singlish",
"category": "gift",
"confidence": "HIGH",
"implied_intent": "GIFT_GENERAL",
"implied_flag": null,
"usage_example": "amma ta monawahari one",
"aliases": ["amma ta","amma ge","mother ta"],
"do_not_confuse_with": null
},
{
"id": "IS095",
"input": "yaluwekta",
"normalized": "for a friend",
"language": "Singlish",
"category": "gift",
"confidence": "MEDIUM",
"implied_intent": "GIFT_GENERAL",
"implied_flag": null,
"usage_example": "yaluwekta denna one",
"aliases": ["yaluwekta","yaluwata","friend ta"],
"do_not_confuse_with": null
},
{
"id": "IS096",
"input": "office eke kenekta",
"normalized": "for colleague",
"language": "Singlish",
"category": "gift",
"confidence": "HIGH",
"implied_intent": "GIFT_GENERAL",
"implied_flag": null,
"usage_example": "office eke kenekta gift ekak one",
"aliases": ["office eke kenekta","colleague ta"],
"do_not_confuse_with": null
},
{
"id": "IS097",
"input": "gift venum",
"normalized": "need a gift",
"language": "Tanglish",
"category": "gift",
"confidence": "HIGH",
"implied_intent": "GIFT_GENERAL",
"implied_flag": null,
"usage_example": "appa ku gift venum",
"aliases": ["gift venum","gif venum"],
"do_not_confuse_with": null
},
{
"id": "IS098",
"input": "parisu venum",
"normalized": "need a present",
"language": "Tanglish",
"category": "gift",
"confidence": "HIGH",
"implied_intent": "GIFT_GENERAL",
"implied_flag": null,
"usage_example": "parisu venum",
"aliases": ["parisu venum","parisu"],
"do_not_confuse_with": null
},
{
"id": "IS099",
"input": "surprise panna",
"normalized": "want to surprise",
"language": "Tanglish",
"category": "gift",
"confidence": "HIGH",
"implied_intent": "GIFT_GENERAL",
"implied_flag": null,
"usage_example": "amma va surprise panna",
"aliases": ["surprise panna","surprise pannanum"],
"do_not_confuse_with": null
},
{
"id": "IS100",
"input": "appa ku",
"normalized": "for father",
"language": "Tanglish",
"category": "gift",
"confidence": "HIGH",
"implied_intent": "GIFT_GENERAL",
"implied_flag": null,
"usage_example": "appa ku gift venum",
"aliases": ["appa ku","appa kku","appa-ku"],
"do_not_confuse_with": null
},
{
"id": "IS101",
"input": "பரிசு வேண்டும்",
"normalized": "need a gift",
"language": "Tamil",
"category": "gift",
"confidence": "HIGH",
"implied_intent": "GIFT_GENERAL",
"implied_flag": null,
"usage_example": "அம்மாவுக்கு பரிசு வேண்டும்",
"aliases": ["பரிசு வேண்டும்"],
"do_not_confuse_with": null
},
{
"id": "IS102",
"input": "கிஃப்ட்",
"normalized": "gift",
"language": "Tamil",
"category": "gift",
"confidence": "HIGH",
"implied_intent": "GIFT_GENERAL",
"implied_flag": null,
"usage_example": "கிஃப்ட் வாங்க வேண்டும்",
"aliases": ["கிஃப்ட்"],
"do_not_confuse_with": null
},
{
"id": "IS103",
"input": "தர வேண்டும்",
"normalized": "want to give",
"language": "Tamil",
"category": "gift",
"confidence": "MEDIUM",
"implied_intent": "GIFT_GENERAL",
"implied_flag": null,
"usage_example": "நண்பருக்கு தர வேண்டும்",
"aliases": ["தர வேண்டும்"],
"do_not_confuse_with": "general giving"
},
{
"id": "IS104",
"input": "තෑගි",
"normalized": "gift",
"language": "Sinhala",
"category": "gift",
"confidence": "HIGH",
"implied_intent": "GIFT_GENERAL",
"implied_flag": null,
"usage_example": "තෑගි එකක් ඕනේ",
"aliases": ["තෑගි","තෑග්ග"],
"do_not_confuse_with": null
},
{
"id": "IS105",
"input": "තෑගි එකක් ඕනේ",
"normalized": "need a gift",
"language": "Sinhala",
"category": "gift",
"confidence": "HIGH",
"implied_intent": "GIFT_GENERAL",
"implied_flag": null,
"usage_example": "අම්මාට තෑගි එකක් ඕනේ",
"aliases": ["තෑගි එකක් ඕනේ"],
"do_not_confuse_with": null
},
{
"id": "IS106",
"input": "දෙන්න ඕනේ",
"normalized": "want to give",
"language": "Sinhala",
"category": "gift",
"confidence": "HIGH",
"implied_intent": "GIFT_GENERAL",
"implied_flag": null,
"usage_example": "යාළුවෙකුට දෙන්න ඕනේ",
"aliases": ["දෙන්න ඕනේ"],
"do_not_confuse_with": null
},
{
"id": "IS107",
"input": "for my mom",
"normalized": "gift recipient mother",
"language": "English",
"category": "gift",
"confidence": "HIGH",
"implied_intent": "GIFT_GENERAL",
"implied_flag": null,
"usage_example": "need something for my mom",
"aliases": ["for my mom","for mother","for amma"],
"do_not_confuse_with": null
},
{
"id": "IS108",
"input": "for someone",
"normalized": "buying for another person",
"language": "English",
"category": "gift",
"confidence": "MEDIUM",
"implied_intent": "GIFT_GENERAL",
"implied_flag": null,
"usage_example": "buying for someone special",
"aliases": ["for someone","for another person"],
"do_not_confuse_with": "self purchase"
}
]


	relationship_vocabulary.json    → use prompt

[
{
"id": "IS144",
"input": "amma ta",
"normalized": "for mother",
"language": "Singlish",
"category": "relationship",
"confidence": "HIGH",
"implied_intent": "RECIPIENT_MOTHER",
"implied_flag": null,
"usage_example": "amma ta gift ekak one",
"aliases": ["amma ta","ammata","amma ge"],
"do_not_confuse_with": null
},
{
"id": "IS145",
"input": "appachchi ta",
"normalized": "for father",
"language": "Singlish",
"category": "relationship",
"confidence": "HIGH",
"implied_intent": "RECIPIENT_FATHER",
"implied_flag": null,
"usage_example": "appachchi ta monawahari one",
"aliases": ["appachchi ta","appachi ta","thaththa ta"],
"do_not_confuse_with": null
},
{
"id": "IS146",
"input": "nangi ta",
"normalized": "for younger sister",
"language": "Singlish",
"category": "relationship",
"confidence": "HIGH",
"implied_intent": "RECIPIENT_YOUNGER_SISTER",
"implied_flag": null,
"usage_example": "nangi ta birthday gift ekak one",
"aliases": ["nangi ta","nangita"],
"do_not_confuse_with": null
},
{
"id": "IS147",
"input": "malli ta",
"normalized": "for younger brother",
"language": "Singlish",
"category": "relationship",
"confidence": "HIGH",
"implied_intent": "RECIPIENT_YOUNGER_BROTHER",
"implied_flag": null,
"usage_example": "malli ta gift ekak one",
"aliases": ["malli ta","mallita"],
"do_not_confuse_with": null
},
{
"id": "IS148",
"input": "akka ta",
"normalized": "for older sister",
"language": "Singlish",
"category": "relationship",
"confidence": "HIGH",
"implied_intent": "RECIPIENT_OLDER_SISTER",
"implied_flag": null,
"usage_example": "akka ta surprise ekak one",
"aliases": ["akka ta","akkata"],
"do_not_confuse_with": null
},
{
"id": "IS149",
"input": "aiya ta",
"normalized": "for older brother",
"language": "Singlish",
"category": "relationship",
"confidence": "HIGH",
"implied_intent": "RECIPIENT_OLDER_BROTHER",
"implied_flag": null,
"usage_example": "aiya ta gift ekak one",
"aliases": ["aiya ta","aiyata"],
"do_not_confuse_with": null
},
{
"id": "IS150",
"input": "wife ta",
"normalized": "for wife",
"language": "Mixed",
"category": "relationship",
"confidence": "HIGH",
"implied_intent": "RECIPIENT_WIFE",
"implied_flag": null,
"usage_example": "wife ta birthday gift ekak one",
"aliases": ["wife ta","nona ta","mage wife ta"],
"do_not_confuse_with": null
},
{
"id": "IS151",
"input": "husband ta",
"normalized": "for husband",
"language": "Mixed",
"category": "relationship",
"confidence": "HIGH",
"implied_intent": "RECIPIENT_HUSBAND",
"implied_flag": null,
"usage_example": "husband ta anniversary gift ekak one",
"aliases": ["husband ta","mahattaya ta"],
"do_not_confuse_with": null
},
{
"id": "IS152",
"input": "boss ta",
"normalized": "for boss",
"language": "Mixed",
"category": "relationship",
"confidence": "HIGH",
"implied_intent": "RECIPIENT_BOSS",
"implied_flag": null,
"usage_example": "boss ta corporate gift ekak one",
"aliases": ["boss ta","manager ta"],
"do_not_confuse_with": null
},
{
"id": "IS153",
"input": "friend ta",
"normalized": "for friend",
"language": "Mixed",
"category": "relationship",
"confidence": "HIGH",
"implied_intent": "RECIPIENT_FRIEND",
"implied_flag": null,
"usage_example": "friend ta birthday gift ekak one",
"aliases": ["friend ta","yaluwekta","machan ta"],
"do_not_confuse_with": null
},
{
"id": "IS154",
"input": "appa ku",
"normalized": "for father",
"language": "Tanglish",
"category": "relationship",
"confidence": "HIGH",
"implied_intent": "RECIPIENT_FATHER",
"implied_flag": null,
"usage_example": "appa ku gift venum",
"aliases": ["appa ku","appa kku","appa-ku"],
"do_not_confuse_with": null
},
{
"id": "IS155",
"input": "amma ku",
"normalized": "for mother",
"language": "Tanglish",
"category": "relationship",
"confidence": "HIGH",
"implied_intent": "RECIPIENT_MOTHER",
"implied_flag": null,
"usage_example": "amma ku birthday gift venum",
"aliases": ["amma ku","amma kku"],
"do_not_confuse_with": null
},
{
"id": "IS156",
"input": "thangachi ku",
"normalized": "for younger sister",
"language": "Tanglish",
"category": "relationship",
"confidence": "HIGH",
"implied_intent": "RECIPIENT_YOUNGER_SISTER",
"implied_flag": null,
"usage_example": "thangachi ku gift venum",
"aliases": ["thangachi ku","thangachikku"],
"do_not_confuse_with": null
},
{
"id": "IS157",
"input": "anna ku",
"normalized": "for older brother",
"language": "Tanglish",
"category": "relationship",
"confidence": "HIGH",
"implied_intent": "RECIPIENT_OLDER_BROTHER",
"implied_flag": null,
"usage_example": "anna ku gift venum",
"aliases": ["anna ku","annakku"],
"do_not_confuse_with": null
},
{
"id": "IS158",
"input": "அம்மாவுக்கு",
"normalized": "for mother",
"language": "Tamil",
"category": "relationship",
"confidence": "HIGH",
"implied_intent": "RECIPIENT_MOTHER",
"implied_flag": null,
"usage_example": "அம்மாவுக்கு பரிசு வேண்டும்",
"aliases": ["அம்மாவுக்கு"],
"do_not_confuse_with": null
},
{
"id": "IS159",
"input": "அப்பாவுக்கு",
"normalized": "for father",
"language": "Tamil",
"category": "relationship",
"confidence": "HIGH",
"implied_intent": "RECIPIENT_FATHER",
"implied_flag": null,
"usage_example": "அப்பாவுக்கு பரிசு வேண்டும்",
"aliases": ["அப்பாவுக்கு"],
"do_not_confuse_with": null
},
{
"id": "IS160",
"input": "අම්මාට",
"normalized": "for mother",
"language": "Sinhala",
"category": "relationship",
"confidence": "HIGH",
"implied_intent": "RECIPIENT_MOTHER",
"implied_flag": null,
"usage_example": "අම්මාට තෑග්ගක් ඕනේ",
"aliases": ["අම්මාට"],
"do_not_confuse_with": null
},
{
"id": "IS161",
"input": "තාත්තාට",
"normalized": "for father",
"language": "Sinhala",
"category": "relationship",
"confidence": "HIGH",
"implied_intent": "RECIPIENT_FATHER",
"implied_flag": null,
"usage_example": "තාත්තාට මොනවහරි ඕනේ",
"aliases": ["තාත්තාට"],
"do_not_confuse_with": null
},
{
"id": "IS162",
"input": "for my wife",
"normalized": "for wife",
"language": "English",
"category": "relationship",
"confidence": "HIGH",
"implied_intent": "RECIPIENT_WIFE",
"implied_flag": null,
"usage_example": "need something for my wife",
"aliases": ["for my wife","for wife"],
"do_not_confuse_with": null
},
{
"id": "IS163",
"input": "for my parents",
"normalized": "for parents",
"language": "English",
"category": "relationship",
"confidence": "HIGH",
"implied_intent": "RECIPIENT_PARENTS",
"implied_flag": null,
"usage_example": "sending something for my parents",
"aliases": ["for my parents","for parents"],
"do_not_confuse_with": null
}
]
(Occasion Signals (~30-40 entries)

Examples:

birthday eka
birthday heta
anniversary
varsari
piranda naal
avurudu
aluth avurudda
vesak
poson
deepavali
eid
christmas
new baby
baby shower
graduation
passed exam
promotion
new job
farewell
secret santa)

	occasion_vocabulary.json        → use prompt

[
{
"id": "IS164",
"input": "birthday eka",
"normalized": "birthday",
"language": "Singlish",
"category": "occasion",
"confidence": "HIGH",
"implied_intent": "BIRTHDAY_GIFT",
"implied_flag": null,
"usage_example": "amma ge birthday eka",
"aliases": ["birthday eka","bday eka","birthday"],
"do_not_confuse_with": null
},
{
"id": "IS165",
"input": "birthday heta",
"normalized": "birthday tomorrow",
"language": "Mixed",
"category": "occasion",
"confidence": "HIGH",
"implied_intent": "BIRTHDAY_GIFT",
"implied_flag": "URGENT",
"usage_example": "nangi ge birthday heta",
"aliases": ["birthday heta","birthday eka heta"],
"do_not_confuse_with": null
},
{
"id": "IS166",
"input": "anniversary",
"normalized": "anniversary",
"language": "English",
"category": "occasion",
"confidence": "HIGH",
"implied_intent": "ANNIVERSARY_GIFT",
"implied_flag": null,
"usage_example": "mage anniversary eka",
"aliases": ["anniversary","anni"],
"do_not_confuse_with": null
},
{
"id": "IS167",
"input": "varsari",
"normalized": "anniversary",
"language": "Tanglish",
"category": "occasion",
"confidence": "HIGH",
"implied_intent": "ANNIVERSARY_GIFT",
"implied_flag": null,
"usage_example": "wedding varsari",
"aliases": ["varsari","varshari"],
"do_not_confuse_with": null
},
{
"id": "IS168",
"input": "piranda naal",
"normalized": "birthday",
"language": "Tanglish",
"category": "occasion",
"confidence": "HIGH",
"implied_intent": "BIRTHDAY_GIFT",
"implied_flag": null,
"usage_example": "appa piranda naal",
"aliases": ["piranda naal","pirantha naal"],
"do_not_confuse_with": null
},
{
"id": "IS169",
"input": "wedding",
"normalized": "wedding",
"language": "English",
"category": "occasion",
"confidence": "HIGH",
"implied_intent": "WEDDING_GIFT",
"implied_flag": null,
"usage_example": "friend wedding ekak",
"aliases": ["wedding","marriage"],
"do_not_confuse_with": null
},
{
"id": "IS170",
"input": "kalyanam",
"normalized": "wedding",
"language": "Tanglish",
"category": "occasion",
"confidence": "HIGH",
"implied_intent": "WEDDING_GIFT",
"implied_flag": null,
"usage_example": "kalyanam ku gift venum",
"aliases": ["kalyanam","kalyana"],
"do_not_confuse_with": null
},
{
"id": "IS171",
"input": "avurudu",
"normalized": "sinhala tamil new year",
"language": "Singlish",
"category": "occasion",
"confidence": "HIGH",
"implied_intent": "NEW_YEAR_GIFT",
"implied_flag": null,
"usage_example": "avurudu shopping karanna one",
"aliases": ["avurudu","aluth avurudda"],
"do_not_confuse_with": null
},
{
"id": "IS172",
"input": "aluth avurudda",
"normalized": "new year",
"language": "Singlish",
"category": "occasion",
"confidence": "HIGH",
"implied_intent": "NEW_YEAR_GIFT",
"implied_flag": null,
"usage_example": "aluth avuruddata ganna one",
"aliases": ["aluth avurudda","aluth awurudda"],
"do_not_confuse_with": null
},
{
"id": "IS173",
"input": "puthandu",
"normalized": "tamil new year",
"language": "Tanglish",
"category": "occasion",
"confidence": "HIGH",
"implied_intent": "NEW_YEAR_GIFT",
"implied_flag": null,
"usage_example": "puthandu ku sweets venum",
"aliases": ["puthandu","puthaandu"],
"do_not_confuse_with": null
},
{
"id": "IS174",
"input": "vesak",
"normalized": "vesak festival",
"language": "Mixed",
"category": "occasion",
"confidence": "HIGH",
"implied_intent": "RELIGIOUS_PURCHASE",
"implied_flag": null,
"usage_example": "vesak lantern ekak one",
"aliases": ["vesak","wesak"],
"do_not_confuse_with": null
},
{
"id": "IS175",
"input": "poson",
"normalized": "poson festival",
"language": "Mixed",
"category": "occasion",
"confidence": "HIGH",
"implied_intent": "RELIGIOUS_PURCHASE",
"implied_flag": null,
"usage_example": "poson dan salakili one",
"aliases": ["poson","poson poya"],
"do_not_confuse_with": null
},
{
"id": "IS176",
"input": "deepavali",
"normalized": "deepavali festival",
"language": "Mixed",
"category": "occasion",
"confidence": "HIGH",
"implied_intent": "FESTIVAL_SHOPPING",
"implied_flag": null,
"usage_example": "deepavali sweets venum",
"aliases": ["deepavali","diwali"],
"do_not_confuse_with": null
},
{
"id": "IS177",
"input": "eid",
"normalized": "eid festival",
"language": "English",
"category": "occasion",
"confidence": "HIGH",
"implied_intent": "FESTIVAL_SHOPPING",
"implied_flag": null,
"usage_example": "eid gift hamper one",
"aliases": ["eid","eid mubarak"],
"do_not_confuse_with": null
},
{
"id": "IS178",
"input": "christmas",
"normalized": "christmas",
"language": "English",
"category": "occasion",
"confidence": "HIGH",
"implied_intent": "CHRISTMAS_GIFT",
"implied_flag": null,
"usage_example": "christmas gift ekak one",
"aliases": ["christmas","xmas"],
"do_not_confuse_with": null
},
{
"id": "IS179",
"input": "valentines",
"normalized": "valentine's day",
"language": "English",
"category": "occasion",
"confidence": "HIGH",
"implied_intent": "ROMANTIC_GIFT",
"implied_flag": null,
"usage_example": "valentines gift ekak one",
"aliases": ["valentines","valentine","valentines day"],
"do_not_confuse_with": null
},
{
"id": "IS180",
"input": "new baby",
"normalized": "newborn celebration",
"language": "English",
"category": "occasion",
"confidence": "HIGH",
"implied_intent": "BABY_GIFT",
"implied_flag": null,
"usage_example": "friend ge new baby",
"aliases": ["new baby","baby born"],
"do_not_confuse_with": null
},
{
"id": "IS181",
"input": "baby shower",
"normalized": "baby shower",
"language": "English",
"category": "occasion",
"confidence": "HIGH",
"implied_intent": "BABY_GIFT",
"implied_flag": null,
"usage_example": "baby shower gift ekak one",
"aliases": ["baby shower"],
"do_not_confuse_with": null
},
{
"id": "IS182",
"input": "graduation",
"normalized": "graduation",
"language": "English",
"category": "occasion",
"confidence": "HIGH",
"implied_intent": "ACHIEVEMENT_GIFT",
"implied_flag": null,
"usage_example": "malli graduation eka",
"aliases": ["graduation","graduate una"],
"do_not_confuse_with": null
},
{
"id": "IS183",
"input": "promotion",
"normalized": "job promotion",
"language": "English",
"category": "occasion",
"confidence": "HIGH",
"implied_intent": "ACHIEVEMENT_GIFT",
"implied_flag": null,
"usage_example": "promotion ekata gift ekak one",
"aliases": ["promotion","promoted una"],
"do_not_confuse_with": null
},
{
"id": "IS184",
"input": "new job",
"normalized": "new job",
"language": "English",
"category": "occasion",
"confidence": "HIGH",
"implied_intent": "ACHIEVEMENT_GIFT",
"implied_flag": null,
"usage_example": "new job ekata gift ekak one",
"aliases": ["new job","job hambuna"],
"do_not_confuse_with": null
},
{
"id": "IS185",
"input": "passed exam",
"normalized": "exam success",
"language": "English",
"category": "occasion",
"confidence": "HIGH",
"implied_intent": "ACHIEVEMENT_GIFT",
"implied_flag": null,
"usage_example": "nangi passed exam",
"aliases": ["passed exam","exam pass una"],
"do_not_confuse_with": null
},
{
"id": "IS186",
"input": "farewell",
"normalized": "farewell event",
"language": "English",
"category": "occasion",
"confidence": "HIGH",
"implied_intent": "FAREWELL_GIFT",
"implied_flag": null,
"usage_example": "office farewell ekak",
"aliases": ["farewell","send off"],
"do_not_confuse_with": null
},
{
"id": "IS187",
"input": "secret santa",
"normalized": "secret santa gift exchange",
"language": "English",
"category": "occasion",
"confidence": "HIGH",
"implied_intent": "SECRET_SANTA_GIFT",
"implied_flag": null,
"usage_example": "secret santa gift ekak one",
"aliases": ["secret santa"],
"do_not_confuse_with": null
},
{
"id": "IS188",
"input": "house warming",
"normalized": "housewarming",
"language": "English",
"category": "occasion",
"confidence": "HIGH",
"implied_intent": "HOUSEWARMING_GIFT",
"implied_flag": null,
"usage_example": "house warming ekata monawahari one",
"aliases": ["house warming","housewarming"],
"do_not_confuse_with": null
}
]


	shopping_products.json          → use prompt
	location_aliases.json           → use prompt

Recommended Schema
{
  "id": "LOC001",
  "input": "mahanuwara",
  "normalized": "Kandy",
  "location_type": "city",
  "province": "Central",
  "district": "Kandy",
  "confidence": "HIGH",
  "aliases": [
    "mahanuwara",
    "maha nuwara",
    "kandy"
  ]
}
Category 1
Major City Aliases
Kandy
{
  "input": "mahanuwara",
  "normalized": "Kandy"
}
{
  "input": "maha nuwara",
  "normalized": "Kandy"
}
Jaffna
{
  "input": "yalpanam",
  "normalized": "Jaffna"
}
{
  "input": "yalpaanam",
  "normalized": "Jaffna"
}
{
  "input": "யாழ்ப்பாணம்",
  "normalized": "Jaffna"
}
Colombo
{
  "input": "col 7",
  "normalized": "Colombo 07"
}
{
  "input": "cmb",
  "normalized": "Colombo"
}
Category 2
Colombo Area Aliases

These are extremely important.

Pettah
{
  "input": "pettah",
  "normalized": "Colombo 11"
}
Fort
{
  "input": "fort",
  "normalized": "Colombo 01"
}
Borella
{
  "input": "borella",
  "normalized": "Colombo 08"
}
Wellawatte
{
  "input": "wellawatte",
  "normalized": "Colombo 06"
}
Bambalapitiya
{
  "input": "bambalapitiya",
  "normalized": "Colombo 04"
}
Dehiwala
{
  "input": "dehiwala",
  "normalized": "Dehiwala-Mount Lavinia"
}
Category 3
District Names (All 25)

Examples:

{
  "input": "gampaha",
  "normalized": "Gampaha"
}
{
  "input": "kurunegala",
  "normalized": "Kurunegala"
}
{
  "input": "matara",
  "normalized": "Matara"
}
{
  "input": "hambantota",
  "normalized": "Hambantota"
}
{
  "input": "anuradhapura",
  "normalized": "Anuradhapura"
}
Category 4
Sinhala Unicode
{
  "input": "මහනුවර",
  "normalized": "Kandy"
}
{
  "input": "යාපනය",
  "normalized": "Jaffna"
}
{
  "input": "කොළඹ",
  "normalized": "Colombo"
}
{
  "input": "ගාල්ල",
  "normalized": "Galle"
}
Category 5
Tamil Unicode
{
  "input": "கொழும்பு",
  "normalized": "Colombo"
}
{
  "input": "யாழ்ப்பாணம்",
  "normalized": "Jaffna"
}
{
  "input": "கண்டி",
  "normalized": "Kandy"
}
Category 6
Delivery Landmark Aliases

Very important for Sri Lankan delivery.

{
  "input": "hospital eka laga",
  "normalized": "near hospital",
  "location_type": "landmark"
}
{
  "input": "school eka gawa",
  "normalized": "near school",
  "location_type": "landmark"
}
{
  "input": "handiya",
  "normalized": "junction",
  "location_type": "landmark"
}
{
  "input": "bus halt eka gawa",
  "normalized": "near bus stop",
  "location_type": "landmark"
}
{
  "input": "kovil pakkathula",
  "normalized": "near temple",
  "location_type": "landmark"
}
Highest ROI Aliases

If you're time-constrained, build these first:

Colombo
Pettah
Fort
Maradana
Borella
Wellawatte
Bambalapitiya
Rajagiriya
Nugegoda
Maharagama
Dehiwala
Mount Lavinia
Major Cities
Colombo
Kandy
Galle
Jaffna
Matara
Negombo
Kurunegala
Batticaloa
Trincomalee
Anuradhapura
Local Names
Mahanuwara → Kandy
Yalpanam → Jaffna
Kozhumbu → Colombo
Delivery Landmarks
handiya
bus halt
school eka gawa
hospital eka laga
kovil pakkathula
pansala laga

	budget_terms.json               → use prompt

[
  {
    "id": "IS189",
    "input": "aduwen",
    "normalized": "cheap",
    "language": "Singlish",
    "category": "budget",
    "confidence": "HIGH",
    "implied_intent": "LOW_BUDGET",
    "implied_flag": null,
    "usage_example": "aduwen monawahari thiyenawada",
    "aliases": ["aduwen","aduwenma"],
    "do_not_confuse_with": null
  },
  {
    "id": "IS190",
    "input": "ganan ne",
    "normalized": "not expensive",
    "language": "Singlish",
    "category": "budget",
    "confidence": "HIGH",
    "implied_intent": "LOW_BUDGET",
    "implied_flag": null,
    "usage_example": "ganan ne ekak one",
    "aliases": ["ganan ne","ganan nehe"],
    "do_not_confuse_with": null
  },
  {
    "id": "IS191",
    "input": "podi budget ekak",
    "normalized": "small budget",
    "language": "Singlish",
    "category": "budget",
    "confidence": "HIGH",
    "implied_intent": "LOW_BUDGET",
    "implied_flag": null,
    "usage_example": "podi budget ekak thamai",
    "aliases": ["podi budget","small budget"],
    "do_not_confuse_with": null
  },
  {
    "id": "IS192",
    "input": "under 5000",
    "normalized": "budget under 5000 LKR",
    "language": "English",
    "category": "budget",
    "confidence": "HIGH",
    "implied_intent": "BUDGET_CONSTRAINED",
    "implied_flag": null,
    "usage_example": "under 5000 thiyena gift",
    "aliases": ["under 5000","below 5000"],
    "do_not_confuse_with": null
  },
  {
    "id": "IS193",
    "input": "budget tight",
    "normalized": "limited budget",
    "language": "English",
    "category": "budget",
    "confidence": "HIGH",
    "implied_intent": "BUDGET_CONSTRAINED",
    "implied_flag": null,
    "usage_example": "budget tight bn",
    "aliases": ["budget tight","tight budget"],
    "do_not_confuse_with": null
  },
  {
    "id": "IS194",
    "input": "mila kammiya",
    "normalized": "low price",
    "language": "Tanglish",
    "category": "budget",
    "confidence": "HIGH",
    "implied_intent": "LOW_BUDGET",
    "implied_flag": null,
    "usage_example": "mila kammiya irukkanum",
    "aliases": ["mila kammiya","kammiya"],
    "do_not_confuse_with": null
  },
  {
    "id": "IS195",
    "input": "cheap one",
    "normalized": "budget item",
    "language": "Mixed",
    "category": "budget",
    "confidence": "HIGH",
    "implied_intent": "LOW_BUDGET",
    "implied_flag": null,
    "usage_example": "cheap one show karanna",
    "aliases": ["cheap one","cheap ekak"],
    "do_not_confuse_with": null
  },
  {
    "id": "IS196",
    "input": "ganan",
    "normalized": "expensive",
    "language": "Singlish",
    "category": "budget",
    "confidence": "HIGH",
    "implied_intent": "PREMIUM_BUDGET",
    "implied_flag": null,
    "usage_example": "eka ganan wadi",
    "aliases": ["ganan","ganan wadi"],
    "do_not_confuse_with": null
  },
  {
    "id": "IS197",
    "input": "premium ekak",
    "normalized": "premium product",
    "language": "Mixed",
    "category": "budget",
    "confidence": "HIGH",
    "implied_intent": "PREMIUM_BUDGET",
    "implied_flag": null,
    "usage_example": "premium ekak pennanna",
    "aliases": ["premium ekak","premium one"],
    "do_not_confuse_with": null
  },
  {
    "id": "IS198",
    "input": "no budget issue",
    "normalized": "budget not important",
    "language": "English",
    "category": "budget",
    "confidence": "HIGH",
    "implied_intent": "PREMIUM_BUDGET",
    "implied_flag": null,
    "usage_example": "no budget issue",
    "aliases": ["no budget issue","budget not a problem"],
    "do_not_confuse_with": null
  }
]

	singlish_connectors.json        → use prompt
	greetings.json                  → use prompt