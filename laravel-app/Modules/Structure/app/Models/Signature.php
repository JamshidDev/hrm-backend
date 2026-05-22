<?php

namespace Modules\Structure\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;


class Signature extends Model
{
    use SoftDeletes, LogsActivity;

    protected $guarded = ['id'];

    public function getActivityLogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logUnguarded()
            ->logOnlyDirty();
    }
}
