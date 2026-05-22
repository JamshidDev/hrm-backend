<?php

namespace Modules\LMS\Models;

use App\Models\User;
use Dyrynda\Database\Support\CascadeSoftDeletes;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Modules\Confirmation\Models\DocumentChat;
use Modules\Confirmation\Models\DocumentFile;
use Modules\Confirmation\Models\DocumentHistory;
use Modules\Confirmation\Models\LmsCertificateConfirmation;
use Modules\HR\Models\Worker;
use Modules\HR\Models\WorkerPosition;
use Modules\Structure\Models\Organization;

class LmsCertificate extends Model
{
    use SoftDeletes, CascadeSoftDeletes;

    protected $guarded = ['id'];
    protected array $cascadeDeletes = ['confirmations'];

    public function worker_position(): BelongsTo
    {
        return $this->belongsTo(WorkerPosition::class);
    }

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function worker(): BelongsTo
    {
        return $this->belongsTo(Worker::class);
    }

    public function edu_plan(): BelongsTo
    {
        return $this->belongsTo(EduPlan::class);
    }

    public static function getModelKeyName(): string
    {
        return 'lms.certificate';
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
        return $this->hasMany(LmsCertificateConfirmation::class, 'lms_certificate_id');
    }
}
