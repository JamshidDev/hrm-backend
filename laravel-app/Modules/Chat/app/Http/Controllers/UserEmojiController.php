<?php

namespace Modules\Chat\Http\Controllers;

use App\Http\Controllers\Controller;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Modules\Chat\Models\ChatUserEmoji;

class UserEmojiController extends Controller
{
    public function send(Request $request): JsonResponse
    {
        $request->validate([
            'items' => 'required|array',
            'items.*.fromUserId' => 'required|exists:users,id',
            'items.*.toUserId' => 'required|exists:users,id',
            'items.*.emoji' => 'required|string',
            'items.*.ts' => 'required|integer'
        ]);

        $data = collect($request->items)->map(function ($item) {
            $now = Carbon::createFromTimestampMs($item['ts'],'Asia/Tashkent');
            return [
                'from_user_id' => $item['fromUserId'],
                'to_user_id' => $item['toUserId'],
                'text' => $item['emoji'],
                'created_at' => $now,
                'updated_at' => $now
            ];
        });

        ChatUserEmoji::query()->insert($data->toArray());
        return response()->json(['ok' => true]);
    }

}
