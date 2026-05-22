<?php

namespace App\Services\Face;

use App\Helpers\Helper;
use App\Models\LivenessSession;
use App\Models\User;
use App\Models\UserMobileKey;
use App\Traits\Base64FileUploadTrait;
use Exception;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Intervention\Image\Laravel\Facades\Image;
use Modules\HR\Models\DepartmentLocation;
use Modules\Turnstile\Models\TerminalEvent;

class FaceRecognitionService
{
    use Base64FileUploadTrait;

    private const string COMPARE_ENDPOINT = 'https://face.das-uty.uz/api/compare-faces';
    private const int DEFAULT_MATCH_PERCENT = 70;
    private const int IMAGE_RESIZE_THRESHOLD_BYTES = 81920;
    private const int IMAGE_RESIZE_WIDTH = 400;
    private const int IMAGE_JPEG_QUALITY = 70;

    public function recognize(User $user, string $liveImage, ?string $deviceUuid): bool
    {
        $user->loadMissing('worker.photos');

        return $this->compare($liveImage, $user, $deviceUuid, self::DEFAULT_MATCH_PERCENT, 'recognition');
    }

    public function compare(string $liveImage, User $user, ?string $deviceUuid, int $percent, string $type): bool
    {
        $storedImages = [];
        foreach ($user->worker->photos as $photo) {
            $photoFile = Storage::disk('minio')->get($photo->photo);
            $mimePhoto = Storage::disk('minio')->mimeType($photo->photo);

            $storedImages[] = [
                'id' => $photo->id,
                'image' => "data:$mimePhoto;base64," . base64_encode($photoFile),
            ];
        }

        $response = Http::post(self::COMPARE_ENDPOINT, [
            'live_image' => $liveImage,
            'stored_images' => $storedImages,
        ]);

        if ($response->failed()) {
            return false;
        }

        $body = $response->json();

        if (!isset($body['best_match']['probability_percent']) || $body['best_match']['probability_percent'] <= $percent) {
            return false;
        }

        if ($type === 'recognition') {
            $this->markDeviceFaceVerified($user->id, $deviceUuid);
        }

        return true;
    }

    public function startSession(int $userId, ?string $deviceUuid, string $type, $payload = null): string
    {
        $session = LivenessSession::query()->create([
            'session_id' => Str::uuid(),
            'user_id' => $userId,
            'status' => 'process',
            'device_uuid' => $deviceUuid,
            'type' => $type,
            'payload' => $payload,
        ]);

        return $session->session_id;
    }

    public function startLoginSession(string $phone, ?string $deviceUuid): string
    {
        $user = User::query()->where('phone', $phone)->first();

        if (!$user) {
            throw new HttpResponseException(response()->json([
                'message' => 'Bunday telefon raqamli foydalanuvchi topilmadi',
            ], 400));
        }

        return $this->startSession($user->id, $deviceUuid, 'login');
    }

    public function validateSession(string $sessionId): array
    {
        $session = LivenessSession::query()
            ->where('session_id', $sessionId)
            ->whereNot('status', 'finished')
            ->with('user.worker.photos')
            ->first();

        if (!$session) {
            Log::info('LivenessSessionNotFound - ' . $sessionId);
            return ['valid' => false];
        }

        $session->update(['status' => 'started']);
        $lastImage = $session->user->worker->photos->sortByDesc('created_at')->first();

        if (!$lastImage) {
            Log::info('LivenessUserPhotoNotFound - ' . $sessionId);
            return ['valid' => false];
        }

        return [
            'valid' => true,
            'sessionFace' => UserMobileKey::query()
                    ->where('user_id', $session->user_id)
                    ->first()?->face !== null,
            'refImage' => $this->buildRefImage($lastImage),
            'user_id' => (string)$session->user_id,
        ];
    }

    public function completeSession(string $sessionId, array $data): string
    {
        $session = LivenessSession::query()
            ->with('user')
            ->where('session_id', $sessionId)
            ->first();

        $ref = $this->maybeUploadBase64($data['refImage'] ?? null);
        $live = $this->maybeUploadBase64($data['liveImage'] ?? null);

        $session->update([
            'status' => 'finished',
            'success' => $data['success'] ?? null,
            'refImage' => $ref,
            'liveImage' => $live,
            'face_status' => $data['faceStatus'] ?? null,
        ]);

        if ($session->type === 'face_check') {
            $this->markDeviceFaceVerified($session->user_id, $session->device_uuid);
        }

        if ($session->type === 'turnstile') {
            try {
                $payload = $session->payload;
                $user = $session->user;
                if ($payload && $user) {
                    $departmentLocation = DepartmentLocation::with('department')
                        ->find($payload['department_location_id']);
                    $positionId = $user->load(['worker.position'])->worker?->position?->id;

                    TerminalEvent::create([
                        'worker_id' => $user->worker_id,
                        'worker_position_id' => $positionId,
                        'event_date_and_time' => now() ?? null,
                        'auth_type' => 'ACSEventFaceHRMobile',
                        'device_name' => $departmentLocation->department->name ?? null,
                        'last_name' => $user->worker?->last_name,
                        'first_name' => $user->worker?->first_name,
                        'middle_name' => $user->worker?->middle_name,
                        'direction' => $payload['direction'],
                    ]);
                }
            } catch (Exception $exception) {
                Helper::setLog($exception, 'MobileTurnstileCheckInOut');
            }
        }

        return $session->session_id;
    }

    private function buildRefImage($photo): string
    {
        $image = file_get_contents(Helper::fileUrl($photo->photo));

        if ($photo->size >= self::IMAGE_RESIZE_THRESHOLD_BYTES) {
            $image = Image::read($image)
                ->scale(width: self::IMAGE_RESIZE_WIDTH)
                ->toJpeg(self::IMAGE_JPEG_QUALITY);
        }

        return 'data:image/jpeg;base64,' . base64_encode($image);
    }

    private function maybeUploadBase64(?string $base64): ?string
    {
        if (!$base64) {
            return null;
        }

        return $this->uploadBase64File(
            Helper::cleanBase64($base64),
            'liveness-photos',
            ['jpg', 'jpeg', 'png'],
        );
    }

    private function markDeviceFaceVerified(int $userId, ?string $deviceUuid): void
    {
        if (!$deviceUuid) {
            return;
        }

        UserMobileKey::query()
            ->where('user_id', $userId)
            ->where('device_uuid', $deviceUuid)
            ->first()
            ?->update(['face' => now()->format('Y-m-d H:i:s')]);
    }
}
