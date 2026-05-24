// Guided triage flows for the patient chat. One question at a time per spec.
// All copy is localized for English (en), Chinese (zh), and Bahasa Melayu (ms).

export type Lang = "en" | "zh" | "ms";

export type FlowKey =
  | "general"
  | "fever"
  | "headache"
  | "cough"
  | "stomach"
  | "medication"
  | "side-effect"
  | "appointment"
  | "clinician";

export type FlowOption = {
  label: string;
  redFlag?: boolean;
  // If true, instead of sending immediately, prompts the user to type freely.
  freeText?: boolean;
  // If true, picking this option ends the flow with a clinician-review request.
  requestReview?: boolean;
  // If true, picking this option ends the flow with a pharmacist-review request.
  requestPharmacist?: boolean;
};

export type FlowStep = {
  question: string;
  options: FlowOption[];
};

export type Flow = {
  label: string; // chip label
  steps: FlowStep[];
};

// ---------- English ----------

const EN: Record<FlowKey, Flow> = {
  general: {
    label: "General health question",
    steps: [
      {
        question: "What would you like to ask about?",
        options: [
          { label: "Type my question", freeText: true },
          { label: "Request clinician review", requestReview: true },
        ],
      },
    ],
  },
  fever: {
    label: "Fever",
    steps: [
      {
        question: "How long have you had the fever?",
        options: [
          { label: "Today" },
          { label: "1–2 days" },
          { label: "3 days or more" },
          { label: "Not sure" },
        ],
      },
      {
        question: "How high is your temperature?",
        options: [
          { label: "Below 38°C" },
          { label: "38°C–39°C" },
          { label: "Above 39°C" },
          { label: "I have not checked" },
        ],
      },
      {
        question: "Do you have any of these symptoms?",
        options: [
          { label: "Difficulty breathing", redFlag: true },
          { label: "Chest pain", redFlag: true },
          { label: "Confusion", redFlag: true },
          { label: "Severe headache" },
          { label: "Rash" },
          { label: "None of these" },
        ],
      },
      {
        question: "What would you like ClareCare to do?",
        options: [
          { label: "General advice" },
          { label: "Request clinician review", requestReview: true },
        ],
      },
    ],
  },
  headache: {
    label: "Headache",
    steps: [
      {
        question: "How severe is your headache?",
        options: [
          { label: "Mild" },
          { label: "Moderate" },
          { label: "Severe" },
          { label: "Worst headache ever", redFlag: true },
        ],
      },
      {
        question: "When did it start?",
        options: [
          { label: "Today" },
          { label: "1–2 days ago" },
          { label: "More than 3 days ago" },
          { label: "Suddenly" },
        ],
      },
      {
        question: "Do you have any of these symptoms?",
        options: [
          { label: "Vision changes" },
          { label: "Vomiting" },
          { label: "Confusion", redFlag: true },
          { label: "Weakness or numbness", redFlag: true },
          { label: "Head injury" },
          { label: "None of these" },
        ],
      },
      {
        question: "What would you like ClareCare to do?",
        options: [
          { label: "General advice" },
          { label: "Request clinician review", requestReview: true },
        ],
      },
    ],
  },
  cough: {
    label: "Cough",
    steps: [
      {
        question: "How long have you had the cough?",
        options: [
          { label: "Less than 3 days" },
          { label: "3–7 days" },
          { label: "More than 1 week" },
          { label: "More than 2 weeks" },
        ],
      },
      {
        question: "What type of cough is it?",
        options: [
          { label: "Dry cough" },
          { label: "With phlegm" },
          { label: "With blood", redFlag: true },
          { label: "Not sure" },
        ],
      },
      {
        question: "Do you have any of these symptoms?",
        options: [
          { label: "Fever" },
          { label: "Chest pain", redFlag: true },
          { label: "Difficulty breathing", redFlag: true },
          { label: "Blood in phlegm", redFlag: true },
          { label: "None of these" },
        ],
      },
      {
        question: "What would you like ClareCare to do?",
        options: [
          { label: "General advice" },
          { label: "Request clinician review", requestReview: true },
        ],
      },
    ],
  },
  stomach: {
    label: "Stomach pain",
    steps: [
      {
        question: "How severe is the stomach pain?",
        options: [
          { label: "Mild" },
          { label: "Moderate" },
          { label: "Severe" },
          { label: "Very severe" },
        ],
      },
      {
        question: "Where is the pain located?",
        options: [
          { label: "Upper stomach" },
          { label: "Lower stomach" },
          { label: "Right side" },
          { label: "Left side" },
          { label: "All over" },
        ],
      },
      {
        question: "Do you have any of these symptoms?",
        options: [
          { label: "Vomiting" },
          { label: "Fever" },
          { label: "Blood in stool", redFlag: true },
          { label: "Pregnancy" },
          { label: "Severe pain" },
          { label: "None of these" },
        ],
      },
      {
        question: "What would you like ClareCare to do?",
        options: [
          { label: "General advice" },
          { label: "Request clinician review", requestReview: true },
        ],
      },
    ],
  },
  medication: {
    label: "Medication question",
    steps: [
      {
        question: "What type of medication question do you have?",
        options: [
          { label: "How to take medicine" },
          { label: "Side effect" },
          { label: "Missed dose" },
          { label: "Drug interaction" },
          { label: "Allergy concern", redFlag: true },
          { label: "Other" },
        ],
      },
      {
        question: "Do you know the medicine name?",
        options: [
          { label: "Yes, I will type it", freeText: true },
          { label: "No, not sure" },
        ],
      },
      {
        question: "What would you like to do?",
        options: [
          { label: "Ask general medication information" },
          { label: "Request pharmacist review", requestPharmacist: true },
          { label: "Request clinician review", requestReview: true },
        ],
      },
    ],
  },
  "side-effect": {
    label: "Side effect",
    steps: [
      {
        question: "What side effect are you experiencing?",
        options: [
          { label: "Rash" },
          { label: "Dizziness" },
          { label: "Nausea" },
          { label: "Swelling" },
          { label: "Breathing difficulty", redFlag: true },
          { label: "Other" },
        ],
      },
      {
        question: "When did it start?",
        options: [
          { label: "Today" },
          { label: "1–2 days ago" },
          { label: "More than 3 days ago" },
          { label: "After taking medicine" },
        ],
      },
      {
        question: "Do you have severe symptoms?",
        options: [
          { label: "Breathing difficulty", redFlag: true },
          { label: "Face/lip swelling", redFlag: true },
          { label: "Severe rash", redFlag: true },
          { label: "Fainting", redFlag: true },
          { label: "None of these" },
        ],
      },
      {
        question: "What would you like ClareCare to do?",
        options: [
          { label: "Request pharmacist review", requestPharmacist: true },
          { label: "Request clinician review", requestReview: true },
        ],
      },
    ],
  },
  appointment: {
    label: "Appointment preparation",
    steps: [
      {
        question: "What is your appointment about?",
        options: [
          { label: "New symptom" },
          { label: "Follow-up" },
          { label: "Medication review" },
          { label: "Test result discussion" },
          { label: "Not sure" },
        ],
      },
      {
        question: "What do you want to prepare?",
        options: [
          { label: "Questions to ask doctor" },
          { label: "Symptom summary" },
          { label: "Medication list" },
          { label: "Things to mention" },
          { label: "All of the above" },
        ],
      },
      {
        question: "Would you like ClareCare to help create a short appointment summary?",
        options: [{ label: "Yes" }, { label: "No" }],
      },
    ],
  },
  clinician: {
    label: "Request clinician review",
    steps: [
      {
        question: "Why would you like a clinician review?",
        options: [
          { label: "Symptoms are getting worse" },
          { label: "I am unsure what to do" },
          { label: "Medication concern" },
          { label: "I prefer human support" },
          { label: "Other" },
        ],
      },
      {
        question: "How urgent does this feel?",
        options: [{ label: "Low" }, { label: "Medium" }, { label: "High" }],
      },
      {
        question: "Do you have emergency symptoms?",
        options: [
          { label: "Chest pain", redFlag: true },
          { label: "Difficulty breathing", redFlag: true },
          { label: "Severe bleeding", redFlag: true },
          { label: "Confusion", redFlag: true },
          { label: "Fainting", redFlag: true },
          { label: "None of these", requestReview: true },
        ],
      },
    ],
  },
};

// ---------- Chinese ----------

const ZH: Record<FlowKey, Flow> = {
  general: {
    label: "一般健康问题",
    steps: [
      {
        question: "你想问什么？",
        options: [
          { label: "我想自己输入问题", freeText: true },
          { label: "请求医生复查", requestReview: true },
        ],
      },
    ],
  },
  fever: {
    label: "发烧",
    steps: [
      {
        question: "你发烧多久了？",
        options: [
          { label: "今天" },
          { label: "1–2 天" },
          { label: "3 天或以上" },
          { label: "不确定" },
        ],
      },
      {
        question: "你的体温是多少？",
        options: [
          { label: "低于 38°C" },
          { label: "38°C–39°C" },
          { label: "高于 39°C" },
          { label: "还没有测量" },
        ],
      },
      {
        question: "你有以下任何症状吗？",
        options: [
          { label: "呼吸困难", redFlag: true },
          { label: "胸痛", redFlag: true },
          { label: "意识混乱", redFlag: true },
          { label: "严重头痛" },
          { label: "皮疹" },
          { label: "都没有" },
        ],
      },
      {
        question: "你希望 ClareCare 做什么？",
        options: [
          { label: "提供一般建议" },
          { label: "请求医生复查", requestReview: true },
        ],
      },
    ],
  },
  headache: {
    label: "头痛",
    steps: [
      {
        question: "你的头痛有多严重？",
        options: [
          { label: "轻微" },
          { label: "中等" },
          { label: "严重" },
          { label: "前所未有的剧烈头痛", redFlag: true },
        ],
      },
      {
        question: "什么时候开始的？",
        options: [
          { label: "今天" },
          { label: "1–2 天前" },
          { label: "超过 3 天" },
          { label: "突然发生" },
        ],
      },
      {
        question: "你有以下任何症状吗？",
        options: [
          { label: "视力变化" },
          { label: "呕吐" },
          { label: "意识混乱", redFlag: true },
          { label: "身体无力或麻木", redFlag: true },
          { label: "头部受伤" },
          { label: "都没有" },
        ],
      },
      {
        question: "你希望 ClareCare 做什么？",
        options: [
          { label: "提供一般建议" },
          { label: "请求医生复查", requestReview: true },
        ],
      },
    ],
  },
  cough: {
    label: "咳嗽",
    steps: [
      {
        question: "你咳嗽多久了？",
        options: [
          { label: "少于 3 天" },
          { label: "3–7 天" },
          { label: "超过 1 周" },
          { label: "超过 2 周" },
        ],
      },
      {
        question: "是什么类型的咳嗽？",
        options: [
          { label: "干咳" },
          { label: "有痰" },
          { label: "咳血", redFlag: true },
          { label: "不确定" },
        ],
      },
      {
        question: "你有以下任何症状吗？",
        options: [
          { label: "发烧" },
          { label: "胸痛", redFlag: true },
          { label: "呼吸困难", redFlag: true },
          { label: "痰中带血", redFlag: true },
          { label: "都没有" },
        ],
      },
      {
        question: "你希望 ClareCare 做什么？",
        options: [
          { label: "提供一般建议" },
          { label: "请求医生复查", requestReview: true },
        ],
      },
    ],
  },
  stomach: {
    label: "肚子痛",
    steps: [
      {
        question: "肚子痛有多严重？",
        options: [
          { label: "轻微" },
          { label: "中等" },
          { label: "严重" },
          { label: "非常严重" },
        ],
      },
      {
        question: "疼痛位置在哪里？",
        options: [
          { label: "上腹部" },
          { label: "下腹部" },
          { label: "右侧" },
          { label: "左侧" },
          { label: "整个腹部" },
        ],
      },
      {
        question: "你有以下任何症状吗？",
        options: [
          { label: "呕吐" },
          { label: "发烧" },
          { label: "大便带血", redFlag: true },
          { label: "怀孕" },
          { label: "剧烈疼痛" },
          { label: "都没有" },
        ],
      },
      {
        question: "你希望 ClareCare 做什么？",
        options: [
          { label: "提供一般建议" },
          { label: "请求医生复查", requestReview: true },
        ],
      },
    ],
  },
  medication: {
    label: "药物问题",
    steps: [
      {
        question: "你想问什么药物相关的问题？",
        options: [
          { label: "如何服药" },
          { label: "副作用" },
          { label: "漏服一次" },
          { label: "药物相互作用" },
          { label: "过敏顾虑", redFlag: true },
          { label: "其他" },
        ],
      },
      {
        question: "你知道药物名称吗？",
        options: [
          { label: "是的，我会输入", freeText: true },
          { label: "不，不确定" },
        ],
      },
      {
        question: "你想要什么？",
        options: [
          { label: "了解一般药物信息" },
          { label: "请求药剂师复查", requestPharmacist: true },
          { label: "请求医生复查", requestReview: true },
        ],
      },
    ],
  },
  "side-effect": {
    label: "副作用",
    steps: [
      {
        question: "你出现了什么副作用？",
        options: [
          { label: "皮疹" },
          { label: "头晕" },
          { label: "恶心" },
          { label: "肿胀" },
          { label: "呼吸困难", redFlag: true },
          { label: "其他" },
        ],
      },
      {
        question: "什么时候开始的？",
        options: [
          { label: "今天" },
          { label: "1–2 天前" },
          { label: "超过 3 天" },
          { label: "服药后" },
        ],
      },
      {
        question: "你有严重症状吗？",
        options: [
          { label: "呼吸困难", redFlag: true },
          { label: "脸/嘴唇肿胀", redFlag: true },
          { label: "严重皮疹", redFlag: true },
          { label: "昏倒", redFlag: true },
          { label: "都没有" },
        ],
      },
      {
        question: "你希望 ClareCare 做什么？",
        options: [
          { label: "请求药剂师复查", requestPharmacist: true },
          { label: "请求医生复查", requestReview: true },
        ],
      },
    ],
  },
  appointment: {
    label: "预约准备",
    steps: [
      {
        question: "你的预约是关于什么的？",
        options: [
          { label: "新症状" },
          { label: "复诊" },
          { label: "药物复查" },
          { label: "讨论检查结果" },
          { label: "不确定" },
        ],
      },
      {
        question: "你想准备什么？",
        options: [
          { label: "向医生提问的问题" },
          { label: "症状摘要" },
          { label: "药物清单" },
          { label: "想要提到的事情" },
          { label: "以上全部" },
        ],
      },
      {
        question: "你希望 ClareCare 帮你写一份简短的预约摘要吗？",
        options: [{ label: "好的" }, { label: "不用" }],
      },
    ],
  },
  clinician: {
    label: "请求医生复查",
    steps: [
      {
        question: "为什么希望医生复查？",
        options: [
          { label: "症状在恶化" },
          { label: "不确定该怎么做" },
          { label: "药物顾虑" },
          { label: "更想要真人帮助" },
          { label: "其他" },
        ],
      },
      {
        question: "感觉有多紧急？",
        options: [{ label: "低" }, { label: "中" }, { label: "高" }],
      },
      {
        question: "你有紧急症状吗？",
        options: [
          { label: "胸痛", redFlag: true },
          { label: "呼吸困难", redFlag: true },
          { label: "严重出血", redFlag: true },
          { label: "意识混乱", redFlag: true },
          { label: "昏倒", redFlag: true },
          { label: "都没有", requestReview: true },
        ],
      },
    ],
  },
};

// ---------- Bahasa Melayu ----------

const MS: Record<FlowKey, Flow> = {
  general: {
    label: "Soalan kesihatan umum",
    steps: [
      {
        question: "Apa yang ingin anda tanya?",
        options: [
          { label: "Saya akan menaip soalan saya", freeText: true },
          { label: "Minta semakan doktor", requestReview: true },
        ],
      },
    ],
  },
  fever: {
    label: "Demam",
    steps: [
      {
        question: "Berapa lama anda mengalami demam?",
        options: [
          { label: "Hari ini" },
          { label: "1–2 hari" },
          { label: "3 hari atau lebih" },
          { label: "Tidak pasti" },
        ],
      },
      {
        question: "Berapakah suhu badan anda?",
        options: [
          { label: "Bawah 38°C" },
          { label: "38°C–39°C" },
          { label: "Atas 39°C" },
          { label: "Belum diukur" },
        ],
      },
      {
        question: "Adakah anda mengalami simptom berikut?",
        options: [
          { label: "Susah bernafas", redFlag: true },
          { label: "Sakit dada", redFlag: true },
          { label: "Keliru", redFlag: true },
          { label: "Sakit kepala teruk" },
          { label: "Ruam" },
          { label: "Tiada satu pun" },
        ],
      },
      {
        question: "Apa yang anda mahu ClareCare lakukan?",
        options: [
          { label: "Nasihat umum" },
          { label: "Minta semakan doktor", requestReview: true },
        ],
      },
    ],
  },
  headache: {
    label: "Sakit kepala",
    steps: [
      {
        question: "Sejauh manakah teruknya sakit kepala anda?",
        options: [
          { label: "Ringan" },
          { label: "Sederhana" },
          { label: "Teruk" },
          { label: "Sakit kepala paling teruk pernah dialami", redFlag: true },
        ],
      },
      {
        question: "Bila ia bermula?",
        options: [
          { label: "Hari ini" },
          { label: "1–2 hari lalu" },
          { label: "Lebih 3 hari lalu" },
          { label: "Secara mengejut" },
        ],
      },
      {
        question: "Adakah anda mengalami simptom berikut?",
        options: [
          { label: "Perubahan penglihatan" },
          { label: "Muntah" },
          { label: "Keliru", redFlag: true },
          { label: "Lemah atau kebas", redFlag: true },
          { label: "Kecederaan kepala" },
          { label: "Tiada satu pun" },
        ],
      },
      {
        question: "Apa yang anda mahu ClareCare lakukan?",
        options: [
          { label: "Nasihat umum" },
          { label: "Minta semakan doktor", requestReview: true },
        ],
      },
    ],
  },
  cough: {
    label: "Batuk",
    steps: [
      {
        question: "Berapa lama anda batuk?",
        options: [
          { label: "Kurang 3 hari" },
          { label: "3–7 hari" },
          { label: "Lebih 1 minggu" },
          { label: "Lebih 2 minggu" },
        ],
      },
      {
        question: "Jenis batuk?",
        options: [
          { label: "Batuk kering" },
          { label: "Berkahak" },
          { label: "Berdarah", redFlag: true },
          { label: "Tidak pasti" },
        ],
      },
      {
        question: "Adakah anda mengalami simptom berikut?",
        options: [
          { label: "Demam" },
          { label: "Sakit dada", redFlag: true },
          { label: "Susah bernafas", redFlag: true },
          { label: "Darah dalam kahak", redFlag: true },
          { label: "Tiada satu pun" },
        ],
      },
      {
        question: "Apa yang anda mahu ClareCare lakukan?",
        options: [
          { label: "Nasihat umum" },
          { label: "Minta semakan doktor", requestReview: true },
        ],
      },
    ],
  },
  stomach: {
    label: "Sakit perut",
    steps: [
      {
        question: "Sejauh manakah teruknya sakit perut?",
        options: [
          { label: "Ringan" },
          { label: "Sederhana" },
          { label: "Teruk" },
          { label: "Sangat teruk" },
        ],
      },
      {
        question: "Lokasi sakit?",
        options: [
          { label: "Perut atas" },
          { label: "Perut bawah" },
          { label: "Sebelah kanan" },
          { label: "Sebelah kiri" },
          { label: "Seluruh perut" },
        ],
      },
      {
        question: "Adakah anda mengalami simptom berikut?",
        options: [
          { label: "Muntah" },
          { label: "Demam" },
          { label: "Darah dalam najis", redFlag: true },
          { label: "Kehamilan" },
          { label: "Sakit teruk" },
          { label: "Tiada satu pun" },
        ],
      },
      {
        question: "Apa yang anda mahu ClareCare lakukan?",
        options: [
          { label: "Nasihat umum" },
          { label: "Minta semakan doktor", requestReview: true },
        ],
      },
    ],
  },
  medication: {
    label: "Soalan ubat",
    steps: [
      {
        question: "Jenis soalan ubat apakah yang anda ada?",
        options: [
          { label: "Cara mengambil ubat" },
          { label: "Kesan sampingan" },
          { label: "Terlepas dos" },
          { label: "Interaksi ubat" },
          { label: "Kebimbangan alahan", redFlag: true },
          { label: "Lain-lain" },
        ],
      },
      {
        question: "Anda tahu nama ubat?",
        options: [
          { label: "Ya, saya akan menaip", freeText: true },
          { label: "Tidak pasti" },
        ],
      },
      {
        question: "Apa yang anda mahu lakukan?",
        options: [
          { label: "Tanya maklumat ubat umum" },
          { label: "Minta semakan ahli farmasi", requestPharmacist: true },
          { label: "Minta semakan doktor", requestReview: true },
        ],
      },
    ],
  },
  "side-effect": {
    label: "Kesan sampingan",
    steps: [
      {
        question: "Kesan sampingan apa yang anda alami?",
        options: [
          { label: "Ruam" },
          { label: "Pening" },
          { label: "Loya" },
          { label: "Bengkak" },
          { label: "Susah bernafas", redFlag: true },
          { label: "Lain-lain" },
        ],
      },
      {
        question: "Bila ia bermula?",
        options: [
          { label: "Hari ini" },
          { label: "1–2 hari lalu" },
          { label: "Lebih 3 hari lalu" },
          { label: "Selepas mengambil ubat" },
        ],
      },
      {
        question: "Adakah anda mengalami simptom serius?",
        options: [
          { label: "Susah bernafas", redFlag: true },
          { label: "Bengkak muka/bibir", redFlag: true },
          { label: "Ruam teruk", redFlag: true },
          { label: "Pengsan", redFlag: true },
          { label: "Tiada satu pun" },
        ],
      },
      {
        question: "Apa yang anda mahu ClareCare lakukan?",
        options: [
          { label: "Minta semakan ahli farmasi", requestPharmacist: true },
          { label: "Minta semakan doktor", requestReview: true },
        ],
      },
    ],
  },
  appointment: {
    label: "Persediaan janji temu",
    steps: [
      {
        question: "Janji temu anda berkenaan apa?",
        options: [
          { label: "Simptom baru" },
          { label: "Susulan" },
          { label: "Semakan ubat" },
          { label: "Perbincangan keputusan ujian" },
          { label: "Tidak pasti" },
        ],
      },
      {
        question: "Apa yang anda mahu sediakan?",
        options: [
          { label: "Soalan untuk doktor" },
          { label: "Ringkasan simptom" },
          { label: "Senarai ubat" },
          { label: "Perkara untuk disebut" },
          { label: "Semua di atas" },
        ],
      },
      {
        question: "Mahukah ClareCare bantu menyediakan ringkasan janji temu?",
        options: [{ label: "Ya" }, { label: "Tidak" }],
      },
    ],
  },
  clinician: {
    label: "Minta semakan doktor",
    steps: [
      {
        question: "Mengapa anda mahu semakan doktor?",
        options: [
          { label: "Simptom semakin teruk" },
          { label: "Saya tidak pasti apa nak buat" },
          { label: "Kebimbangan ubat" },
          { label: "Saya lebih suka bantuan manusia" },
          { label: "Lain-lain" },
        ],
      },
      {
        question: "Sejauh manakah ia mendesak?",
        options: [{ label: "Rendah" }, { label: "Sederhana" }, { label: "Tinggi" }],
      },
      {
        question: "Adakah anda mengalami simptom kecemasan?",
        options: [
          { label: "Sakit dada", redFlag: true },
          { label: "Susah bernafas", redFlag: true },
          { label: "Pendarahan teruk", redFlag: true },
          { label: "Keliru", redFlag: true },
          { label: "Pengsan", redFlag: true },
          { label: "Tiada satu pun", requestReview: true },
        ],
      },
    ],
  },
};

export const FLOWS: Record<Lang, Record<FlowKey, Flow>> = { en: EN, zh: ZH, ms: MS };

export const FLOW_ORDER: FlowKey[] = [
  "general",
  "fever",
  "headache",
  "cough",
  "stomach",
  "medication",
  "side-effect",
  "appointment",
  "clinician",
];

export const RED_FLAG_MESSAGE: Record<Lang, string> = {
  en: "This may need urgent medical attention. A clinician review has been flagged. If symptoms are severe or worsening, please call 999 or seek emergency care immediately.",
  zh: "这可能需要紧急医疗处理。已为你提交医生复查。如果症状严重或正在恶化，请立即拨打 999 或前往急诊。",
  ms: "Ini mungkin memerlukan perhatian perubatan segera. Permintaan semakan doktor telah dihantar. Jika simptom teruk atau semakin teruk, sila hubungi 999 atau dapatkan rawatan kecemasan dengan segera.",
};

export const REVIEW_REQUESTED_MESSAGE: Record<Lang, string> = {
  en: "Thanks — a clinician will review your case and follow up with you shortly.",
  zh: "谢谢 — 医生会复查你的情况并尽快与你联系。",
  ms: "Terima kasih — doktor akan menyemak kes anda dan menghubungi anda tidak lama lagi.",
};

export const PHARMACIST_REQUESTED_MESSAGE: Record<Lang, string> = {
  en: "Thanks — a pharmacist will review your medication question and follow up shortly.",
  zh: "谢谢 — 药剂师会复查你的药物问题并尽快与你联系。",
  ms: "Terima kasih — ahli farmasi akan menyemak soalan ubat anda dan menghubungi anda tidak lama lagi.",
};

export const FREETEXT_PROMPT: Record<Lang, string> = {
  en: "Please type your details in the message box below and press send.",
  zh: "请在下方输入框中输入详细内容，然后点击发送。",
  ms: "Sila taip butiran anda dalam kotak mesej di bawah dan tekan hantar.",
};

export const FLOW_DONE_LABEL: Record<Lang, string> = {
  en: "Here is a summary of what you shared:",
  zh: "以下是你分享的内容摘要：",
  ms: "Berikut ringkasan maklumat yang anda kongsi:",
};
