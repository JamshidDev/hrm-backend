<?php

namespace Modules\Turnstile\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;


class ExportWorkerToHikCentralJob extends Model
{
    use SoftDeletes;

    protected $guarded = ['id'];

    public function error_workers(): HasMany
    {
        return $this->hasMany(ExportWorkerError::class, 'export_worker_to_hik_central_job_id');
    }
}
