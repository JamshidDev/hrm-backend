<?php

namespace App\Jobs\Mobile;

use App\Models\LivenessSessionPhoto;
use App\Traits\Base64FileUploadTrait;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class LivenessPhotoJob implements ShouldQueue
{
    use Queueable, Base64FileUploadTrait;

    protected array $photos;
    protected int $sessionId;

    public int $timeout = 36000;

    public function __construct($photos, $sessionId)
    {
        $this->photos = $photos;
        $this->sessionId = $sessionId;
    }

    public function handle(): void
    {
        foreach ($this->photos as $photo) {
            $base64File = base64_decode($photo);
            if ($base64File === false) {
                continue;
            }
            $filename = md5(Str::random(25) . random_int(1, 9999) . time()) . '.' . '.jpg';
            $filePath = 'liveness-photos' . '/' . $filename;
            Storage::disk('minio')->put($filePath, $base64File);
            LivenessSessionPhoto::create([
                'liveness_session_id' => $this->sessionId,
                'photo' => $filePath
            ]);
        }

    }

}
