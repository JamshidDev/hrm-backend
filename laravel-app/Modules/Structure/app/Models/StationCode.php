<?php

namespace Modules\Structure\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\MorphTo;

class StationCode extends Model
{
    protected $guarded = ['id'];

    public function model(): MorphTo
    {
        return $this->morphTo();
    }
}
