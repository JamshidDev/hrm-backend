<?php

namespace Modules\Chat\Http\Controllers;

use App\Enums\TelegramMessageTypeEnum;
use App\Helpers\Helper;
use App\Http\Controllers\Controller;
use App\Http\Resources\PaginateResource;
use App\Models\TelegramMessage;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Modules\Chat\Transformers\Telegram\TelegramMessageResource;
use Modules\HR\Enums\ContractTypeEnum;
use Modules\HR\Enums\PositionStatusEnum;
use Modules\HR\Models\Contract;
use Modules\HR\Models\WorkerPosition;

class TelegramController extends Controller
{

    public function messages(): JsonResponse
    {
        $user = auth()->user();
        $workerIds = WorkerPosition::query()
            ->filter($user, request()->all())
            ->select('worker_id');

        $messages = TelegramMessage::query()
            ->whereHas('user', fn($q) => $q->whereIn('worker_id', $workerIds))
            ->with(['user.worker'])
            ->orderByDesc('id')
            ->paginate(request('per_page', 10));

        $data = PaginateResource::make($messages, TelegramMessageResource::class);
        return Helper::response(true, $data);
    }

    public function dashboard(): JsonResponse
    {
        $user = auth()->user();
        $workerIds = WorkerPosition::query()
            ->filter($user, request()->all())
            ->select('worker_id');

        $messageCounts = TelegramMessage::query()
            ->whereHas('user', fn($q) => $q->whereIn('worker_id', $workerIds))
            ->select('type', DB::raw('COUNT(*) as sended_messages'))
            ->groupBy('type')
            ->pluck('sended_messages', 'type');
        $allTypes = TelegramMessageTypeEnum::cases();

        $sended_types = collect($allTypes)->map(fn($type) => [
            'id'               => $type->value,
            'type'             => TelegramMessageTypeEnum::get($type->value),
            'count' => $messageCounts[$type->value] ?? 0,
        ])->values();

        return Helper::response(true, [
            'by_types' => $sended_types
        ]);
    }

}
