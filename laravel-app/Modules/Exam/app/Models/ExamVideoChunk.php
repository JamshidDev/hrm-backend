<?php

namespace Modules\Exam\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;


class ExamVideoChunk extends Model
{
    use SoftDeletes;

    protected $guarded = ['id'];

}
