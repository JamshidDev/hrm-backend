<?php

namespace Modules\LMS\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\SoftDeletes;

class LmsProtocolWorkerExam extends Model
{
    use SoftDeletes;

    protected $guarded = ['id'];
}
