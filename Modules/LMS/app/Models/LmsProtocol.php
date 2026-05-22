<?php

namespace Modules\LMS\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;
use Modules\Confirmation\Models\DocumentChat;
use Modules\Confirmation\Models\DocumentFile;
use Modules\Confirmation\Models\DocumentHistory;
use Modules\Confirmation\Models\LmsProtocolConfirmation;
use Modules\Confirmation\Models\VacationScheduleConfirmation;
use Modules\Structure\Models\Organization;

class LmsProtocol extends Model
{
    use SoftDeletes;

    protected $guarded = ['id'];

    public function worker_exams(): HasMany
    {
        return $this->hasMany(LmsProtocolWorkerExam::class);
    }

    public function edu_plan(): BelongsTo
    {
        return $this->belongsTo(EduPlan::class);
    }

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    public function certificates(): HasMany
    {
        return $this->hasMany(LmsCertificate::class, 'lms_protocol_id', 'id');
    }

    protected static function boot(): void
    {
        parent::boot();

        static::creating(static function ($model) {
            $uuid = (string)Str::uuid();
            $model->uuid = $uuid;
            $model->file = 'lms/protocol/' . $uuid . '.docx';
            $model->confirmation_file = 'documents/lms/protocol/' . $uuid . '.pdf';
            $model->number = self::getNumber();
        });
    }

    private static function getNumber()
    {
        $lastNumber = self::query()
            ->whereYear('protocol_date', now()->year)
            ->max('number');

        return $lastNumber + 1;
    }

    public function histories(): MorphMany
    {
        return $this->morphMany(DocumentHistory::class, 'model');
    }

    public function chats(): MorphMany
    {
        $userId = auth()->id();
        return $this->morphMany(DocumentChat::class, 'model')
            ->where(function ($query) use ($userId) {
                $query->where('sender_id', $userId)->orWhere('recipient_id', $userId);
            });
    }

    public function files(): MorphMany
    {
        return $this->morphMany(DocumentFile::class, 'model');
    }

    public function confirmations(): HasMany
    {
        return $this->hasMany(LmsProtocolConfirmation::class, 'lms_protocol_id');
    }
}
