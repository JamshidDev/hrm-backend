<?php

namespace Modules\Confirmation\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Modules\HR\Models\WorkerApplication;


class DocumentFile extends Model
{
    use SoftDeletes;

    protected $guarded = ['id'];

    public function worker_application() : BelongsTo
    {
        return $this->belongsTo(WorkerApplication::class);
    }

}
