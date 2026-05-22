<?php

namespace Modules\HR\Transformers\Worker;

use App\Helpers\Helper;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Modules\Structure\Transformers\Structure\LanguageResource;

class WorkerLanguagesResource extends JsonResource
{

    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'language' => $this->language,
            'file' => Helper::fileUrl($this->file)
        ];
    }
}
