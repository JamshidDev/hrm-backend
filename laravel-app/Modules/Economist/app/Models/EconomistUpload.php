<?php

namespace Modules\Economist\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Modules\Structure\Models\Organization;


class EconomistUpload extends Model
{
    use SoftDeletes;

    protected $guarded = ['id'];

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

}
