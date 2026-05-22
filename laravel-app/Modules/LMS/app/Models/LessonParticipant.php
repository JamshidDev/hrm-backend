<?php

namespace Modules\LMS\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;


class LessonParticipant extends Model
{
    use SoftDeletes;

    protected $guarded = ['id'];
}
