<?php

namespace Modules\Economist\Transformers;

use App\Helpers\Helper;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Modules\Economist\Enums\UploadStatusEnum;

class UploadHistoryResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'type' => $this->type,
            'file' => Helper::fileUrl($this->file),
            'year' => $this->year,
            'month' => $this->month,
            'status' => [
                'id' => $this->status,
                'name' => UploadStatusEnum::get($this->status)
            ],
            'created_at' => $this->created_at,
            'done' => $this->done,
            'comment' => $this->comment
        ];
    }

}
