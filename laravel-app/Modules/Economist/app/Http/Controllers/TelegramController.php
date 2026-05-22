<?php

namespace Modules\Economist\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Modules\Economist\Models\EconomistTelegramUser;
use Modules\Economist\Models\Statement;
use Modules\Economist\Services\StatementService;
use Modules\HR\Models\Worker;
use Modules\HR\Transformers\Worker\WorkerMinimalResource;

class TelegramController extends Controller
{
    public function __construct(
        private readonly StatementService $statementService
    ) {
    }

    public function login(Request $request): JsonResponse
    {
        $request->validate([
            'phone' => 'required',
            'pin' => 'required',
            'chat_id' => 'required',
        ]);

        $worker = Worker::query()->where('pin', $request->pin)->first();

        if (!$worker) {
            return response()->json(['message' => 'Unauthorized.'], 401);
        }

        $user = User::query()
            ->where('worker_id', $worker->id)
            ->first();

        $checkUser = EconomistTelegramUser::query()
            ->where('worker_id', $worker->id)
            ->where('chat_id', $request->chat_id)
            ->first();

        if (!$checkUser) {
            EconomistTelegramUser::query()
                ->create([
                    'user_id' => $user?->id,
                    'worker_id' => $worker->id,
                    'chat_id' => $request->chat_id,
                    'bot_token' => $request->header('Bot-Token') ?? $request->input('bot_token'),
                ]);
        }

        return response()->json([
            'uuid' => $worker->uuid,
            'worker' => new WorkerMinimalResource($worker)
        ]);
    }

    public function checkUser(Request $request): JsonResponse
    {
        $request->validate([
            'chat_id' => 'required',
        ]);

        $checkUser = EconomistTelegramUser::query()
            ->where('chat_id', $request->chat_id)
            ->where('bot_token', $request->header('Bot-Token') ?? $request->input('bot_token'))
            ->with(['worker'])
            ->first();

        if (!$checkUser) {
            return response()->json([
                'user' => null
            ], 404);
        }

        return response()->json([
            'user' => $checkUser->worker->uuid,
            'worker' => new WorkerMinimalResource($checkUser->worker)
        ]);
    }

    public function months(Request $request): JsonResponse
    {
        $userUuid = $request->uuid;
        $worker = Worker::whereUuid($userUuid)->first();
        if (!$worker) {
            return response()->json(['message' => 'Unauthorized.'], 400);
        }
        $salaryMonths = Cache::remember(
            "salary_months_{$worker->id}",
            now()->addHours(2),
            static fn () => Statement::query()
                ->where('worker_id', $worker->id)
                ->orWhere('pin', $worker->pin)
                ->select('year', 'month')
                ->groupBy('year', 'month')
                ->get()
        );

        return response()->json([
            'months' => $salaryMonths
        ]);
    }

    public function salary(Request $request): JsonResponse
    {
       if (!$request->month) {
           return response()->json(['message' => "To'gri ma'lumot yuboring..."], 400);
       }

        $userUuid = $request->uuid;
        $worker = Worker::whereUuid($userUuid)->first();

        if (!$worker) {
            return response()->json(['message' => 'Unauthorized.'], 401);
        }

        $statements = Statement::query()
            ->where(function ($query) use ($worker) {
                $query->where('worker_id', $worker->id)->orWhere('pin', $worker->pin);
            })
            ->where('year', $request->year)
            ->where('month', $request->month)
            ->get();

        $amounts = [];
        $this->statementService->getStatements($statements, $amounts);

        return response()->json([
            'salary' => $amounts
        ]);
    }

}
