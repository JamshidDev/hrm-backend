// HR enums — Laravel /api/v1/hr/enums (HRController::enums) ekvivalenti.
// Bu fayl auto-generated (Laravel response'idan). Har enum 3 til uchun mavjud.
// Languages va roles — DB'dan keladi (constants emas).

export type Lang = "uz" | "ru" | "en";

export interface EnumItem {
  id: number | string;
  name: string;
}

export interface EnumsByLang {
  uz: EnumItem[];
  ru: EnumItem[];
  en: EnumItem[];
}

export const ACADEMIC_TITLES: EnumsByLang = {
  "uz": [
    {
      "id": 1,
      "name": "Dotsent"
    },
    {
      "id": 2,
      "name": "Professor"
    },
    {
      "id": 3,
      "name": "Katta ilmiy xodim"
    },
    {
      "id": 4,
      "name": "Akademik"
    }
  ],
  "ru": [
    {
      "id": 1,
      "name": "Доцент"
    },
    {
      "id": 2,
      "name": "Профессор"
    },
    {
      "id": 3,
      "name": "Старший научный сотрудник"
    },
    {
      "id": 4,
      "name": "Академик"
    }
  ],
  "en": [
    {
      "id": 1,
      "name": "Associate Professor"
    },
    {
      "id": 2,
      "name": "Professor"
    },
    {
      "id": 3,
      "name": "Senior Researcher"
    },
    {
      "id": 4,
      "name": "Academician"
    }
  ]
};

export const ACADEMIC_DEGREES: EnumsByLang = {
  "uz": [
    {
      "id": 1,
      "name": "Fan doktori"
    },
    {
      "id": 2,
      "name": "Fan nomzodi"
    },
    {
      "id": 3,
      "name": "Fan doktori (DSc)"
    },
    {
      "id": 4,
      "name": "Fan nomzodi (PhD)"
    }
  ],
  "ru": [
    {
      "id": 1,
      "name": "Доктор наук"
    },
    {
      "id": 2,
      "name": "Кандидат наук"
    },
    {
      "id": 3,
      "name": "Доктор наук (DSc)"
    },
    {
      "id": 4,
      "name": "Доктор философии (PhD)"
    }
  ],
  "en": [
    {
      "id": 1,
      "name": "Doctor of Science"
    },
    {
      "id": 2,
      "name": "Candidate of Science"
    },
    {
      "id": 3,
      "name": "Doctor of Science (DSc)"
    },
    {
      "id": 4,
      "name": "Doctor of Philosophy (PhD)"
    }
  ]
};

export const PARTIES: EnumsByLang = {
  "uz": [
    {
      "id": 2,
      "name": "Xalq demokratik partiyasi"
    },
    {
      "id": 3,
      "name": "OʻzLiDeP partiyasi"
    },
    {
      "id": 4,
      "name": "Adolat partiyasi"
    },
    {
      "id": 5,
      "name": "Milliy tiklanish partiyasi"
    }
  ],
  "ru": [
    {
      "id": 2,
      "name": "Народно-демократическая партия"
    },
    {
      "id": 3,
      "name": "Партия УзЛиДеП"
    },
    {
      "id": 4,
      "name": "Партия Адолат"
    },
    {
      "id": 5,
      "name": "Партия Миллий Тикланиш"
    }
  ],
  "en": [
    {
      "id": 2,
      "name": "People's Democratic Party"
    },
    {
      "id": 3,
      "name": "UzLiDeP Party"
    },
    {
      "id": 4,
      "name": "Adolat Party"
    },
    {
      "id": 5,
      "name": "Milliy Tiklanish Party"
    }
  ]
};

export const PROBATION_LIST: EnumsByLang = {
  "uz": [
    {
      "id": 1,
      "name": "1 oylik"
    },
    {
      "id": 2,
      "name": "2 oylik"
    },
    {
      "id": 3,
      "name": "3 oylik"
    },
    {
      "id": 4,
      "name": "4 oylik"
    },
    {
      "id": 5,
      "name": "5 oylik"
    },
    {
      "id": 6,
      "name": "6 oylik"
    }
  ],
  "ru": [
    {
      "id": 1,
      "name": "1 месяц"
    },
    {
      "id": 2,
      "name": "2 месяца"
    },
    {
      "id": 3,
      "name": "3 месяца"
    },
    {
      "id": 4,
      "name": "4 месяца"
    },
    {
      "id": 5,
      "name": "5 месяцев"
    },
    {
      "id": 6,
      "name": "6 месяцев"
    }
  ],
  "en": [
    {
      "id": 1,
      "name": "1 month"
    },
    {
      "id": 2,
      "name": "2 months"
    },
    {
      "id": 3,
      "name": "3 months"
    },
    {
      "id": 4,
      "name": "4 months"
    },
    {
      "id": 5,
      "name": "5 months"
    },
    {
      "id": 6,
      "name": "6 months"
    }
  ]
};

export const RELATIVES: EnumsByLang = {
  "uz": [
    {
      "id": 1,
      "name": "Otasi"
    },
    {
      "id": 2,
      "name": "Onasi"
    },
    {
      "id": 3,
      "name": "Akasi"
    },
    {
      "id": 4,
      "name": "Opasi"
    },
    {
      "id": 5,
      "name": "Turmush o'rtog'i"
    },
    {
      "id": 6,
      "name": "Ukasi"
    },
    {
      "id": 7,
      "name": "Singlisi"
    },
    {
      "id": 8,
      "name": "O'g'li"
    },
    {
      "id": 9,
      "name": "Qizi"
    },
    {
      "id": 10,
      "name": "Qaynotasi"
    },
    {
      "id": 11,
      "name": "Qaynonasi"
    },
    {
      "id": 12,
      "name": "Qaynakasi"
    },
    {
      "id": 13,
      "name": "Qaynopasi"
    },
    {
      "id": 14,
      "name": "Qaynukasi"
    },
    {
      "id": 15,
      "name": "Qaynsingli"
    }
  ],
  "ru": [
    {
      "id": 1,
      "name": "Отец"
    },
    {
      "id": 2,
      "name": "Мать"
    },
    {
      "id": 3,
      "name": "Старший брат"
    },
    {
      "id": 4,
      "name": "Старшая сестра"
    },
    {
      "id": 5,
      "name": "Супруг(а)"
    },
    {
      "id": 6,
      "name": "Младший брат"
    },
    {
      "id": 7,
      "name": "Младшая сестра"
    },
    {
      "id": 8,
      "name": "Сын"
    },
    {
      "id": 9,
      "name": "Дочь"
    },
    {
      "id": 10,
      "name": "Тесть / Свёкор"
    },
    {
      "id": 11,
      "name": "Тёща / Свекровь"
    },
    {
      "id": 12,
      "name": "Брат (мужа/жены)"
    },
    {
      "id": 13,
      "name": "Сестра (мужа/жены)"
    },
    {
      "id": 14,
      "name": "мл.Брат (мужа/жены)"
    },
    {
      "id": 15,
      "name": "мл.Сестра (мужа/жены)"
    }
  ],
  "en": [
    {
      "id": 1,
      "name": "Father"
    },
    {
      "id": 2,
      "name": "Mother"
    },
    {
      "id": 3,
      "name": "Older brother"
    },
    {
      "id": 4,
      "name": "Older sister"
    },
    {
      "id": 5,
      "name": "Spouse"
    },
    {
      "id": 6,
      "name": "Younger brother"
    },
    {
      "id": 7,
      "name": "Younger sister"
    },
    {
      "id": 8,
      "name": "Son"
    },
    {
      "id": 9,
      "name": "Daughter"
    },
    {
      "id": 10,
      "name": "Father-in-law"
    },
    {
      "id": 11,
      "name": "Mother-in-law"
    },
    {
      "id": 12,
      "name": "Brother (husband's/wife's)"
    },
    {
      "id": 13,
      "name": "Sister (husband's/wife's)"
    },
    {
      "id": 14,
      "name": "young. Brother (husband's/wife's)"
    },
    {
      "id": 15,
      "name": "young. Sister (husband's/wife's)"
    }
  ]
};

export const MARITAL_STATUSES: EnumsByLang = {
  "uz": [
    {
      "id": 1,
      "name": "Turmush qurmagan"
    },
    {
      "id": 2,
      "name": "Uylangan / Turmushga chiqqan"
    },
    {
      "id": 3,
      "name": "Ajrashgan"
    }
  ],
  "ru": [
    {
      "id": 1,
      "name": "Не женат / Не замужем"
    },
    {
      "id": 2,
      "name": "Женат / Замужем"
    },
    {
      "id": 3,
      "name": "Разведён / Разведена"
    }
  ],
  "en": [
    {
      "id": 1,
      "name": "Single"
    },
    {
      "id": 2,
      "name": "Married"
    },
    {
      "id": 3,
      "name": "Divorced"
    }
  ]
};

export const MILITARY_STATUSES: EnumsByLang = {
  "uz": [
    {
      "id": 1,
      "name": "Yaroqli"
    },
    {
      "id": 2,
      "name": "Yaroqsiz"
    },
    {
      "id": 3,
      "name": "O‘tamagan"
    }
  ],
  "ru": [
    {
      "id": 1,
      "name": "Годен к службе"
    },
    {
      "id": 2,
      "name": "Не годен к службе"
    },
    {
      "id": 3,
      "name": "Не служил"
    }
  ],
  "en": [
    {
      "id": 1,
      "name": "Fit for service"
    },
    {
      "id": 2,
      "name": "Unfit for service"
    },
    {
      "id": 3,
      "name": "Not served"
    }
  ]
};

export const CONFIRMATION_WORKER: EnumsByLang = {
  "uz": [
    {
      "id": 1,
      "name": "Rahbar"
    },
    {
      "id": 2,
      "name": "Tasdiqlovchi"
    }
  ],
  "ru": [
    {
      "id": 1,
      "name": "Руководитель"
    },
    {
      "id": 2,
      "name": "Утверждающий"
    }
  ],
  "en": [
    {
      "id": 1,
      "name": "Leader"
    },
    {
      "id": 2,
      "name": "Confirmatory"
    }
  ]
};

export const CONTRACT_APPLICATION_TYPES: EnumsByLang = {
  "uz": [
    {
      "id": 1,
      "name": "Nomuayyan"
    },
    {
      "id": 6,
      "name": "Muayyan"
    },
    {
      "id": 3,
      "name": "O'rindosh"
    }
  ],
  "ru": [
    {
      "id": 1,
      "name": "Бессрочный"
    },
    {
      "id": 6,
      "name": "Срочный"
    },
    {
      "id": 3,
      "name": "Совместитель"
    }
  ],
  "en": [
    {
      "id": 1,
      "name": "Indefinite"
    },
    {
      "id": 6,
      "name": "Fixed-term"
    },
    {
      "id": 3,
      "name": "Part-time"
    }
  ]
};

export const CREATE_APPLICATION_TYPES: EnumsByLang = {
  "uz": [
    {
      "id": 1,
      "name": "Doimiy ishga kirish yuzasidan"
    },
    {
      "id": 2,
      "name": "Muddatli ishga kirish yuzasidan"
    },
    {
      "id": 3,
      "name": "Navbatdan oldin yillik mehnat taʼtili berish yuzasidan ariza"
    },
    {
      "id": 4,
      "name": "Ish haqi saqlanmagan holda taʼtil berish toʻgʻrisida"
    },
    {
      "id": 5,
      "name": "Ish haqi qisman saqlangan holda taʼtil berish toʻgʻrisida"
    },
    {
      "id": 6,
      "name": "Boshqa ishga oʻtkazish toʻgʻrisida"
    },
    {
      "id": 7,
      "name": "Boshqa ishga oʻtkazishga rozilik toʻgʻrisida"
    },
    {
      "id": 8,
      "name": "O‘quv ta’tilini berish toʻgʻrisida"
    },
    {
      "id": 9,
      "name": "Moddiy yordam berish toʻgʻrisida"
    },
    {
      "id": 10,
      "name": "Mehnat shartnomasini bekor qilish toʻgʻrisida"
    }
  ],
  "ru": [
    {
      "id": 1,
      "name": "О приеме на постоянную работу"
    },
    {
      "id": 2,
      "name": "О приеме на работу на определенный срок"
    },
    {
      "id": 3,
      "name": "Заявление на досрочный ежегодный отпуск"
    },
    {
      "id": 4,
      "name": "Заявление на отпуск без сохранения заработной платы"
    },
    {
      "id": 5,
      "name": "Заявление на частично оплачиваемый отпуск"
    },
    {
      "id": 6,
      "name": "Заявление о переводе на другую работу"
    },
    {
      "id": 7,
      "name": "Согласие на перевод на другую работу"
    },
    {
      "id": 8,
      "name": "Заявление на учебный отпуск"
    },
    {
      "id": 9,
      "name": "Заявление о предоставлении материальной помощи"
    },
    {
      "id": 10,
      "name": "Заявление о расторжении трудового договора"
    }
  ],
  "en": [
    {
      "id": 1,
      "name": "Regarding permanent employment"
    },
    {
      "id": 2,
      "name": "Regarding fixed-term employment"
    },
    {
      "id": 3,
      "name": "Application for early annual leave"
    },
    {
      "id": 4,
      "name": "Request for unpaid leave"
    },
    {
      "id": 5,
      "name": "Request for partially paid leave"
    },
    {
      "id": 6,
      "name": "Request for transfer to another job"
    },
    {
      "id": 7,
      "name": "Consent for transfer to another job"
    },
    {
      "id": 8,
      "name": "Request for study leave"
    },
    {
      "id": 9,
      "name": "Request for financial assistance"
    },
    {
      "id": 10,
      "name": "Request for termination of employment contract"
    }
  ]
};

export const STAFF_CATEGORIES: EnumsByLang = {
  "uz": [
    {
      "id": 1,
      "name": "Ma’muriy-boshqaruv xodimlari"
    },
    {
      "id": 2,
      "name": "Boshqaruv xodimlari"
    },
    {
      "id": 3,
      "name": "Muhandis-texnik xodimlar"
    },
    {
      "id": 4,
      "name": "Ishlab chiqarish xodimlari"
    },
    {
      "id": 5,
      "name": "Xizmat ko‘rsatuvchi xodimlar"
    }
  ],
  "ru": [
    {
      "id": 1,
      "name": "Административно-управленческий персонал"
    },
    {
      "id": 2,
      "name": "Управленческий персонал"
    },
    {
      "id": 3,
      "name": "Инженерно-технические работники"
    },
    {
      "id": 4,
      "name": "Производственный персонал"
    },
    {
      "id": 5,
      "name": "Обслуживающий персонал"
    }
  ],
  "en": [
    {
      "id": 1,
      "name": "Administrative and managerial staff"
    },
    {
      "id": 2,
      "name": "Management staff"
    },
    {
      "id": 3,
      "name": "Engineering and technical workers"
    },
    {
      "id": 4,
      "name": "Production staff"
    },
    {
      "id": 5,
      "name": "Service staff"
    }
  ]
};

export const VACATION_ADDITIONAL: EnumsByLang = {
  "uz": [
    {
      "id": 1,
      "name": "Bitta tashkilotda yoki tarmoqda ko‘p yillik ish staji uchun"
    },
    {
      "id": 2,
      "name": "12 yoshga to'lmagan 2 va undan ortiq farzandi borligi uchun"
    },
    {
      "id": 3,
      "name": "16 yoshga to‘lmagan nogironligi bo‘lgan farzandi borligi uchun"
    },
    {
      "id": 4,
      "name": "Noqulay mehnat sharoitlaridagi ish uchun"
    },
    {
      "id": 5,
      "name": "Noqulay tabiiy-iqlim sharoitlaridagi ish uchun"
    },
    {
      "id": 6,
      "name": "Donorlarga beriladigan dam olish kuni"
    }
  ],
  "ru": [
    {
      "id": 1,
      "name": "Bitta tashkilotda yoki tarmoqda ko‘p yillik ish staji uchun"
    },
    {
      "id": 2,
      "name": "12 yoshga to'lmagan 2 va undan ortiq farzandi borligi uchun"
    },
    {
      "id": 3,
      "name": "16 yoshga to‘lmagan nogironligi bo‘lgan farzandi borligi uchun"
    },
    {
      "id": 4,
      "name": "Noqulay mehnat sharoitlaridagi ish uchun"
    },
    {
      "id": 5,
      "name": "Noqulay tabiiy-iqlim sharoitlaridagi ish uchun"
    },
    {
      "id": 6,
      "name": "Donorlarga beriladigan dam olish kuni"
    }
  ],
  "en": [
    {
      "id": 1,
      "name": "Bitta tashkilotda yoki tarmoqda ko‘p yillik ish staji uchun"
    },
    {
      "id": 2,
      "name": "12 yoshga to'lmagan 2 va undan ortiq farzandi borligi uchun"
    },
    {
      "id": 3,
      "name": "16 yoshga to‘lmagan nogironligi bo‘lgan farzandi borligi uchun"
    },
    {
      "id": 4,
      "name": "Noqulay mehnat sharoitlaridagi ish uchun"
    },
    {
      "id": 5,
      "name": "Noqulay tabiiy-iqlim sharoitlaridagi ish uchun"
    },
    {
      "id": 6,
      "name": "Donorlarga beriladigan dam olish kuni"
    }
  ]
};

export const FINISHED_COMMAND_TYPES: EnumsByLang = {
  "uz": [
    {
      "id": 1,
      "name": "Birinchi marta pensiyaga chiqishi munosabati bilan bir martalik pul mukofoti"
    },
    {
      "id": 2,
      "name": "Ishlab berilmagan kunlari uchun ish haqidan ushlab qolish"
    },
    {
      "id": 3,
      "name": "Foydalanilmagan mehnat ta'tillari uchun pulli kompensatsiya to‘lash"
    }
  ],
  "ru": [
    {
      "id": 1,
      "name": "Единовременная денежная премия в связи с первым выходом на пенсию"
    },
    {
      "id": 2,
      "name": "Вычет из зарплаты за неотработанные дни"
    },
    {
      "id": 3,
      "name": "Выплата денежной компенсации за неиспользованный трудовой отпуск"
    }
  ],
  "en": [
    {
      "id": 1,
      "name": "One-time monetary award for the first-time retirement"
    },
    {
      "id": 2,
      "name": "Deduction from salary for unworked days"
    },
    {
      "id": 3,
      "name": "Payment of monetary compensation for unused leave days"
    }
  ]
};

export const MED_STATUSES: EnumsByLang = {
  "uz": [
    {
      "id": 1,
      "name": "Sog'lom"
    },
    {
      "id": 2,
      "name": "Nosog'lom"
    }
  ],
  "ru": [
    {
      "id": 1,
      "name": "Годен"
    },
    {
      "id": 2,
      "name": "Негоден"
    }
  ],
  "en": [
    {
      "id": 1,
      "name": "Healthy"
    },
    {
      "id": 2,
      "name": "Unhealthy"
    }
  ]
};

export const ORGANIZATION_DOCUMENT_TYPES: EnumsByLang = {
  "uz": [
    {
      "id": 1,
      "name": "Buyruq"
    },
    {
      "id": 2,
      "name": "Nizom"
    },
    {
      "id": 3,
      "name": "Boshqa turdagi hujjatlar"
    }
  ],
  "ru": [
    {
      "id": 1,
      "name": "Приказ"
    },
    {
      "id": 2,
      "name": "Положение"
    },
    {
      "id": 3,
      "name": "Другие виды документов"
    }
  ],
  "en": [
    {
      "id": 1,
      "name": "Order"
    },
    {
      "id": 2,
      "name": "Regulation"
    },
    {
      "id": 3,
      "name": "Other types of documents"
    }
  ]
};

export const GIFT_TYPES: EnumsByLang = {
  "uz": [
    {
      "id": 1,
      "name": "Pul mukofoti"
    },
    {
      "id": 2,
      "name": "“Faxriy” yorliq"
    },
    {
      "id": 3,
      "name": "“Qimmatbaho” sovg‘a"
    },
    {
      "id": 4,
      "name": "“Faxriy temiryo'lchi”"
    },
    {
      "id": 5,
      "name": "Boshqa"
    }
  ],
  "ru": [
    {
      "id": 1,
      "name": "Денежная премия"
    },
    {
      "id": 2,
      "name": "Почётная грамота"
    },
    {
      "id": 3,
      "name": "Ценный подарок"
    },
    {
      "id": 4,
      "name": "“Faxriy temiryo'lchi”"
    },
    {
      "id": 5,
      "name": "Другое"
    }
  ],
  "en": [
    {
      "id": 1,
      "name": "Cash Reward"
    },
    {
      "id": 2,
      "name": "Honorary Certificate"
    },
    {
      "id": 3,
      "name": "Valuable Gift"
    },
    {
      "id": 4,
      "name": "“Faxriy temiryo'lchi”"
    },
    {
      "id": 5,
      "name": "Other"
    }
  ]
};

export const FINE_TYPES: EnumsByLang = {
  "uz": [
    {
      "id": 1,
      "name": "Hayfsan"
    },
    {
      "id": 2,
      "name": "Boshqa"
    }
  ],
  "ru": [
    {
      "id": 1,
      "name": "Выговор"
    },
    {
      "id": 2,
      "name": "Другое"
    }
  ],
  "en": [
    {
      "id": 1,
      "name": "Reprimand"
    },
    {
      "id": 2,
      "name": "Other"
    }
  ]
};

export const FINANCIAL_ASSISTANCE: EnumsByLang = {
  "uz": [
    {
      "id": 1,
      "name": "Mehnatga haq to‘lashning eng kam miqdori"
    },
    {
      "id": 2,
      "name": "Uzluksiz ish stajiga bog‘liq ravishda"
    }
  ],
  "ru": [
    {
      "id": 1,
      "name": "Минимальный размер оплаты труда"
    },
    {
      "id": 2,
      "name": "В зависимости от непрерывного трудового стажа"
    }
  ],
  "en": [
    {
      "id": 1,
      "name": "Minimum Wage"
    },
    {
      "id": 2,
      "name": "Based on Continuous Work Experience"
    }
  ]
};

export const VACATION_TYPES: EnumsByLang = {
  "uz": [
    {
      "id": 1,
      "name": "Mehnat ta'tili"
    },
    {
      "id": 2,
      "name": "Homiladorlik va tug'ish ta'tili"
    },
    {
      "id": 3,
      "name": "Bolani parvarishlash ta'tili"
    },
    {
      "id": 4,
      "name": "O'quv ta'tili"
    },
    {
      "id": 5,
      "name": "Ijodiy ta'tili"
    },
    {
      "id": 6,
      "name": "Ish haqi saqlanmaydigan ta'til"
    },
    {
      "id": 7,
      "name": "Ish haqi qisman saqlanadigan ta'til"
    },
    {
      "id": 8,
      "name": "Boshqa turdagi ta'til"
    }
  ],
  "ru": [
    {
      "id": 1,
      "name": "Трудовой отпуск"
    },
    {
      "id": 2,
      "name": "Отпуск по беременности и родам"
    },
    {
      "id": 3,
      "name": "Отпуск по уходу за ребенком"
    },
    {
      "id": 4,
      "name": "Учебный отпуск"
    },
    {
      "id": 5,
      "name": "Творческий отпуск"
    },
    {
      "id": 6,
      "name": "Отпуск без сохранения заработной платы"
    },
    {
      "id": 7,
      "name": "Отпуск с частичным сохранением заработной платы"
    },
    {
      "id": 8,
      "name": "Другой вид отпуска"
    }
  ],
  "en": [
    {
      "id": 1,
      "name": "Paid vacation"
    },
    {
      "id": 2,
      "name": "Maternity leave"
    },
    {
      "id": 3,
      "name": "Childcare leave"
    },
    {
      "id": 4,
      "name": "Study leave"
    },
    {
      "id": 5,
      "name": "Creative leave"
    },
    {
      "id": 6,
      "name": "Unpaid leave"
    },
    {
      "id": 7,
      "name": "Partially paid leave"
    },
    {
      "id": 8,
      "name": "Other type of leave"
    }
  ]
};

export const VACANCY_FILE_TYPES: EnumsByLang = {
  "uz": [
    {
      "id": 1,
      "name": "Bilim yurti diplom nusxasi"
    },
    {
      "id": 2,
      "name": "Ma'lumotnoma yoki Rezyume (imzolangan holda yuklansin)"
    },
    {
      "id": 3,
      "name": "Qo'shimcha sertifikatlar (agar mavjud bo'lsa)"
    }
  ],
  "ru": [
    {
      "id": 1,
      "name": "Копия диплома учебного заведения"
    },
    {
      "id": 2,
      "name": "Справка или резюме (загрузить с подписью)"
    },
    {
      "id": 3,
      "name": "Дополнительные сертификаты (если имеются)"
    }
  ],
  "en": [
    {
      "id": 1,
      "name": "Copy of diploma"
    },
    {
      "id": 2,
      "name": "Reference letter or resume (must be uploaded signed)"
    },
    {
      "id": 3,
      "name": "Additional certificates (if available)"
    }
  ]
};

export const RANKS: EnumsByLang = {
  "uz": [
    {
      "id": "1",
      "name": "1"
    },
    {
      "id": "2",
      "name": "2"
    },
    {
      "id": "3",
      "name": "3"
    },
    {
      "id": "4",
      "name": "4"
    },
    {
      "id": "4x",
      "name": "4x"
    },
    {
      "id": "5",
      "name": "5"
    },
    {
      "id": "6",
      "name": "6"
    },
    {
      "id": "7",
      "name": "7"
    },
    {
      "id": "8",
      "name": "8"
    },
    {
      "id": "9",
      "name": "9"
    },
    {
      "id": "10",
      "name": "10"
    },
    {
      "id": "10x",
      "name": "10x"
    },
    {
      "id": "11",
      "name": "11"
    },
    {
      "id": "12",
      "name": "12"
    },
    {
      "id": "12x",
      "name": "12x"
    },
    {
      "id": "13",
      "name": "13"
    },
    {
      "id": "14",
      "name": "14"
    },
    {
      "id": "15",
      "name": "15"
    },
    {
      "id": "15x",
      "name": "15x"
    },
    {
      "id": "16",
      "name": "16"
    },
    {
      "id": "17",
      "name": "17"
    },
    {
      "id": "18",
      "name": "18"
    }
  ],
  "ru": [
    {
      "id": "1",
      "name": "1"
    },
    {
      "id": "2",
      "name": "2"
    },
    {
      "id": "3",
      "name": "3"
    },
    {
      "id": "4",
      "name": "4"
    },
    {
      "id": "4x",
      "name": "4x"
    },
    {
      "id": "5",
      "name": "5"
    },
    {
      "id": "6",
      "name": "6"
    },
    {
      "id": "7",
      "name": "7"
    },
    {
      "id": "8",
      "name": "8"
    },
    {
      "id": "9",
      "name": "9"
    },
    {
      "id": "10",
      "name": "10"
    },
    {
      "id": "10x",
      "name": "10x"
    },
    {
      "id": "11",
      "name": "11"
    },
    {
      "id": "12",
      "name": "12"
    },
    {
      "id": "12x",
      "name": "12x"
    },
    {
      "id": "13",
      "name": "13"
    },
    {
      "id": "14",
      "name": "14"
    },
    {
      "id": "15",
      "name": "15"
    },
    {
      "id": "15x",
      "name": "15x"
    },
    {
      "id": "16",
      "name": "16"
    },
    {
      "id": "17",
      "name": "17"
    },
    {
      "id": "18",
      "name": "18"
    }
  ],
  "en": [
    {
      "id": "1",
      "name": "1"
    },
    {
      "id": "2",
      "name": "2"
    },
    {
      "id": "3",
      "name": "3"
    },
    {
      "id": "4",
      "name": "4"
    },
    {
      "id": "4x",
      "name": "4x"
    },
    {
      "id": "5",
      "name": "5"
    },
    {
      "id": "6",
      "name": "6"
    },
    {
      "id": "7",
      "name": "7"
    },
    {
      "id": "8",
      "name": "8"
    },
    {
      "id": "9",
      "name": "9"
    },
    {
      "id": "10",
      "name": "10"
    },
    {
      "id": "10x",
      "name": "10x"
    },
    {
      "id": "11",
      "name": "11"
    },
    {
      "id": "12",
      "name": "12"
    },
    {
      "id": "12x",
      "name": "12x"
    },
    {
      "id": "13",
      "name": "13"
    },
    {
      "id": "14",
      "name": "14"
    },
    {
      "id": "15",
      "name": "15"
    },
    {
      "id": "15x",
      "name": "15x"
    },
    {
      "id": "16",
      "name": "16"
    },
    {
      "id": "17",
      "name": "17"
    },
    {
      "id": "18",
      "name": "18"
    }
  ]
};

export const GROUPS: EnumsByLang = {
  "uz": [
    {
      "id": 0,
      "name": "0г"
    },
    {
      "id": 1,
      "name": "1г"
    },
    {
      "id": 2,
      "name": "2г"
    },
    {
      "id": 3,
      "name": "3г"
    }
  ],
  "ru": [
    {
      "id": 0,
      "name": "0г"
    },
    {
      "id": 1,
      "name": "1г"
    },
    {
      "id": 2,
      "name": "2г"
    },
    {
      "id": 3,
      "name": "3г"
    }
  ],
  "en": [
    {
      "id": 0,
      "name": "0г"
    },
    {
      "id": 1,
      "name": "1г"
    },
    {
      "id": 2,
      "name": "2г"
    },
    {
      "id": 3,
      "name": "3г"
    }
  ]
};

export const WORK_TYPES: EnumsByLang = {
  "uz": [
    {
      "id": 1,
      "name": "To'liq"
    }
  ],
  "ru": [
    {
      "id": 1,
      "name": "To'liq"
    }
  ],
  "en": [
    {
      "id": 1,
      "name": "To'liq"
    }
  ]
};

export const ROLES: EnumsByLang = {
  "uz": [
    {
      "id": "Worker",
      "name": "Ishchi xodim"
    },
    {
      "id": "HR",
      "name": "HR"
    },
    {
      "id": "Finance",
      "name": "Buxgalter"
    },
    {
      "id": "Jurist",
      "name": "Yurist"
    },
    {
      "id": "Economist",
      "name": "Iqtisodchi"
    },
    {
      "id": "HrLeader",
      "name": "HR rahbari"
    },
    {
      "id": "EconomistLeader",
      "name": "Iqtisodchi rahbari"
    },
    {
      "id": "Hospital",
      "name": "Poliklinika xodimi"
    },
    {
      "id": "TurnstileViewer",
      "name": "Turniket ko'ruvchi"
    },
    {
      "id": "TurnstileLeader",
      "name": "Turniket Leader"
    }
  ],
  "ru": [
    {
      "id": "Worker",
      "name": "Рабочий сотрудник"
    },
    {
      "id": "HR",
      "name": "HR"
    },
    {
      "id": "Finance",
      "name": "Бухгалтер"
    },
    {
      "id": "Jurist",
      "name": "Юрист"
    },
    {
      "id": "Economist",
      "name": "Экономист"
    },
    {
      "id": "HrLeader",
      "name": "Руководитель HR"
    },
    {
      "id": "EconomistLeader",
      "name": "Руководитель экономистов"
    },
    {
      "id": "Hospital",
      "name": "Сотрудник поликлиники"
    },
    {
      "id": "TurnstileViewer",
      "name": "Турникет Зритель"
    },
    {
      "id": "TurnstileLeader",
      "name": "Турникет Лидер"
    }
  ],
  "en": [
    {
      "id": "Worker",
      "name": "Worker"
    },
    {
      "id": "HR",
      "name": "HR"
    },
    {
      "id": "Finance",
      "name": "Accountant"
    },
    {
      "id": "Jurist",
      "name": "Lawyer"
    },
    {
      "id": "Economist",
      "name": "Economist"
    },
    {
      "id": "HrLeader",
      "name": "HR Manager"
    },
    {
      "id": "EconomistLeader",
      "name": "Chief Economist"
    },
    {
      "id": "Hospital",
      "name": "Polyclinic employee"
    },
    {
      "id": "TurnstileViewer",
      "name": "Turnstile viewer"
    },
    {
      "id": "TurnstileLeader",
      "name": "Turnstile Leader"
    }
  ]
};

// command_additional — Laravel's nested dict format, returned as-is per lang.
export const COMMAND_ADDITIONAL: { uz: object; ru: object; en: object } = {
  "uz": {
    "delete_additional": {
      "pension_count": "Birinchi marta pensiyaga chiqish (Oylik maoshidan ko'paytma)",
      "pension_coefficient": "Birinchi marta pensiyaga chiqish (Oylik maoshidan foiz)",
      "salary_withholding": "Ish haqidan ushlab qolish",
      "compensation": "Kompensatsiya to‘lash"
    }
  },
  "ru": {
    "delete_additional": {
      "pension_count": "Первичный выход на пенсию (надбавка от месячной зарплаты)",
      "pension_coefficient": "Первичный выход на пенсию (процент от месячной зарплаты)",
      "salary_withholding": "Удержание из заработной платы",
      "compensation": "Выплата компенсации"
    }
  },
  "en": {
    "delete_additional": {
      "pension_count": "First-time retirement (multiplier from monthly salary)",
      "pension_coefficient": "First-time retirement (percentage from monthly salary)",
      "salary_withholding": "Salary withholding",
      "compensation": "Compensation payment"
    }
  }
};
