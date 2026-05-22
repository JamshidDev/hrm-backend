<?php

namespace App\Services\Telegram;

use App\Helpers\ConvertHelper;
use App\Helpers\Helper;
use App\Models\User;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Modules\Turnstile\Models\TurnstileTelegramPhoto;
use Modules\Turnstile\Models\WorkerHikCentral;

class TelegramPhotoService
{
    private const int COMPRESS_THRESHOLD_BYTES = 204800;
    private const int MAX_PHOTO_BYTES = 200 * 1024;
    private const string PHOTO_DIR = 'turnstile/telegram/photos';

    public function uploadTerminalPhoto(User $user, string $url): array
    {
        $file = $this->downloadAndCompress($url);

        $filePath = self::PHOTO_DIR . '/' . md5($user->id . time()) . '.' . Str::of($url)->afterLast('.');

        $hasPending = TurnstileTelegramPhoto::query()
            ->where('user_id', $user->id)
            ->where('status', 1)
            ->exists();

        if ($hasPending) {
            return [
                'message' => trans('messages.turnstile.telegram.already_photo'),
                'data' => ['add' => false],
            ];
        }

        if (!Storage::disk('minio')->put($filePath, $file)) {
            throw new HttpResponseException(
                Helper::response(trans('messages.server_error'), [], 400)
            );
        }

        $personId = WorkerHikCentral::query()
            ->where('worker_id', $user->worker_id)
            ->first()
            ?->hik_central_person_id;

        TurnstileTelegramPhoto::query()->create([
            'user_id' => $user->id,
            'worker_id' => $user->worker_id,
            'photo' => $filePath,
            'hcp_person_id' => $personId,
        ]);

        return [
            'message' => trans('messages.successfully_stored'),
            'data' => ['add' => true],
        ];
    }

    public function verifyPhoto(User $user): ?string
    {
        $photo = WorkerHikCentral::query()
            ->where('worker_id', $user->worker_id)
            ->with('photo')
            ->first()
            ?->photo
            ?->photo;

        return Helper::fileUrl($photo);
    }

    public function processPhoto(User $user): array
    {
        $photo = TurnstileTelegramPhoto::query()
            ->where('user_id', $user->id)
            ->where('status', '!=', 3)
            ->first();

        return [
            'photo' => Helper::fileUrl($photo?->photo),
            'comment' => $photo?->error,
            'status' => $photo?->status,
        ];
    }

    private function downloadAndCompress(string $url): string
    {
        $file = @file_get_contents($url);

        if ($file === false) {
            throw new HttpResponseException(
                Helper::response(trans('messages.turnstile.telegram.file_download_error'), [], 400)
            );
        }

        if (strlen($file) >= self::COMPRESS_THRESHOLD_BYTES) {
            $file = ConvertHelper::compressImage($file);
        }

        if (strlen($file) > self::MAX_PHOTO_BYTES) {
            throw new HttpResponseException(
                Helper::response(trans('messages.turnstile.telegram.photo_size_error'), [], 400)
            );
        }

        return $file;
    }
}
