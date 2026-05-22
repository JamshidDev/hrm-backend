<?php

namespace Database\Seeders;

use App\Models\Quote;
use Illuminate\Database\Seeder;

class QuoteSeeder extends Seeder
{
    public function run(): void
    {
        $quotes = [
            [
                'text'   => [
                    'uz' => 'Hayot — bu nafaqat nafas olish, balki nafasni to‘xtatib qo‘yadigan onlarni yig‘ishdir.',
                    'ru' => 'Жизнь — это не просто дыхание, а сбор моментов, от которых захватывает дух.',
                    'en' => 'Life is not just about breathing, but about collecting moments that take your breath away.'
                ],
                'author' => [
                    'uz' => 'Vivan Green',
                    'ru' => 'Вивьен Грин',
                    'en' => 'Vivan Green'
                ]
            ],
            [
                'text'   => [
                    'uz' => 'Muvaffaqiyat kaliti — harakat qilishdan to‘xtamaslik, hatto qiyin bo‘lsa ham.',
                    'ru' => 'Ключ к успеху — никогда не останавливаться, даже если трудно.',
                    'en' => 'The key to success is to keep going, even when it’s hard.'
                ],
                'author' => [
                    'uz' => 'Nelson Mandela',
                    'ru' => 'Нельсон Мандела',
                    'en' => 'Nelson Mandela'
                ]
            ],
            [
                'text'   => [
                    'uz' => 'Baxtli bo‘lish uchun ideal sharoit kutish — bu hech qachon kelmaydigan poyezdni kutishga o‘xshaydi.',
                    'ru' => 'Ожидание идеальных условий для счастья — это как ждать поезд, который никогда не придёт.',
                    'en' => 'Waiting for perfect conditions to be happy is like waiting for a train that will never come.'
                ],
                'author' => [
                    'uz' => 'Mark Manson',
                    'ru' => 'Марк Мэнсон',
                    'en' => 'Mark Manson'
                ]
            ],
            [
                'text'   => [
                    'uz' => 'Yutqazish — bu muvaffaqiyatsizlik emas. Faqat harakatdan to‘xtaganlar haqiqiy mag‘lub bo‘ladi.',
                    'ru' => 'Проигрыш — это не неудача. Единственные настоящие неудачники — это те, кто перестал пытаться.',
                    'en' => 'Losing is not failure. The only real failures are those who stop trying.'
                ],
                'author' => [
                    'uz' => 'Elon Musk',
                    'ru' => 'Илон Маск',
                    'en' => 'Elon Musk'
                ]
            ],
            [
                'text'   => [
                    'uz' => 'Haqiqiy do‘st — bu sening g‘amgin bo‘lishingga sabab yo‘q bo‘lsa ham, yuragingdagi dardni sezadigan insondir.',
                    'ru' => 'Настоящий друг — это тот, кто чувствует твою боль, даже когда для этого нет видимых причин.',
                    'en' => 'A true friend is someone who feels your pain even when there’s no apparent reason for it.'
                ],
                'author' => [
                    'uz' => 'Jim Morrison',
                    'ru' => 'Джим Моррисон',
                    'en' => 'Jim Morrison'
                ]
            ],
            [
                'text'   => [
                    'uz' => 'Boylik pul bilan o‘lchanmaydi. Haqiqiy boy odam — boriga shukr qiladigan va tinch yurak bilan uxlay oladigan odamdir.',
                    'ru' => 'Богатство не измеряется деньгами. По-настоящему богат тот, кто благодарен за то, что у него есть, и спит с чистой совестью.',
                    'en' => 'Wealth is not measured by money. A truly rich person is one who is grateful for what they have and sleeps with a peaceful heart.'
                ],
                'author' => [
                    'uz' => 'Warren Buffett',
                    'ru' => 'Уоррен Баффет',
                    'en' => 'Warren Buffett'
                ]
            ],
            [
                'text'   => [
                    'uz' => 'Orzularingni o‘zgartirishdan qo‘rqma. Lekin hech qachon ularni faqat qo‘rquving sababli tark etma.',
                    'ru' => 'Не бойся менять мечты. Но никогда не отказывайся от них из-за страха.',
                    'en' => 'Do not be afraid to change your dreams. But never abandon them out of fear.'
                ],
                'author' => [
                    'uz' => 'Steve Jobs',
                    'ru' => 'Стив Джобс',
                    'en' => 'Steve Jobs'
                ]
            ],
            [
                'text'   => [
                    'uz' => 'Hayot bu shunday o‘yin: sen qanchalik qo‘rqmasang, u shunchalik qiziqarli bo‘ladi.',
                    'ru' => 'Жизнь — это игра: чем меньше боишься, тем она интереснее.',
                    'en' => 'Life is a game: the less you fear, the more interesting it becomes.'
                ],
                'author' => [
                    'uz' => 'Richard Branson',
                    'ru' => 'Ричард Брэнсон',
                    'en' => 'Richard Branson'
                ]
            ],
            [
                'text'   => [
                    'uz' => 'Baxt — bu nimaga ega ekaningni tushunish va shukrona qilish san’ati.',
                    'ru' => 'Счастье — это искусство осознавать и благодарить за то, что у тебя есть.',
                    'en' => 'Happiness is the art of realizing and being grateful for what you have.'
                ],
                'author' => [
                    'uz' => 'Dalay Lama',
                    'ru' => 'Далай-лама',
                    'en' => 'Dalai Lama'
                ]
            ],
            [
                'text'   => [
                    'uz' => 'Sizning eng katta dushmaningiz – bu kecha qilgan ishingizdan mamnun bo‘lib, bugun hech narsa qilmaslikdir.',
                    'ru' => 'Ваш самый большой враг — это удовлетворенность вчерашним успехом и бездействие сегодня.',
                    'en' => 'Your biggest enemy is being satisfied with what you did yesterday and doing nothing today.'
                ],
                'author' => [
                    'uz' => 'Muhammad Ali',
                    'ru' => 'Мухаммед Али',
                    'en' => 'Muhammad Ali'
                ]
            ],
            [
                'text'   => [
                    'uz' => 'Har qanday qiyinchilikning ortida imkoniyat bor.',
                    'ru' => 'За любой трудностью скрывается возможность.',
                    'en' => 'Behind every difficulty lies an opportunity.'
                ],
                'author' => [
                    'uz' => 'Albert Eynshteyn',
                    'ru' => 'Альберт Эйнштейн',
                    'en' => 'Albert Einstein'
                ]
            ],
            [
                'text'   => [
                    'uz' => 'O‘zgarish – rivojlanishning kalitidir.',
                    'ru' => 'Изменение – ключ к развитию.',
                    'en' => 'Change is the key to growth.'
                ],
                'author' => [
                    'uz' => 'Uinston Cherchill',
                    'ru' => 'Уинстон Черчилль',
                    'en' => 'Winston Churchill'
                ]
            ],
            [
                'text'   => [
                    'uz' => 'Erta tongning jozibasi yangi imkoniyatlarga eshik ochadi.',
                    'ru' => 'Очарование раннего утра открывает новые возможности.',
                    'en' => 'The beauty of early morning opens doors to new opportunities.'
                ],
                'author' => [
                    'uz' => 'Halil Jibran',
                    'ru' => 'Халиль Джибран',
                    'en' => 'Khalil Gibran'
                ]
            ],
            [
                'text'   => [
                    'uz' => 'O‘zingga bo‘lgan ishonch – eng katta kuchdir.',
                    'ru' => 'Уверенность в себе – величайшая сила.',
                    'en' => 'Self-confidence is the greatest strength.'
                ],
                'author' => [
                    'uz' => 'Dalay Llama',
                    'ru' => 'Далай Лама',
                    'en' => 'Dalai Lama'
                ]
            ],
            [
                'text'   => [
                    'uz' => 'Baxt – bu yo‘l, manzil emas.',
                    'ru' => 'Счастье – это путь, а не пункт назначения.',
                    'en' => 'Happiness is a journey, not a destination.'
                ],
                'author' => [
                    'uz' => 'Buddha',
                    'ru' => 'Будда',
                    'en' => 'Buddha'
                ]
            ]
        ];
        Quote::query()->delete();
        foreach ($quotes as $quote) {
            Quote::create($quote);
        }
    }

}
