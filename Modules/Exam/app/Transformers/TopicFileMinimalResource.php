<?php

namespace Modules\Exam\Transformers;

use App\Helpers\Helper;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Modules\Exam\Enums\TopicFileEnum;

class TopicFileMinimalResource extends JsonResource
{

    public function toArray(Request $request): array
    {
        return [
            'id'  => $this->id,
            'file' => Helper::fileUrl($this->file),
            'file_name' => $this->file_name,
            'file_extension' => $this->file_extension,
            'active' => $this->active
        ];
    }
}
