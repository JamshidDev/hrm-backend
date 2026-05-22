<?php

namespace Modules\LMS\Models;

use Illuminate\Database\Eloquent\Model;

class MaterialLesson extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'material_id',
        'lesson_id',
    ];

    protected $primaryKey = null;
    public $incrementing = false;
}
