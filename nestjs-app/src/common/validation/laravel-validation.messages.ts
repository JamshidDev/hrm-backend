// Laravel validation xabarlari — bayt-bayt parity uchun lang/{uz,ru,en}/validation.php
// dan AYNAN ko'chirilgan (jingalak apostrof ' va boshqa unicode belgilar saqlangan).
// GENERATED — qo'lda tahrirlamang; Laravel lang fayllari o'zgarsa qayta ajrating.
//
// `:attribute`, `:date`, `:min`, `:max` placeholderlari runtime'da almashtiriladi.

export type ValLang = 'uz' | 'ru' | 'en';

// Rule shablonlari (min/max — numeric va string variantlari alohida).
export const VALIDATION_RULES: Record<ValLang, Record<string, string>> = {
  uz: {
    required: ':attribute maydoni to‘ldirilishi shart.',
    string: ':attribute qator bo‘lishi kerak.',
    integer: ':attribute butun son bo‘lishi kerak.',
    numeric: ':attribute son bo‘lishi kerak.',
    date: ':attribute sana emas.',
    array: ':attribute qatordan iborat bo‘lishi kerak.',
    boolean: ':attribute maydoni faqat mantiqiy qiymatni qabul qiladi.',
    in: ':attribute uchun tanlangan qiymat xato.',
    email: ':attribute haqiqiy elektron pochta manzili bo‘lishi kerak.',
    after_or_equal:
      ':attribute da sana :date ga teng yoki undan keyin bo‘lishi kerak.',
    min_numeric: ':attribute ning qiymati :min dan kam bo‘lmasligi kerak.',
    max_numeric: ':attribute ning qiymati :max dan oshmasligi kerak.',
    min_string:
      ':attribute dagi belgilar soni :min tadan kam bo‘lmasligi kerak.',
    max_string: ':attribute ning belgilar soni :max tadan oshmasligi kerak.',
    same: ':attribute ning qiymati :other bilan bir xil bo‘lishi kerak.',
  },
  ru: {
    required: 'Поле :attribute обязательно.',
    string: 'Значение поля :attribute должно быть строкой.',
    integer: 'Значение поля :attribute должно быть целым числом.',
    numeric: 'Значение поля :attribute должно быть числом.',
    date: 'Значение поля :attribute должно быть корректной датой.',
    array: 'Значение поля :attribute должно быть массивом.',
    boolean: 'Значение поля :attribute должно быть логического типа.',
    in: 'Значение поля :attribute отсутствует в списке разрешённых.',
    email:
      'Значение поля :attribute должно быть действительным электронным адресом.',
    after_or_equal:
      'Значение поля :attribute должно быть датой после или равной :date.',
    min_numeric: 'Значение поля :attribute должно быть не меньше :min.',
    max_numeric: 'Значение поля :attribute не может быть больше :max.',
    min_string:
      'Количество символов в поле :attribute должно быть не меньше :min.',
    max_string:
      'Количество символов в значении поля :attribute не может превышать :max.',
    same: 'Значения полей :attribute и :other должны совпадать.',
  },
  en: {
    required: 'The :attribute field is required.',
    string: 'The :attribute field must be a string.',
    integer: 'The :attribute field must be an integer.',
    numeric: 'The :attribute field must be a number.',
    date: 'The :attribute field must be a valid date.',
    array: 'The :attribute field must be an array.',
    boolean: 'The :attribute field must be true or false.',
    in: 'The selected :attribute is invalid.',
    email: 'The :attribute field must be a valid email address.',
    after_or_equal:
      'The :attribute field must be a date after or equal to :date.',
    min_numeric: 'The :attribute field must be at least :min.',
    max_numeric: 'The :attribute field must not be greater than :max.',
    min_string: 'The :attribute field must be at least :min characters.',
    max_string:
      'The :attribute field must not be greater than :max characters.',
    same: 'The :attribute field must match :other.',
  },
};

// Laravel `attributes` array — field nomini ko'rsatiladigan nomga aylantiradi.
// Yo'q bo'lsa `str_replace('_', ' ', field)` (humanize) ishlatiladi.
export const VALIDATION_ATTRIBUTES: Record<ValLang, Record<string, string>> = {
  uz: {
    name: 'Ism',
    username: 'Nickname',
    email: 'Elektron manzil',
    first_name: 'Ism',
    last_name: 'Familiya',
    password: 'Parol',
    password_confirmation: 'Parolni tasdiqlash',
    city: 'Shahar',
    country: 'Davlat',
    address: 'Manzil',
    phone: 'Telefon',
    mobile: 'Mobil telefon',
    age: 'Yosh',
    sex: 'Jins',
    gender: 'Jins',
    day: 'Kun',
    month: 'Oy',
    year: 'Yil',
    hour: 'Soat',
    minute: 'Daqiqa',
    second: 'Soniya',
    title: 'Nomi',
    content: 'Kontent',
    description: 'Izoh',
    excerpt: 'Parcha',
    date: 'Sana',
    time: 'Vaqt',
    available: 'Mavjud',
    size: 'O‘lcham',
  },
  ru: {
    active: 'Активно',
    address: 'Адрес',
    age: 'Возраст',
    city: 'Город',
    code: 'Код',
    content: 'Контент',
    country: 'Страна',
    current_password: 'Текущий пароль',
    date: 'Дата',
    day: 'День',
    default: 'По умолчанию',
    description: 'Описание',
    email: 'E-Mail адрес',
    enabled: 'Включено',
    first_name: 'Имя',
    gender: 'Пол',
    hour: 'Час',
    last_name: 'Фамилия',
    middle_name: 'Отчество',
    minute: 'Минута',
    mobile: 'Моб. номер',
    month: 'Месяц',
    name: 'Название',
    password: 'Пароль',
    password_confirmation: 'Подтверждение пароля',
    phone: 'Телефон',
    remember_me: 'Запомнить меня',
    second: 'Секунда',
    sex: 'Пол',
    size: 'Размер',
    status: 'Статус',
    time: 'Время',
    title: 'Заголовок',
    username: 'Никнейм',
    year: 'Год',
  },
  en: {},
};
