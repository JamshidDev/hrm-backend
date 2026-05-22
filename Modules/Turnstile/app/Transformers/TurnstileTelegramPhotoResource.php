<?php

namespace Modules\Turnstile\Transformers;

use App\Helpers\Helper;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Modules\HR\Transformers\Worker\WorkerMinimalResource;

class TurnstileTelegramPhotoResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        if ($this->status === 2) {
            $hcpPersonId = $this->hcp_person_id;
        } else {
            $hcpPersonId = null;
        }
        return [
            'id' => $this->id,
            'worker' => new WorkerMinimalResource($this->worker),
            'photo' => Helper::fileUrl($this->photo),
            'person_id' => $hcpPersonId,
            'error' => $this->error,
            'status' => $this->status,
            'created_at' => $this->created_at
        ];
    }
}
