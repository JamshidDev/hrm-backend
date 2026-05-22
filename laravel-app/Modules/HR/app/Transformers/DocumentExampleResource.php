<?php

namespace Modules\HR\Transformers;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class DocumentExampleResource extends JsonResource
{

    public function toArray(Request $request): Request
    {
        return $request;
    }
}
