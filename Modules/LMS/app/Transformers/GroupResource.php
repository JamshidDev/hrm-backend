<?php

namespace Modules\LMS\Transformers;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Modules\LMS\Models\LearningCenter;

class GroupResource extends JsonResource
{
    protected LearningCenter $learningCenter;
    public function __construct($resource, $learningCenter = null)
    {
        parent::__construct($resource);
        $this->learningCenter = $learningCenter;
    }

    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'code' => $this->getCode($this->learningCenter)
        ];
    }
}
