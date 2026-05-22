<?php

namespace Modules\Exam\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;


class WorkerExamFile extends Model
{
    use SoftDeletes;

    protected $guarded = ['id'];

    protected $casts = [
        'uuid' => 'string',
    ];

    protected static function boot(): void
    {
        parent::boot();

        static::creating(static function ($model) {
            $uuid = (string)Str::uuid();
            $model->uuid = $uuid;
            $model->file = 'worker-exams/' . $uuid . '.docx';
            $model->confirmation_file = 'documents/worker-exams/' . $uuid . '.pdf';
            $model->front_url = 'https://hrm.railway.uz/public/worker-exams/' . $uuid;
        });
    }
}
