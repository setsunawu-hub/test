// 原創題庫（非官方真題）。新增試卷只需在 TESTS 加入同結構的物件。
window.TESTS = {
  reading: [{
    id: 'r1', title: 'Reading · Rooftop Farming', minutes: 20,
    passage: [
      ['A', 'As cities expand, the distance between farms and the people they feed has grown. Food in a typical European city travels, on average, more than 1,500 kilometres before it reaches a plate. Rooftop farming — growing vegetables, herbs and even fish on the flat roofs of buildings — has been proposed as a way to shorten that journey. In Montreal, a commercial greenhouse opened in 2011 on top of a former warehouse and now supplies around 1,000 families a week with tomatoes and lettuce.'],
      ['B', 'The idea itself is not new. Roof gardens were common in ancient Rome, and in the 1930s several New York hotels grew herbs for their own kitchens. What has changed is technology. Lightweight growing materials, which weigh up to 70 per cent less than ordinary soil, mean that even older buildings can carry a garden without structural reinforcement. Hydroponic systems, in which plants grow in nutrient-rich water rather than soil, use up to 90 per cent less water than conventional fields.'],
      ['C', 'The benefits extend beyond food. Vegetation insulates a building: a study in Toronto found that green roofs reduced summer cooling costs by 20 per cent. Plants also absorb rainwater, easing the pressure on city drains during storms, and they lower local temperatures in what is known as the urban heat island effect. Some researchers report that residents with access to shared roof gardens experience less stress, although critics point out that most of these findings rely on self-reported surveys rather than physical measurements.'],
      ['D', 'There are, however, serious obstacles. Installation is expensive, building regulations are often unclear, and owners worry about leaks. More fundamentally, rooftop farms cannot replace rural agriculture. Calculations suggest that even if every suitable roof in Chicago were planted, only about 10 per cent of the city\'s vegetable needs would be met. Staple crops such as wheat and rice require far more space than any city roof can offer.'],
      ['E', 'Some governments are nevertheless encouraging the trend. Paris requires new commercial buildings in certain districts to cover part of their roofs with plants or solar panels, while Singapore offers grants that pay for up to half of the installation cost. Most experts agree that the most realistic role for rooftop farming is to supplement, not replace, existing food supplies — while giving city children a rare chance to see where their food comes from.'],
    ],
    questions: [
      { id: 'r1q1', type: 'tfng', skill: 'tfng', text: 'Food in a typical European city travels over 1,500 km on average.', answer: ['true'], explain: '段落 A 明確寫出 "more than 1,500 kilometres"，與題目一致 → True。', evidence: 'Food in a typical European city travels, on average, more than 1,500 kilometres…' },
      { id: 'r1q2', type: 'tfng', skill: 'tfng', text: 'The Montreal greenhouse was built on top of a newly constructed building.', answer: ['false'], explain: '原文是 "a former warehouse"（舊倉庫），與 "newly constructed" 矛盾 → False。', evidence: '…on top of a former warehouse…' },
      { id: 'r1q3', type: 'tfng', skill: 'tfng', text: 'Hydroponic farming is cheaper to set up than soil-based farming.', answer: ['not given'], explain: '原文只談 hydroponics 的省水（90%），完全沒比較建置成本 → Not Given。', evidence: '（原文無相關資訊）' },
      { id: 'r1q4', type: 'tfng', skill: 'tfng', text: 'Lightweight materials allow older buildings to host gardens without extra structural support.', answer: ['true'], explain: '"without structural reinforcement" 同義改寫為 "without extra structural support" → True。', evidence: '…even older buildings can carry a garden without structural reinforcement.' },
      { id: 'r1q5', type: 'gap', skill: 'gap', limit: 2, text: 'In Toronto, green roofs reduced summer ______ costs by 20 per cent.', answer: ['cooling'], explain: '定位詞 Toronto / 20 per cent，答案緊接在 summer 後面。', evidence: '…reduced summer cooling costs by 20 per cent.' },
      { id: 'r1q6', type: 'gap', skill: 'gap', limit: 2, text: 'Plants help cities by absorbing ______ and easing pressure on drains.', answer: ['rainwater', 'rain water'], explain: '"easing the pressure on city drains" 對應題目；absorb 的對象是 rainwater。', evidence: 'Plants also absorb rainwater, easing the pressure on city drains…' },
      { id: 'r1q7', type: 'gap', skill: 'gap', limit: 2, text: 'Evidence that roof gardens reduce stress mostly comes from ______ surveys.', answer: ['self-reported', 'self reported'], explain: '注意連字號詞算一個字；批評者指出研究依賴 self-reported surveys。', evidence: '…most of these findings rely on self-reported surveys…' },
      { id: 'r1q8', type: 'gap', skill: 'gap', limit: 2, text: 'Even if every suitable roof in Chicago were planted, only ______ per cent of vegetable needs would be met.', answer: ['10', 'ten'], explain: '數字可寫阿拉伯數字或英文，皆可得分。', evidence: '…only about 10 per cent of the city\'s vegetable needs would be met.' },
      { id: 'r1q9', type: 'mcq', skill: 'mcq', text: 'What is the writer\'s main point in paragraph D?', options: ['Rooftop farming is too expensive for any city.', 'Rooftop farming cannot supply most of a city\'s food.', 'Building owners refuse to allow rooftop farms.', 'Staple crops grow better in cold climates.'], answer: ['b'], explain: '段落 D 的核心是 "cannot replace rural agriculture"（B）。A 過度推論（"any city"）、C 只是次要顧慮、D 原文未提。', evidence: '…rooftop farms cannot replace rural agriculture.' },
      { id: 'r1q10', type: 'mcq', skill: 'mcq', text: 'According to paragraph E, the most realistic role of rooftop farming is to…', options: ['replace rural agriculture.', 'supplement existing food supplies.', 'provide staple crops such as rice.', 'reduce the need for solar panels.'], answer: ['b'], explain: '"supplement, not replace" 直接對應 B；A 與原文相反。', evidence: '…to supplement, not replace, existing food supplies…' },
      { id: 'r1q11', type: 'match', skill: 'match', text: 'a government offering financial help with installation', options: ['A', 'B', 'C', 'D', 'E'], answer: ['e'], explain: 'Singapore offers grants → 段落 E。', evidence: 'Singapore offers grants that pay for up to half of the installation cost.' },
      { id: 'r1q12', type: 'match', skill: 'match', text: 'a comparison with practices in the ancient world', options: ['A', 'B', 'C', 'D', 'E'], answer: ['b'], explain: 'ancient Rome → 段落 B。', evidence: 'Roof gardens were common in ancient Rome…' },
      { id: 'r1q13', type: 'match', skill: 'match', text: 'a doubt about the reliability of research findings', options: ['A', 'B', 'C', 'D', 'E'], answer: ['c'], explain: 'critics point out…self-reported surveys → 段落 C。', evidence: '…critics point out that most of these findings rely on self-reported surveys…' },
    ],
  }],

  listening: [{
    id: 'l1', title: 'Listening · Gym Membership Enquiry', minutes: 10,
    intro: '你將聽到一段電話對話（只播放一次）。聽的同時作答；結束後有 1 分鐘檢查時間。',
    script: [
      ['Anna', 'Good morning, Riverside Leisure Centre, Anna speaking. How can I help?'],
      ['Tom', 'Hi, I\'d like to join your evening fitness classes, please.'],
      ['Anna', 'Of course. Let me take a few details. Can I have your surname?'],
      ['Tom', 'It\'s Hargreaves. That\'s H, A, R, G, R, E, A, V, E, S.'],
      ['Anna', 'Thank you. And a contact number?'],
      ['Tom', 'Sure, it\'s oh seven seven oh oh, nine oh oh, four one three.'],
      ['Anna', 'Lovely. Now, we have three kinds of membership: pay-as-you-go, monthly, and annual.'],
      ['Tom', 'I was going to take the monthly one, but what does the annual one cost?'],
      ['Anna', 'The annual works out cheaper per month, and you also get free parking.'],
      ['Tom', 'In that case, I\'ll go for the annual membership.'],
      ['Anna', 'Great. Which class would you like? We have circuit training on Tuesdays and Thursdays.'],
      ['Tom', 'Tuesday would be ideal.'],
      ['Anna', 'Oh, I\'m sorry, the Tuesday class is full. Thursday still has spaces.'],
      ['Tom', 'Then Thursday is fine. What time does it start?'],
      ['Anna', 'It used to start at seven, but from this term it begins at a quarter to seven in the evening.'],
      ['Tom', 'Six forty-five, perfect.'],
      ['Anna', 'The standard price is thirty-five pounds a month, but as a student you get a discount, so you\'ll pay twenty-eight.'],
      ['Tom', 'That\'s great. Is there anything I should bring?'],
      ['Anna', 'Just a towel. We provide the mats and water. The shower gel is not included.'],
      ['Tom', 'And where do I park? I heard the underground car park is closed.'],
      ['Anna', 'It is, yes, for repairs. Use the free spaces on Mill Street, just behind the building.'],
      ['Tom', 'Wonderful, thanks very much.'],
    ],
    questions: [
      { id: 'l1q1', type: 'gap', skill: 'spell', limit: 1, text: 'Surname: ______', answer: ['hargreaves'], explain: '字母拼寫題：逐字母記下，注意 A-R-G-R-E-A-V-E-S，常見錯誤是漏掉第二個 R 或 E。', evidence: 'H, A, R, G, R, E, A, V, E, S' },
      { id: 'l1q2', type: 'gap', skill: 'number', limit: 1, text: 'Contact number: ______', answer: ['07700900413'], explain: '"oh" = 0；"double" 或重複數字要小心。逐位寫下，勿用口語化的分組。', evidence: 'oh seven seven oh oh, nine oh oh, four one three' },
      { id: 'l1q3', type: 'mcq', skill: 'distractor', text: 'Which membership does Tom choose?', options: ['Pay-as-you-go', 'Monthly', 'Annual'], answer: ['c'], explain: '陷阱題：Tom 先說 monthly，後來因為更便宜且含免費停車而改選 annual。以「最後確定」的說法為準。', evidence: 'In that case, I\'ll go for the annual membership.' },
      { id: 'l1q4', type: 'gap', skill: 'distractor', limit: 1, text: 'Class day: ______', answer: ['thursday'], explain: '陷阱題：Tuesday 已額滿，最後選 Thursday。', evidence: 'Then Thursday is fine.' },
      { id: 'l1q5', type: 'gap', skill: 'number', limit: 2, text: 'Class start time: ______ pm', answer: ['645', '645pm', '1845'], explain: '"used to start at seven" 是舊時間（干擾），"a quarter to seven" = 6:45。時間格式 6.45 / 6:45 都接受。', evidence: '…it begins at a quarter to seven… Six forty-five, perfect.' },
      { id: 'l1q6', type: 'gap', skill: 'number', limit: 1, text: 'Monthly fee after student discount: £ ______', answer: ['28'], explain: '陷阱題：35 是原價，28 才是學生折扣後的價格。', evidence: '…as a student you get a discount, so you\'ll pay twenty-eight.' },
      { id: 'l1q7', type: 'gap', skill: 'detail', limit: 1, text: 'Tom needs to bring a ______', answer: ['towel'], explain: '"Just a towel" 為答案；mats、water 是提供的，shower gel 未包含，皆為干擾。', evidence: 'Just a towel.' },
      { id: 'l1q8', type: 'mcq', skill: 'distractor', text: 'Where should Tom park?', options: ['In the underground car park', 'On Mill Street', 'Behind the building in the paid car park'], answer: ['b'], explain: '地下停車場關閉；Mill Street 的免費車位在建築物後方，故選 B。C 的 "paid" 原文未提。', evidence: 'Use the free spaces on Mill Street, just behind the building.' },
    ],
  }],

  writing: [{
    id: 'w1', title: 'Writing · Task 1 + Task 2', minutes: 60,
    task1: {
      minWords: 150, suggest: 20,
      prompt: 'The table below shows the percentage of households with internet access in four countries in 2005, 2015 and 2025. Summarise the information by selecting and reporting the main features, and make comparisons where relevant.',
      table: { head: ['Country', '2005', '2015', '2025'], rows: [['Norway', '81%', '96%', '99%'], ['Brazil', '14%', '58%', '88%'], ['India', '3%', '26%', '71%'], ['Kenya', '2%', '17%', '64%']] },
    },
    task2: {
      minWords: 250, suggest: 40,
      prompt: 'Some people believe that working from home is better for both employees and employers. Others think that working in an office is more productive. Discuss both views and give your own opinion.',
    },
  }],
};

// 各題型常見失分原因與改進建議
window.SKILL_INFO = {
  tfng: { name: 'True / False / Not Given', tip: '先分清：與原文矛盾 = False；原文根本沒提 = Not Given。不要用常識判斷，只看原文。看到 "all/only/never" 等絕對詞時特別小心。' },
  gap: { name: '填空題 (Completion)', tip: '先判斷空格需要名詞/動詞/數字，再回原文定位同義詞；嚴格遵守字數限制，並檢查拼寫與單複數。' },
  mcq: { name: '選擇題 (MCQ)', tip: '先自己找出原文證據，再比較選項；排除「過度推論」「原文未提」「與原文相反」三類干擾項。' },
  match: { name: '段落配對 (Matching)', tip: '先看題目的關鍵詞/同義改寫，掃讀每段首尾句；一個段落可能被多次使用，別因為「用過了」就排除。' },
  spell: { name: '拼寫題 (Spelling)', tip: '聽力字母拼寫要熟練 A/E/I 與 G/J、M/N 的發音差異；平時用字母表朗讀練習。' },
  number: { name: '數字/時間 (Numbers)', tip: '注意 thirteen/thirty、"oh" = 0、a quarter to = 差 15 分。聽到修正（"sorry, I mean…"）以最後說法為準。' },
  distractor: { name: '改口/干擾題 (Distractors)', tip: '說話者常先講錯再更正。養成「聽到轉折詞（but, actually, in that case）就特別留意」的習慣。' },
  detail: { name: '細節題 (Detail)', tip: '預讀題目、預測答案詞性，聽的時候只抓關鍵資訊，避免被周邊細節分心。' },
};
