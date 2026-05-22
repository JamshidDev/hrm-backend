<?php

namespace App\Services\AI;

use App\Http\Resources\AI\QuestionResource;
use App\Http\Resources\PaginateResource;
use App\Models\AIQuestion;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use OpenAI\Laravel\Facades\OpenAI;
use Symfony\Component\HttpFoundation\StreamedResponse;

class OpenAIService
{
    private const string LAWYER_MODEL = 'gpt-4o';

    private const string LAWYER_SYSTEM_PROMPT = "Sizning ismingiz Exodim AI Yordamchisi.
                        Siz foydalanuvchining savollariga faqat O'zbekiston Respublikasining amaldagi Mehnat kodeksiga asoslangan holda va O'zbek tili grammatikasida to'g'ri javob berishingiz kerak.
                        O'zbekiston Respublikasining Mehnat kodeksiga oid savol berilmasa javob bermang.
Agar savollar boshqa tillarda berilsa va savol mehnat qonunchiligiga oid bo'lsa savol berilgan tilda javob qaytaring.
Javob quyidagi formatda bo'lishi shart:
- Faqat **markdown formatda** yozing
- Muhim joylarni **bold** qilib ko'rsating
- Qo'shimcha tushuntirishlarni _italic_ ko'rinishda yozing
- Faqat ro'yxat bo'lsa `-` bilan yozing, boshqa hollarda `-` ishlatmang!";

    public function __construct(private readonly AITokenPricingService $pricing)
    {
    }

    public function streamLawyerAnswer(int $userId, string $question): StreamedResponse
    {
        return new StreamedResponse(
            fn() => $this->writeLawyerStream($userId, $question),
            200,
            [
                'Content-Type' => 'text/event-stream',
                'Cache-Control' => 'no-cache',
                'X-Accel-Buffering' => 'no',
                'Connection' => 'keep-alive',
            ]
        );
    }

    public function ratingQuestion(int $id, ?bool $like): void
    {
        AIQuestion::query()->find($id)?->update(['like' => $like]);
    }

    public function questionsByDate(int $userId, string $date)
    {
        $logs = AIQuestion::query()
            ->whereDate('created_at', $date)
            ->where('user_id', $userId)
            ->latest('id')
            ->paginate(10);

        return PaginateResource::make($logs, QuestionResource::class);
    }

    public function groupedHistory(int $userId, int $perPage): array
    {
        $dates = AIQuestion::query()
            ->selectRaw('DATE(created_at) as date')
            ->where('user_id', $userId)
            ->groupBy('date')
            ->orderByDesc('date')
            ->paginate($perPage);

        $dateList = $dates->pluck('date')->toArray();

        $firstQuestions = AIQuestion::query()
            ->selectRaw('*, DATE(created_at) as date')
            ->where('user_id', $userId)
            ->whereIn(DB::raw('DATE(created_at)'), $dateList)
            ->orderBy('created_at')
            ->get()
            ->groupBy('date')
            ->map(fn($group) => $group->first());

        $data = collect($dates->items())->map(function ($row) use ($firstQuestions) {
            $log = $firstQuestions[$row->date] ?? null;

            return [
                'date' => $row->date,
                'question' => $log?->question,
                'answer' => Str::limit(strip_tags($log?->answer), 50),
                'created_at' => $log?->created_at,
            ];
        });

        return [
            'data' => $data,
            'pagination' => [
                'current_page' => $dates->currentPage(),
                'per_page' => $dates->perPage(),
                'total' => $dates->total(),
            ],
        ];
    }

    private function writeLawyerStream(int $userId, string $question): void
    {
        $fullAnswer = '';
        $outputTokens = 0;
        $inputTokens = $this->pricing->estimateTokens($question);

        flush();

        $stream = OpenAI::chat()->createStreamed([
            'model' => self::LAWYER_MODEL,
            'messages' => [
                ['role' => 'system', 'content' => self::LAWYER_SYSTEM_PROMPT],
                ['role' => 'user', 'content' => $question],
            ],
            'stream' => true,
        ]);

        foreach ($stream as $response) {
            $chunk = $response->choices[0]->delta->content ?? null;

            if ($chunk === null) {
                continue;
            }

            $fullAnswer .= $chunk;
            $outputTokens += $this->pricing->estimateTokens($chunk);

            echo "data: " . $chunk . "\n\n";
            ob_flush();
            flush();
        }

        $log = AIQuestion::query()->create([
            'question' => $question,
            'answer' => $fullAnswer,
            'user_id' => $userId,
            'cost' => $this->pricing->calculateCost(
                (int)round($inputTokens),
                (int)round($outputTokens),
                self::LAWYER_MODEL
            ),
        ]);

        echo "data: [LOG_ID={$log->id}]\n\n";
        echo "data: [DONE]\n\n";
        ob_flush();
        flush();
    }
}
