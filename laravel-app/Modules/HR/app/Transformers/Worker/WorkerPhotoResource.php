<?php

namespace Modules\HR\Transformers\Worker;

use App\Helpers\Helper;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class WorkerPhotoResource extends JsonResource
{

    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'photo' => Helper::fileUrl($this->photo)
        ];
    }
}
