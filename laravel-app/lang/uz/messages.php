<?php

return [
    'errors' => [
        'model_not_found' => "Model topilmadi",
        'document_file_not_found' => "Hujjatga tegishli fayl topilmadi",
        'dont_permission_update_this_department' => "Siz ushbu bo'linmani taxrirlay olmaysiz",
        'organization_not_allowed_permission' => "Sizda, ushbu ma'lumotnini o'zgartirishi huquqi mavjud emas!",
        'has_application_not_checked' => "Ushbu bosqichda xali tugatilmagan Ariza mavjud, iltimos barja arizalar ma'lumotlarini kiriting",
        'status_not_allowed' => "Bunday status topilmadi",
        'diff_dates_max_30_day' => "Sanalar oralig'i 30 kundan oshmasligi kerak",
        'too_many_attempts_try_again_later' => "Juda ko'p urinishlar. Keyinroq qayta urinib ko'ring."
    ],
    'not_allowed_confirmatory_and_director' => "Rahbar va kelishuvchilar bir xil tanlanmasligi kerak",
    'department_position_not_found' => "Shtat lavozimi topilmadi yoki mavjud emas...",
    'worker_position_not_found' => "Xodimning lavozimi topilmadi yoki mavjud emas...",
    'token_not_provided' => "Sessiya vaqti tugadi...",
    'token_invalid_or_expired' => "Sessiya vaqti tugadi yoki topilmadi...",
    'you_cannot_create_a_document_for_another_worker_contract' => "Ushbu xodimda tasdiqlanmagan shartnoma mavjud!",
    'you_cannot_create_a_document_for_another_worker_command' => "Ushbu xodimda tasdiqlanmagan buyruq mavjud!",
    'you_cannot_create_a_document_for_another_worker_contract_additional' => "Ushbu xodimda tasdiqlanmagan qo'shimcha kelishuv mavjud!",
    'user_block' => "Sizning profilingiz tizim ma’muriyati tomonidan vaqtincha cheklab qo‘yildi.",
    'deploy_success' => 'Deployment muvaffaqqiyatli amalga oshirildi!',
    'deploy_error' => 'Deployment qilishda xatolik yuzaga keldi.',
    'you_cannot_delete_a_document_that_has_been_approved' => 'Tasdiqlangan hujjatni o‘chirish mumkin emas',
    'contract_loaded_command_dont_delete' => "Ushbu shartnoma uchun yaratilgan buyruq allaqachon imzolangan , shartnomani o'chirish mumkin emas!",
    'does_not_delete_related_item' => "Bu element boshqa maʼlumotlar bilan bogʻlangan, O'chirish mumkin emas...",
    'does_not_delete_current_photo' => "Asosiy rasmni o'chirish mumkin emas",
    'server_error' => "Tizimda xatolik yuzaga keldi. Birozdan so'ng qayta urinib ko'ring.",
    'invalid_credentials' => "Bunday foydalanuvchi tizimda topilmadi",
    'invalid_credentials_password' => "Foydalanuvchi nomi yoki parol to'g'riligini tekshiring",
    'token_is_expired' => "Token muddati tugagan.",
    'not_found' => "Ma'lumot topilmadi",
    'department_position_has_workers' => "Ushbu lavozimga tegishli xodimlar mavjud!",
    'department_has_position' => "Ushbu bo'limga tegishli lavozimlar mavjud!",
    'worker_pin_exists' => "Bunday JSHSHIR lik xodim allaqachon mavjud",
    'worker_phone_exists' => "Bunday telefon raqamlik xodim allaqachon mavjud",
    'mew_worker_already_sended' => "Bunday xodim allaqachon yuborilgan",
    'all_ready_confirm_document' => "Hujjat allaqachon tasdiqlangan",
    'does_not_delete_approved_document' => "Tasdiqlangan hujjatni o'chirish mumkin emas",
    'please_check_current_photo' => "Iltimos, asosiy rasmni tanlang",
    'job_already_exists' => "Sizda hali yakunlanmagan topshiriq mavjud!",
    'all' => "Barchasi",
    'minutes' => "minut",
    'hours' => "soat",
    'minutes_worked' => 'Ishlagan vaqti',
    'missing_photo' => "Rasmni tanlash majburiy",
    'invalid_photo_24' => "Rasm hajmi 20KB dan kichik bo'lmasligi kerak",
    'auth' => [
        'login_success' => 'Kirish muvaffaqqiyatli amalga oshirildi!',
        'logout_success' => 'Chiqish muvaffaqqiyatli amalga oshirildi!',
        'unauthenticated_sanctum' => "Ma'lumotlar mos kelmadi, iltimos qayta urunib ko'ring.",
        'unauthenticated_jwt' => "Ma'lumotlar mos kelmadi, iltimos qayta urunib ko'ring!",
        'invalid_auth_type' => "So'rov ma'lumotlari mos kelmadi, iltimos qayta urunib ko'ring."
    ],
    'worker_has_contract' => "Ushbu xodimda faol mehnat shartnomasi mavjud!",
    'tax_four' => [
        'employee_status' => [
            'one' => 'Ishlaydi',
            'two' => 'Ishlamaydi',
        ],
        'contract_type' => [
            'one' => 'Asosiy',
            'two' => "O'rindosh",
            'three' => "FXSH",
            'four' => 'Yollanma'
        ]
    ],
    'tax_five' => [
        'income_type' => [
            'one' => 'Mulkiy',
            'two' => 'Ijara',
            'three' => 'Moddiy naf tarzidagi',
            'four' => 'Boshqa'
        ]
    ],
    'worker' => [
        'already' => "Ushbu xodimda asosiy lavozim mavjud, siz ushbu lavozimga ishga qabul qila olmaysiz!",
        'worker_position_has_other_carers' => "Xodimning asosiy lavozimini o'chirish mumkin emas!",
        'not_found' => "Xodim topilmadi",
        'last_name' => 'Familiyasi',
        'man' => 'Erkak',
        'woman' => 'Ayol',
        'first_name' => 'Ismi',
        'middle_name' => 'Otasining ismi',
        'full_name' => 'To‘liq ism',
        'birthday' => 'Tug‘ilgan sana',
        'sex' => 'Jinsi',
        'country' => 'Davlat',
        'region' => 'Viloyat',
        'city' => 'Shahar/Tuman',
        'current_region' => 'Hozirgi viloyati',
        'current_city' => 'Hozirgi shahri/tumani',
        'address' => 'Yashash manzili',
        'nationality' => 'Millati',
        'phones' => 'Telefon raqamlari',
        'phone' => 'Telefon raqami',
        'pin' => 'JShShIR',
        'inn' => 'INN',
        'organization' => 'Tashkilot',
        'department' => 'Bo‘lim',
        'position' => 'Lavozim',
        'full_position' => 'To‘liq lavozim',
        'short_position' => 'Qisqa lavozim',
        'group' => 'Guruh',
        'rank' => 'Daraja',
        'rate' => 'Stavka',
        'position_date' => 'Lavozimga tayinlangan sana',
        'position_experience' => 'Ushbu lavozimdagi ish tajribasi',
        'type' => 'Shartnoma turi',
        'contract' => 'Mehnat shartnomasi raqami',
        'contract_date' => 'Shartnoma tuzilgan sana',
        'work_experience' => 'Ish tajribasi (oy)',
        'experience_date' => 'Uzluksiz ish staji (Sana)',
        'passport_serial_number' => 'Passport seria va raqami',
        'passport_address' => 'Passport olgan joyi',
        'passport_from_date' => 'Passport olgan sanasi',
        'passport_to_date' => 'Passport amal qilish muddati',
        'education' => "Ma'lumoti",
        'universities' => "Ta'lim olgan oliygohlari",
        'specialities' => "Mutaxassisligi",
        'med_from' => "Tibbiy ko'rikdan oxirgi o'tgan sanasi",
        'med_to' => "Tibbiy ko'rikdan keyingi o'tish sanasi",
        'med_status' => "Tibbiy ko'rik xulosasi",
        'organization_name' => "Tashkilot nomi",
        'passport' => "Passport",
        'year' => 'Yil',
        'afghan' => "Afg'on urushi qatnashchisi",
        'invalid' => 'Nogironlogi',
        'chernobyl' => 'Chernobil falokati qatnashchisi',
        'railway_title' => "Faxriy temir yo'lchi",
        'relatives' => 'Qarindoshlari',
        'marital' => 'Oilaviy holati',
        'marital_status' => [
            'one' => "Turmush qurmagan",
            'two' => "Uylangan / Turmushga chiqqan",
            'three' => "Ajrashgan",
        ],
        'military_status' => [
            'one' => "Yaroqli",
            'two' => "Yaroqsiz",
            'three' => "O‘tamagan",
        ],
        'med' => [
            'one' => "Sog'lom",
            'two' => "Nosog'lom"
        ],
        'political_party' => [
            'two' => "Xalq demokratik partiyasi",
            'three' => "OʻzLiDeP partiyasi",
            'four' => "Adolat partiyasi",
            'five' => "Milliy tiklanish partiyasi",
        ],
        'probation' => [
            'one' => "1 oylik",
            'two' => "2 oylik",
            'three' => "3 oylik",
            'four' => "4 oylik",
            'five' => "5 oylik",
            'six' => "6 oylik",
        ],
        'family' => [
            'one' => "Otasi",
            'two' => "Onasi",
            'three' => "Akasi",
            'four' => "Opasi",
            'five' => "Turmush o'rtog'i",
            'six' => "Ukasi",
            'seven' => "Singlisi",
            'eight' => "O'g'li",
            'nine' => "Qizi",
            'ten' => "Qaynotasi",
            'eleven' => "Qaynonasi",
            'twelve' => "Qaynakasi",
            'thirteen' => "Qaynopasi",
            'fourteen' => "Qaynukasi",
            'fifteen' => "Qaynsingli",
        ],
    ],
    'worker_position' => [
        'organization' => 'Tashkilot',
        'department' => 'Bo‘lim',
        'position' => 'Lavozim',
        'full_position' => 'To‘liq lavozim',
        'short_position' => 'Qisqa lavozim',
        'group' => 'Guruh',
        'rank' => 'Daraja',
        'rate' => 'Stavka',
        'position_date' => 'Lavozimga tayinlangan sana',
        'type' => 'Ish turi',
        'contract' => 'Mehnat shartnomasi raqami',
        'contract_date' => 'Shartnoma tuzilgan sana',
    ],
    'academic' => [
        'title' => [
            'associate_professor' => "Dotsent",
            'professor' => "Professor",
            'senior_researcher' => "Katta ilmiy xodim",
            'academic' => "Akademik",
        ],
        'degree' => [
            'doctor_of_science_only' => "Fan doktori",
            'candidate_of_science' => "Fan nomzodi",
            'doctor_of_science' => "Fan doktori (DSc)",
            'doctor_of_philosophy' => "Fan nomzodi (PhD)",
        ]
    ],
    'contract' => [
        'employment_contract_indefinite' => 'Mehnat shartnomasi (Nomuayyan)',
        'employment_contract_fixed' => 'Mehnat shartnomasi (Muayyan)',
        'civil_labor_contract' => 'Fuqarolik-huquqiy shartnomasi',
        'employment_contract_part_time' => 'Mehnat shartnomasi (O‘rindosh)',
        'employment_contract_remote' => 'Mehnat shartnomasi (Masofadan turib ishlash)',
        'employment_contract_seasonal' => 'Mehnat shartnomasi (Mavsumiy ishlarni bajarish)',
        'minimeze_employment_contract_indefinite' => 'Asosiy',
        'minimeze_employment_contract_fixed' => 'Muayyan',
        'minimeze_civil_labor_contract' => 'FXSH',
        'minimeze_employment_contract_part_time' => 'O‘rindosh',
        'minimeze_employment_contract_remote' => 'Masofaviy',
        'minimeze_employment_contract_seasonal' => 'Mavsumiy',
        'status' => [
            'active' => "Aktiv",
            'finished' => "Yakullangan",
            'process' => "Jarayonda",
        ]
    ],
    'contract_changes' => [
        'employment_terms_change' => "Mehnat shartnomasi shartlarining o‘zgarishi",
        'civil_contract_extension' => "Fuqarolik-huquqiy shartnoma muddatini uzaytirish",
        'civil_contract_activity_change' => "Fuqarolik-huquqiy shartnomadagi faoliyat yo‘nalishini o‘zgartirish",
        'civil_contract_acceptance' => "Fuqarolik-huquqiy shartnoma bo‘yicha bajarilgan ishlarni qabul qilish-topshirish",
        'civil_contract_termination_agreement' => "Fuqarolik-huquqiy shartnomasini muddatidan oldin bekor qilish haqida kelishuv",
        'civil_contract_termination_notice' => "Fuqarolik-huquqiy shartnomasini muddatidan oldin bekor qilish haqida xabarnoma",
        'civil_contract_termination_warning' => "Fuqarolik-huquqiy tusdagi shartnomani muddatidan avval bekor qilish haqida ogohlantirish xati",
        'civil_contract_termination' => "Fuqarolik-huquqiy shartnomasini bekor qilish",
        'contract_termination' => "Mehnat shartnomasini bekor qilish",

        'employee_transfer' => "Xodimning boshqa ishga o‘tkazilishi",
        'employer_relocation' => "Ish beruvchining boshqa joyga ko‘chishi munosabati bilan joyning o‘zgarishi",
        'temporary_assignment' => "Xodimning boshqa ish beruvchiga vaqtincha xizmat safariga yuborilishi",
        'workplace_change' => "Mehnat shartnomasida shart qilib ko‘rsatilgan ish joyining o‘zgarishi",
    ],
    'application' => [
        'user' => [
            'uncertain' => 'Nomuayyan',
            'certain' => 'Muayyan',
            'temporary' => "O'rindosh"
        ],
        'types' => [
            'one' => "Doimiy ishga kirish yuzasidan",
            'two' => "Muddatli ishga kirish yuzasidan",
            'three' => "Navbatdan oldin yillik mehnat taʼtili berish yuzasidan ariza",
            'four' => "Ish haqi saqlanmagan holda taʼtil berish toʻgʻrisida",
            'five' => "Ish haqi qisman saqlangan holda taʼtil berish toʻgʻrisida",
            'six' => "Boshqa ishga oʻtkazish toʻgʻrisida",
            'seven' => "Boshqa ishga oʻtkazishga rozilik toʻgʻrisida",
            'eight' => "O‘quv ta’tilini berish toʻgʻrisida",
            'nine' => "Moddiy yordam berish toʻgʻrisida",
            'ten' => "Mehnat shartnomasini bekor qilish toʻgʻrisida",
        ]
    ],
    'command' => [
        'finished' => [
            'types' => [
                'one' => "Birinchi marta pensiyaga chiqishi munosabati bilan bir martalik pul mukofoti",
                'two' => "Ishlab berilmagan kunlari uchun ish haqidan ushlab qolish",
                'three' => "Foydalanilmagan mehnat ta'tillari uchun pulli kompensatsiya to‘lash"
            ]
        ],
        'employment' => [
            'position_assignment' => "Lavozimga tayinlash",
            'indefinite_hiring' => "Nomuayyan muddatga ishga qabul qilish",
            'fixed_term_hiring' => "Muddatli ishga qabul qilish",
            'competitive_hiring' => "Tanlov asosida ishga qabul qilish",
            'position_commencement' => "Lavozimga kirishganlik",
            'temporary_replacement' => "Vaqtincha ishda yo‘q bo‘lgan xodim o‘rniga ishga qabul qilish",
            'part_time_hiring' => "O‘rindoshlik asosida ishga qabul qilish",
            'reinstatement' => "Avvalgi asosiy ishiga tiklash",
        ],
        'transfer' => [
            'job_transfer' => "Boshqa ishga o‘tkazish to‘g‘risida",
            'relocation_due_to_employer' => "Ish beruvchining boshqa joyga ko‘chishi munosabati bilan joyning o‘zgarishi",
            'temporary_assignment' => "Xodimning boshqa ish beruvchiga vaqtincha xizmat safariga yuborilishi",
            'contractual_location_change' => "Mehnat shartnomasida shart qilib ko‘rsatilgan ish joyining o‘zgarishi",
            'working_conditions_change' => "Mehnat shartlarining o‘zgarishi",
        ],
        'termination' => [
            'mutual_agreement' => "Taraflarning kelishuviga ko‘ra mehnat shartnomasini bekor qilish",
            'contract_expiry' => "Muddati tugashi munosabati bilan mehnat shartnomasini bekor qilish",
            'employee_initiative' => "Xodimning tashabbusiga ko‘ra mehnat shartnomasini bekor qilish",
            'employer_initiative' => "Ish beruvchining tashabbusiga ko‘ra mehnat shartnomasini bekor qilish",
            'refusal_to_continue' => "Ishni davom ettirishni rad etganda mehnat shartnomasini bekor qilish",
            'refusal_new_conditions' => "Yangi shartlarda davom ettirishni rad etganda mehnat shartnomasini bekor qilish",
            'refusal_relocation' => "Boshqa joyga ishlash uchun ko‘chishni rad etganda mehnat shartnomasini bekor qilish",
            'medical_reasons' => "Tibbiy xulosaga ko‘ra mehnat shartnomasini bekor qilish",
            'force_manure' => "Taraflarning ixtiyoriga bog‘liq bo‘lmagan holatlarda mehnat shartnomasini bekor qilish",
        ],
        'vacation' => [
            'granting_leave' => "Mehnat ta’tilini berish",
            'rescheduling_leave' => "Mehnat ta’tilini ko‘chirish",
            'extending_leave' => "Mehnat ta’tilini uzaytirish",
            'recalling_from_leave' => "Mehnat ta’tilidan chaqirib olish",
            'recalling_with_compensation' => "Mehnat ta’tilidan chaqirib olish (pullik kompensatsiya)",
            'splitting_leave' => "Mehnat ta’tilini qismlarga bo‘lish",
            'additional_paid_leave' => "Haq to‘lanadigan qo‘shimcha ta’til",
            'maternity_leave' => "Homiladorlik va tug‘ish ta’tili",
            'childcare_leave_2' => "Bolani parvarishlash ta’tili (2 yoshgacha)",
            'childcare_leave_3' => "Bolani parvarishlash ta’tili (3 yoshgacha)",
            'early_return_childcare' => "Bolani parvarishlash ta’tilidan ishga chiqish",
            'creative_leave' => "Ijodiy ta’til",
            'study_leave' => "O‘quv ta’tili",
            'partial_paid_leave' => "Ish haqi qisman saqlangan ta’til",
            'fully_paid_leave' => "Ish haqi saqlangan ta’til",
            'unpaid_leave' => "Ish haqi saqlanmagan ta’til",
        ],
        'business_trip' => [
            'sixty_one' => "Xizmat safariga yuborish (boshqa ish beruvchiga)",
            'sixty_two' => "Xizmat safariga yuborish",
        ],
        'others' => [
            'seventy_one' => "Rag’batlantirish to‘g‘risida",
            'seventy_two' => "Intizomiy jazo choralarini qo‘llash to‘g‘risida",
            'seventy_three' => "Moddiy yordam berish to‘g‘risida",
        ]
    ],
    'incentives' => [
        'gift_type' => [
            'one' => "Pul mukofoti",
            'two' => "“Faxriy” yorliq",
            'three' => "“Qimmatbaho” sovg‘a",
            'four' => "“Faxriy temiryo'lchi”",
            'five' => "Boshqa",
        ]
    ],
    'disciplinary' => [
        'fine_type' => [
            'one' => "Hayfsan",
            'two' => "Boshqa",
        ]
    ],
    'financial_assistance' => [
        'types' => [
            'one' => "Mehnatga haq to‘lashning eng kam miqdori",
            'two' => "Uzluksiz ish stajiga bog‘liq ravishda",
        ]
    ],
    'confirmation_worker' => [
        'level' => [
            'director' => 'Rahbar',
            'confirmatory' => 'Tasdiqlovchi'
        ]
    ],
    'contract_command' => [
        'status' => [
            'not_created' => "Yaratilmagan",
            'formed' => "Shakllantirildi",
            'not_mandatory' => "Majburiy emas",
        ],
    ],
    'department_position' => [
        'staff_category' => [
            'AUR' => "Ma’muriy-boshqaruv xodimlari",
            'UP' => "Boshqaruv xodimlari",
            'ITR' => "Muhandis-texnik xodimlar",
            'PP' => "Ishlab chiqarish xodimlari",
            'OP' => "Xizmat ko‘rsatuvchi xodimlar",
        ],
    ],
    'department' => [
        'level' => [
            'center' => "Boshqaruv hodimlari",
            'department' => "Departament",
            'management' => "Boshqarma",
            'dept' => "Bo‘linma",
            'sex' => "Sex",
            'sector' => "Sektor",
            'group' => "Guruh",
            'station' => "Bekat",
            'bureau' => "Byuro",
            'branch' => "Tarmoq",
            'brigade' => "Brigada",
            'establishment' => "Muassasa",
            'plot' => "Hudud",
            'central' => "Markaz",
        ],
    ],
    'education' => [
        'level' => [
            'one' => "Oliy",
            'two' => "O‘rta maxsus",
            'three' => "O‘rta"
        ],
        'types' => [
            'one' => "Oliy ta'lim muassasasi",
            'two' => "Professional ta'lim muassasasi",
            'three' => "Umumta'lim maktablari",
            'four' => "Akademik litsey",
            'five' => "Kasb-hunar kolleji",
            'six' => "Boshqalar",
        ]
    ],
    'work_day' => [
        'types' => [
            'd' => 'Kunduzgi',
            'n' => 'Kechki',
        ]
    ],
    'holidays' => [
        'types' => [
            'one' => "Bayram kunlari",
            'two' => "Dam olish kuni",
        ]
    ],
    'roles' => [
        'worker' => 'Ishchi xodim',
        'hr' => 'HR',
        'finance' => 'Buxgalter',
        'jurist' => 'Yurist',
        'economist' => 'Iqtisodchi',
        'hr_leader' => 'HR rahbari',
        'economist_leader' => 'Iqtisodchi rahbari',
        'hospital' => 'Poliklinika xodimi',
        'turnstile_viewer' => "Turniket ko'ruvchi",
        'turnstile_leader' => 'Turniket Leader',
    ],
    'position_categories' => [
        'b' => "Boshqaruv xodimlari",
        'm' => "Mutaxassis xodimlar",
        't' => "Texnik xodimlar",
        'ich' => "Ishlab chiqarish xodimlari",
        'xk' => "Xizmat ko'rsatish xodimlari",
    ],
    'schedules' => [
        'daily' => "5 kunlik",
        'weekly' => "6 kunlik",
        'shift' => "Smena",
        'schedule' => "Grafik",
        'late' => "Kech kelgan",
        'early' => "Erta ketgan",
        'work_status' => "Ish holati",
    ],
    'exam' => [
        'created' => "Bu imtihonni allaqachon boshlagansiz...",
        'exam_whom' => [
            'one' => "Barchaga",
            'two' => "Tegishli lavozimlarga",
            'three' => "Belgilangan xodimlarga (Ishlab turgan)",
            'five' => "Belgilangan xodimlarga (Ishlamayotgan)",
            'four' => "Malaka oshirish imtihonlari uchun",
        ],
        'topic' => [
            'content_types' => [
                'one' => "Videolar",
                'two' => "Rasmlar",
                'three' => "Kitoblar",
                'four' => "Audiolar",
            ],
        ],
        'exam_types' => [
            'one' => "Attestatsiya (Sanoat xavfsizligi)",
            'two' => "Attestatsiya (Lavozimga loyiqligi)",
            'three' => "Malaka sinovi (Razryadni oshirish uchun)",
            'four' => "Bilim sinovi (Mehnat muhofazasi)",
        ],
        'unable_to_delete_this_topic' => "Ushbu mavzuni o'chirish mumkin emas.",
        'unable_to_delete_this_exam' => "Ushbu imtihonni o'chirish mumkin emas.",
        'exam_not_ended' => "Imtihon hali yakunlanmagan",
        'finished' => "Imtihon muvaffaqqiyatli yakunlandi",
        'access_from_another_device_is_prohibited' => "Ushbu qurilmadan imtihonga kirish taqiqlangan",
        'result_updated_successfully' => "Javob muvaffaqqiyatli yangilandi",
        'this_exam_has_already_been_completed_or_expired' => "Bu imtihon allaqachon yakunlangan yoki mavjud emas",
        'the_number_of_tests_is_not_equal' => "Testdagi savollar soni imtihondagi savollar soniga teng emas!",
        'permission_topic_type' => "Ushbu turdagi imtihonlarni yaratish, taxrirlash ruxsati mavjud emas!"
    ],
    'confirmation' => [
        'status' => [
            'process' => "Jarayonda",
            'read' => "O‘qilgan",
            'success' => "Tasdiqlangan",
            'rejected' => "Rad etilgan",
            'deleted' => "O‘chirilgan",
        ],
        'signature_methods' => [
            'digital' => "Elektron imzo orqali",
            'biometric' => "Qo'lda imzo qo'yish orqali",
            'button' => "Tugmani bosish orqali",
            'not_confirmed' => "Imzolanmagan",
        ],
    ],
    'otp' => [
        'service_create_token_error' => "Servisdan ma'lumot olishda xatolik yuzaga keldi",
        'message_successfully_sent' => "SMS tasdiqlash kodi muvaffaqqiyatli yuborildi",
        'service_not_found' => "SMS yuborish servisi topilmadi yoki mavjud emas",
        'otp_code_invalid' => "SMS kodining vaqti allaqachon tugagan"
    ],
    'successfully_stored' => "Muvaffaqqiyatli qo'shildi",
    'successfully_attached' => "Muvaffaqqiyatli biriktirildi",
    'successfully_detached' => "Muvaffaqqiyatli ajratildi",
    'successfully_updated' => "Muvaffaqqiyatli yangilandi",
    'successfully_exported' => "Yuklashga muvaffaqqiyatli yuborildi",
    'successfully_deleted' => "Muvaffaqqiyatli o'chirildi",
    'user_all_ready' => "Bundan foydalanuvchi tizimda allaqachon mavjud",
    'sms_code_all_ready' => "SMS tasdiqlash kodi allaqachon yuborilgan",
    'user_not_found' => "Foydalanuvchi tizimda topilmadi yoki mavjud emas",
    'permission_detach_forbidden_from_role' => "Role orqali biriktirilgan permissionni userdan alohida olib tashlab bo'lmaydi.",
    'user_has_been_registered' => "Tabriklaymiz, siz muvaffaqqiyatli ro'yxatdan o'tdingiz",
    'otp_code_not_verified' => "Tasdiqlash kodi mos kelmadi",
    'organization_not_found' => "Yuqori tashkilot topilmadi",
    'successfully_logout' => "Hisobdan chiqish muvaffaqiyatli amalga oshirildi",
    'permission_related' => "Ruhsat rolega muvaffaqiyatli biriktirildi",
    'role_related' => "Rol foydalanuvchilarga yoki ruxsatlarga biriktirilgan; o'chirib bo'lmaydi",
    'report' => [
        'error' => [
            'month_created_band' => "Bandlik organlarining yo'llanmasi asosida ishga qabul qilingan soni tashqaridan qabul qilinganlar sonidan oshmasligi kerak",
        ],
        'labels' => [
            'all_rate' => 'Tasdiqlangan shtat birliklar soni',
            'workers_count' => 'Amaldagi ishchi-xodimlar soni',
            'men' => 'Erkak ishchi-xodimlar soni',
            'women' => 'Ayol ishchi-xodimlar soni',
            'vacancies' => "Korxonada mavjud bo'sh ish o'rinlari soni",
            'part_time_contract' => 'Fuqaroviy-huquqiy shartnoma asosida faoliyat yuritayotganlar soni',
            'month_created' => 'Ushbu oyda ishga qabul qilingan xodimlar soni',
            'month_updated' => 'Jamiyat korxonalaridan ichki siljish asosida qabul qilinganlar soni',
            'month_other_created' => 'Tashqaridan qabul qilinganlar soni',
            'month_created_30' => 'Ushbu oyda 30 yoshgacha qabul qilingan xodimlar soni',
            'month_created_univer' => 'Ushbu oyda qabul qilingan TDTrU bitiruvchilari',
            'month_created_tex' => "Ushbu oyda qabul qilingan temir yo'l transport texnikumlari bitiruvchilari",
            'month_created_other_univer' => "Ushbu oyda qabul qilingan boshqa oliy ta'lim tashkilotlari bitiruvchilari",
            'month_created_coll' => "Ushbu oyda qabul qilingan boshqa o'rta-maxsus kasb-hunar kollejlari bitiruvchilari",
            'month_created_school' => "Ushbu oyda qabul qilingan o'rta ma'lumotlilar",
            'month_created_band' => "Ushbu oyda bandlik organlarining yo'llanmasi asosida ishga olinganlar soni",
            'month_deleted' => 'Ushbu oyda mehnat shartnomasi bekor qilinganlar soni',
            'higher_count' => "Oliy ma'lumotli xodimlar soni",
            'special_count' => "O'rta-maxsus ma'lumotli xodimlar soni",
            'middle_count' => "O'rta ma'lumotli xodimlar soni",
            'age_under_30' => '30 yoshgacha xodimlar soni',
            'age_31_45' => '31-45 oraliqdagi xodimlar soni',
            'age_46_plus' => '46 yosh va undan katta xodimlar soni',
            'pension_age_count' => 'Pensiya yoshidagilar',
            'vacation_count' => 'Bola parvarishlash tatilidagi xodimlar',
            'disability_count' => 'Nogironligi mavjud xodimlar',
        ],
    ],
    'base64_file_not_valid' => "Base64 faylida noto'g'ri format aniqlandi",
    'file_not_valid' => "Fayl noto'g'ri formatda yuklandi",
    'sent_successfully' => "Muvaffaqiyatli yuborildi",
    'read_successfully' => "Muvaffaqiyatli o'qildi",
    'maximum_file_siz' => "Ruxsat etilgan maksimal file razmeri: ",
    'document' => [
        'created' => "Hujjat yaratildi",
        'updated' => "Hujjat yangilandi",
        'deleted' => "Hujjat o'chirildi",
        'rejected' => "Hujjat bekor qilindi",
        'not_found' => "Hujjat topilmadi",
        'signed_successfully' => "Hujjat muvaffaqqiyatli imzolandi",
        'already_signed' => "Ushbu hujjat allaqachon imzolangan",
        'rejected_successful' => "Hujjat muvaffaqqiyatli bekor qilindi",
        'commands' => [
            'command_additional' => [
                'delete_additional' => [
                    'pension_count' => "Birinchi marta pensiyaga chiqish (Oylik maoshidan ko'paytma)",
                    'pension_coefficient' => "Birinchi marta pensiyaga chiqish (Oylik maoshidan foiz)",
                    'salary_withholding' => "Ish haqidan ushlab qolish",
                    'compensation' => "Kompensatsiya to‘lash"
                ]
            ]
        ]
    ],
    'vacations' => [
        'types' => [
            'one' => "Mehnat ta'tili",
            'two' => "Homiladorlik va tug'ish ta'tili",
            'three' => "Bolani parvarishlash ta'tili",
            'four' => "O'quv ta'tili",
            'five' => "Ijodiy ta'tili",
            'six' => "Ish haqi saqlanmaydigan ta'til",
            'seven' => "Ish haqi qisman saqlanadigan ta'til",
            'eight' => "Boshqa turdagi ta'til",
        ],
        'additional_types' => [
            'one' => "Bitta tashkilotda yoki tarmoqda ko‘p yillik ish staji uchun",
            'two' => "12 yoshga to'lmagan 2 va undan ortiq farzandi borligi uchun",
            'three' => "16 yoshga to‘lmagan nogironligi bo‘lgan farzandi borligi uchun",
            'four' => "Noqulay mehnat sharoitlaridagi ish uchun",
            'five' => "Noqulay tabiiy-iqlim sharoitlaridagi ish uchun",
            'six' => "Donorlarga beriladigan dam olish kuni"
        ]
    ],
    'work' => [
        'hours' => [
            'daytime_evening' => 'Kunduzgi ish soatlari',
            'night' => 'Tungi ish soatlari',
            'weekend_holiday' => 'Dam olish va bayram kunlari ishlash',
            'overtime' => 'Qoʻshimcha ish soatlari',
            'reduced_for_students' => 'Ish vaqti qisqartirilgan (o‘qiydiganlar uchun)',
            'reduced_by_law' => 'Qonun asosida qisqartirilgan ish soatlari',
            'unworked_admin' => 'Maʼmuriyat tashabbusi bilan toʻliq bajarilmagan soatlar',
        ],
        'trip' => [
            'business' => 'Xizmat safarida',
        ],
        'leave' => [
            'annual_paid' => 'Yillik asosiy toʻlanadigan ta’til',
            'additional_paid' => 'Qo‘shimcha toʻlanadigan ta’til',
            'study_paid' => 'O‘qish bo‘yicha toʻlanadigan ta’til',
            'unpaid_study' => 'O‘qish bo‘yicha toʻlanmaydigan ta’til',
            'maternity' => 'Homiladorlik va tug‘ish ta’tili',
            'partial_childcare' => 'Qisman to‘lanadigan bola parvarishi ta’tili',
            'unpaid_childcare' => 'To‘lanmaydigan bola parvarishi ta’tili',
            'unpaid_admin_permission' => 'Maʼmuriyat ruxsati bilan to‘lanmaydigan ta’til',
            'unpaid_legal' => 'Qonun bilan ruxsat etilgan to‘lanmaydigan ta’til',
        ],
        'disability' => [
            'temporary' => 'Vaqtincha mehnatga layoqatsizlik',
            'unpaid' => 'To‘lanmaydigan mehnatga layoqatsizlik',
        ],
        'downtime' => [
            'not_workers_fault' => 'Ishchini aybi bilan bo‘lmagan turib qolishlar',
        ],
        'absence' => [
            'full_day_legal' => 'Qonun asosida to‘liq kun ishlamagan',
            'unexcused' => 'Sababsiz ishga kelmagan (pragullik)',
            'unclear' => 'Aniqlanmagan sabablarga ko‘ra yo‘qlik',
        ],
        'days' => [
            'official_holiday' => 'Dam olish va bayram kunlari',
        ],
        'strike' => [
            'legal' => 'Qonuniy ish tashlash',
        ],
    ],
    'organization_documents' => [
        'one' => "Buyruq",
        "two" => "Nizom",
        "three" => "Boshqa turdagi hujjatlar",
    ],
    'export' => [
        'export_completed' => "Eksport muvaffaqqiyatli tugadi.",
        'types' => [
            'workers' => "Xodimlar ma'lumotlarini excelga yuklash",
            'late_come' => "Turniket ma'lumotlarini excelga yuklash",
            'zip' => "Xodimlar ma'lumotnomalarini arxivlab yuklash",
            'exam_results' => "Imtihon natijalarini yuklash",
            'exam_not_passed_workers' => "Imtihon topshirmagan xodimlar",
            'turnstile_absent_workers' => "Ishga kelmagan xodimlar",
            'turnstile_late_workers' => "Kech qolgan xodimlar",
            'turnstile_early_leave_workers' => "Erta ketgan xodimlar",
            'turnstile_work_durations' => "Norma soatni bajarmaganlar",
            'pensioners' => "Pensionerlar",
            'relatives' => "Xodimlarning qarindoshlari",
            'statement_with_codes_by_organizations' => "Oylik hisobotda tanlangan shifrlar korxonalar kesimida",
            'statement_with_codes_by_workers' => "Oylik hisobotda tanlangan shifrlar xodimlar kesimida",
            'statement_multiple_workers' => "Birdan ortiq tashkilotda ishlayotganlar",
            'statement_with_codes' => "Oylik hisobot(Shifr) Oylar kesimida",
            'statement_with_organizations' => "Oylik hisobot(Shifr) Korxonalar kesimida",
            'devices' => "Barcha qurilmalar",
            'online_devices' => "Onlayn qurilmalar",
            'offline_devices' => "Offlayn qurilmalar",
            'last_sync_devices' => "Sinxronizatsiyalash vaqtlari qurilmalar kesimida",
            'current_in_workers' => 'Xozirda ishdagi xodimlar',
            'current_out_workers' => "Xozirda ishxonada bo'lmagan xodimlar",
            'daily_attendance' => 'Kirish Chiqish hodisalari',
            'turnstile_come' => "Ishga kelgan xodimlar",
            'turnstile_not_come' => "Ishga kelmagan xodimlar",
            'vacation_workers' => "Ta'tildagi xodimlar",
            'statements_by_positions' => "Tegishli lavozimdagi xodimlar oylar kesimida",
            'incentive' => "Rag'batlantirishlar",
            'disciplinary' => "Intizomiy jazolar",
            'report_export_by_education' => "Xodimlarning yoshi, ma'lumoti, nogironligi",
            'notIncludedScheduleWorkers' => "Grafik tuzilmagan xodimlar",
            'turnstile_schedule_timesheet' => "Grafik bo'yicha tabel",
            'statement_with_codes_by_year' => "Shifrlar bo'yicha xodimlar, oylar kesimida"
        ],
        'event_types' => [
            'in' => 'Kirish',
            'out' => 'Chiqish',
        ],
        'headers' => [
            'terminal' => 'Terminal',
            'worker_position' => 'Xodim lavozimi',
            'organization' => 'Tashkilot',
            'organization_code' => 'Tashkilot kodi',
            'position' => 'Lavozimi',
            'worker' => 'Xodim',
            'total' => 'Jami',
            'pin' => 'JSHSHIR',
            'event_time' => 'Hodisa vaqti',
            'event_type' => 'Hodisa turi',
            'index' => '№',
            'exam' => 'Imtihon',
            'topic' => 'Mavzu',
            'created' => 'Boshlagan vaqti',
            'ended' => 'Tugatgan vaqti',
            'result' => 'Natija',
            'tests_count' => 'Testlar soni',
            'percent' => 'Foiz',
            'salary' => 'Oylik maosh',
        ],
    ],
    'job' => [
        'statuses' => [
            'done' => "Tayyor",
            'process' => 'Jarayonda',
            'error' => "Xatolik"
        ]
    ],
    'economist' => [
        'changed' => [
            'change_statuses' => [
                'created' => 'Yaratildi',
                'updated' => 'Yangilandi',
                'deleted' => 'O\'chirildi',
            ],
            'confirm_statuses' => [
                'new' => 'Yangi',
                'process' => 'Jarayonda',
                'done' => 'Tasdiqlandi',
                'reject' => 'Rad etildi',
            ]
        ],
        'upload_types' => [
            'one' => 'Oylik hisobot',
            'two' => 'INPS 4-ilova',
            'three' => 'INPS 5-ilova',
            'four' => "INPS to'lovlar",
        ],
        'upload_statuses' => [
            'one' => 'Jarayonda',
            'two' => 'Qayta yuklandi',
            'three' => 'Tasdiqlandi',
            'four' => 'Xatolik'
        ],
        'statement' => [
            'total_one' => "Ish haqi fondiga kiruvchi to'lov turlari",
            'total_two' => "Daromad tarkibiga kiritilmaydigan to‘lovlar",
            'total_three' => "Ish haqi fondiga kirmaydigan to'lov turlari",
            'total_four' => "Jami ish haqi",
            'total_five' => "Ish haqidan ushlamalar",
            'decoding' => [
                'one' => "Mehnatga haq to‘lash fondi, 1-T hisobotida aks etuvchi",
                'two' => "Mehnatga haq to‘lash fondiga kirmaydigan to‘lovlar",
                'three' => "Ish xaqidan ushlanmalar",
                'four' => "To‘lov turlarining nomi",
                'five' => "Tur",
                'six' => "Jami",
                'seven' => "Umumiy",
                'eight' => "Daromad tarkibiga kirmaydigan to‘lovlar",
                'nine' => "Hisoblangan jami ish haqi",
                'in_year' => 'Yil boshidan'
            ]
        ],
        'tax_four' => [
            'reported_salary_income' => "Hisobot davridagi mehnatga haq to‘lash tarzidagi daromadlar",
            'reported_tax' => "Hisobot davridagi soliq summasi"
        ],
        'tax_five' => [
            'reported_income' => "Hisobot davridagi daromadlar",
            'reported_tax' => "Hisobot davridagi soliq summasi",
        ],
        'pension_payment' => [
            'income_tax_paid' => "Daromad solig‘i to‘langan daromad miqdori",
            'total_contributions' => "Jami badallar"
        ]
    ],
    'turnstile' => [
        'receiver_organization_is_you' => "Tanlangan tashkilot sizning tashkilotingiz",
        'approved_dont_edit' => "Tasdiqlangan, boshqa tahrirlash mumkin emas",
        'unique_workers_count' => "Bir xil xodimlarni qayta tanlamang!",
        'this_employee_has_been_granted_sufficient_permissions' => "Ushbu xodimga ruhsatlar yetarlicha berilgan.",
        'schedule_workers_count_not_equal_schedule_days_count' => "Yuborilayotgan xodimlar jadval turi xodimlar soniga teng emas.",
        'worker_has_schedule_in_this_period' => "Xodimning ushbu davrda ish jadvali bor",
        'schedules' => [
            'types' => [
                'one' => 'Smena',
                'two' => 'Xar kunlik',
                'three' => '15 kunlik',
                'four' => '1 xaftalik',
                'five' => 'Maxsus',
            ]
        ],
        'hcp_error_codes' => [
            'one' => 'Qurilmaga rasm yuklashda xatolik yuzaga keldi!',
            'two' => "Qurilmaga ulanishda xatolik yuzaga keldi!",
            'three' => "Qurilmadan ma'lumotlarni qabul qilish vaqti tugadi!",
            'four' => "Xodimning qo'shilishi kutilmoqda ...",
            'five' => "Qurilmada yuz rasmlari kutubxonasini olishda xatolik yuz berdi!",
        ],
        'max_access_level_5' => "Ko'pi bilan 5-tagacha guruh tanlashingiz mumkin!",
        'device_not_active' => "Qurilma holati onlayn emas!",
        'devices' => [
            'name' => "Qurilma qisqa kodi",
            'area_name' => "Qurilma nomi",
            'last_sync' => "Oxirgi sinxronlangan vaqti",
            'status' => "Holati",
        ],
        'telegram' => [
            'photo_size_error' => "Fayl hajmi 200 KB dan oshmasligi kerak!",
            'already_photo' => "Sizda hali jarayondagi rasmingiz mavjud!",
            'file_download_error' => "Fayl yuklanishda xatolik yuzaga keldi!",
        ],
        'organization_name' => "Tashkilot nomi",
        'department_name' => "Bo'lim nomi",
        'position_name' => "Lavozimi",
        'last_name' => 'Familiya',
        'first_name' => 'Ism',
        'middle_name' => 'Otasining ismi',
        'leave_time_only' => "Chiqqan vaqti",
        'early_minutes' => 'Qancha minut oldin',
        'come_time' => 'Kirgan sanasi va vaqti',
        'come_time_only' => 'Kirgan vaqti',
        'late_minutes' => 'Qancha minut keyin',
        'total_minutes' => 'Jami minut',
        'last_event' => 'Oxirgi hodisa',
        'start_time' => "Grafik boshlanish vaqti",
        'end_time' => "Grafik tugash vaqti",
        'first_entry_time' => "Ishga kelish vaqti",
        'last_exit_time' => "Ishdan chiqish vaqti",
        'firstIn' => "Birinchi kirish vaqti",
        'lastOut' => "Oxirgi chiqish vaqti",
        'vacation_from' => "Ta'til qachondan",
        'vacation_to' => "Ta'til qachongacha",
        'terminal_worker' => [
            'face' => "Rasm mos kelmadi! Iltimos, yaqinda olingan rasmni yuklang. Fayl hajmi 200 KB dan oshmasligi kerak."
        ],
        'sync_type' => [
            'one' => "Tizim",
            'two' => "Foydalanuvchi"
        ],
        'auth_type' => [
            'one' => "Face orqali",
            'two' => "Barmoq izi orqali"
        ],
        'device_name' => 'Qurilma nomi',
        'event_date_and_time' => 'Hodisa vaqti',
        'event_date' => 'Hodisa sanasi',
        'event_time' => 'Hodisa soati',
        'direction' => 'Hodisa turi',
        'worker' => [
            'last_name' => 'Familiya',
            'first_name' => 'Ism',
            'middle_name' => 'Otasining ismi',
            'organization_name' => 'Tashkilot nomi',
            'department_name' => "Bo'lim nomi",
            'position_name' => 'Lavozimi',
            'position_date' => 'Lavozim sanasi',
        ],
        'minutes_worked' => "Ishlagan vaqti",
        'in' => 'Kirish',
        'out' => 'Chiqish',
    ],
    'vacancy' => [
        'work_types' => [
            'one' => "To'liq"
        ],
        'user' => [
            'no_photo' => "Iltimos, profil sozlamalaridan tizimga 3x4 rasmingiz va shahsiy ma'lumotlaringizni kiriting!",
            'vacancy_position_expired' => "Ushbu bo'sh ish o'rni topilmadi yoki muddati allaqachon tugagan!",
            'already_applied' => "Ushbu bo'sh ish o'rniga siz allaqachon ariza yuborgansiz!",
            'no_info_details' => "Iltimos, profil sozlamalaridan shaxsiy ma'lumotlaringizni to'ldiring!",
            'statues' => [
                'one' => 'Jarayonda',
                'two' => 'Qabul qilindi',
                'three' => 'Rad qilindi',
            ]
        ],
        'send_success' => "Sizning arizangiz muvaffaqqiyatli yuborildi!",
        'file_types' => [
            'one' => "Bilim yurti diplom nusxasi",
            'two' => "Ma'lumotnoma yoki Rezyume (imzolangan holda yuklansin)",
            'three' => "Qo'shimcha sertifikatlar (agar mavjud bo'lsa)",
        ],
        'levels' => [
            'one' => "Ariza topshirish",
            'two' => "Hujjatlarni baholash",
            'three' => "Suhbat",
            'four' => "Tibbiy ko'rik",
            'five' => "Onlayn test",
            'six' => "Arizani yakunlash",
            'seven' => "Tugatilgan",
        ]
    ],
    'lms' => [
        'learning_center_not_found' => "O'quv markazi topilmadi, yoki sizda tegishli ruxsat mavjud emas!",
        'edu_plan_not_found' => "O'quv rejasi topilmadi!",
        'edu_plan_workers_count_invalid' => "Ushbu o'quv rejasida ko'rsatilgan xodimlar limitidan oshirish mumkin emas!",
        'edu_plan_workers_count_invalid_groups' => "Biriktirilgan xodimlar soni guruhlar soniga mos kelmadi!",
        'exam_already_attached' => "Ushbu imtihon allaqachon biriktirilgan!",
        'edu_plan' => [
            'types' => [
                'one' => "Malaka oshirish",
                'two' => "Qayta tayyorlash",
            ],
            'exam_types' => [
                'one' => "Kirish imtihoni",
                'two' => "Chiqish imtihoni",
                'three' => "Navbatdan tashqari",
            ],
            'listener' => [
                'status' => [
                    'one' => "Jarayonda",
                    'two' => "Malaka oshirish davrida",
                    'three' => "Tugatilgan",
                    'four' => "Chetlatilgan",
                ]
            ]
        ],
        'lesson' => [
            'edu_plan_hours_exceeded' => "O'quv rejasi umumiy soatdan oshmasligi kerak!",
            'already_teacher' => "Ushbu Ustoz boshqa darsga biriktirilgan!",
            'already_group' => "Ushbu Guruh boshqa darsga biriktirilgan!",
        ]
    ],
    'mobile' => [
        'personal_information' => 'Shaxsiy ma’lumotlar',
        'careers' => 'Mehnat faoliyati',
        'passport_information' => 'Pasport ma’lumotlari',
        'education' => 'Ma’lumoti',
        'relatives' => 'Qarindoshlari',
        'meds' => 'Tibbiy ma’lumotlar',
        'vacations' => 'Ta’til ma’lumotlari',
        'incentives' => 'Rag‘batlantirishlar',
        'disciplinary_actions' => 'Intizomiy jazolar',
        'exams' => 'Imtihonlar',
        'turnstile' => 'Turniket ma’lumotlari',
        'salary' => 'Ish haqi',
        'turnstile_stats' => [
            'schedule_not_found' => "Ish jadvali ma’lumotlarida nomuvofiqlik aniqlandi. Iltimos, HR bo‘limiga murojaat qiling.",
            'start_time_not_started' => "Ish vaqti hali boshlanmagan. Belgilangan vaqt kutilmoqda.",
            'start_event_not_found' => "Ishga kelish qaydi topilmadi. 😐",
            'start_event_plus' => "Siz ishga belgilangan vaqtdan oldin keldingiz. Rahmat! 👍",
            'start_event_minus' => "Siz ishga belgilangan vaqtdan kech keldingiz. 😬",
            'start_event' => "Siz ishga aniq belgilangan vaqtda keldingiz. 👌",
            'end_time_not_started' => "Ish vaqti hali tugamagan. 🤔",
            'end_event_not_found' => "Ishdan chiqish qaydi topilmadi. 🤔",
            'end_time_minus' => "Siz ish vaqtidan oldin chiqib ketdingiz. 😕",
            'end_time' => "Siz ishni belgilangan vaqtda yakunladingiz.👌"
        ]
    ],
    'chat' => [
        'telegram' => [
            'messages' => [
                'types' => [
                    'birthday' => "Tug'ilgan kun",
                    'vacations' => "Ta'til",
                    'med' => "Tibbiy ko'rik",
                    'passport' => "Passport",
                    'mobile_app' => "Mobil ilova",
                    'turnstile_stats' => "Turniket statistikasi",
                ]
            ]
        ],
        'notifications' => [
            'send_success' => "Sizning xabarniz muvaffaqqiyatli yuborildi!",
            'read_success' => "Xabarlar muvaffaqqiyatli o'qildi!",
        ]
    ]
];

