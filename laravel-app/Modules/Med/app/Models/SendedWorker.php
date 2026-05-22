<?php

namespace Modules\Med\Models;

use App\Helpers\QueryHelper;
use App\Models\User;
use Dyrynda\Database\Support\CascadeSoftDeletes;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;
use Modules\Confirmation\Models\DocumentChat;
use Modules\Confirmation\Models\DocumentFile;
use Modules\Confirmation\Models\DocumentHistory;
use Modules\Confirmation\Models\SendedWorkerConfirmation;
use Modules\HR\Models\Worker;
use Modules\HR\Models\WorkerPosition;
use Modules\Structure\Models\Organization;


class SendedWorker extends Model
{
    use SoftDeletes, CascadeSoftDeletes;

    protected $guarded = ['id'];

    protected array $cascadeDeletes = ['confirmations'];

    protected static function boot(): void
    {
        parent::boot();

        static::creating(static function ($model) {
            $uuid = (string)Str::uuid();
            $model->uuid = $uuid;
            $model->file = 'med/' . $uuid . '.docx';
            $model->confirmation_file = 'documents/med/' . $uuid . '.pdf';
        });
    }

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    public function polyclinic(): BelongsTo
    {
        return $this->belongsTo(Organization::class, 'polyclinic_id');
    }

    public function worker_position(): BelongsTo
    {
        return $this->belongsTo(WorkerPosition::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function worker(): BelongsTo
    {
        return $this->belongsTo(Worker::class);
    }

    public function commission_leader(): BelongsTo
    {
        return $this->belongsTo(WorkerPosition::class);
    }

    public function commissions()
    {
        return $this->hasMany(SendedWorkerCommission::class, 'sended_worker_id');
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

    public function histories(): MorphMany
    {
        return $this->morphMany(DocumentHistory::class, 'model');
    }

    public function confirmations(): HasMany
    {
        return $this->hasMany(SendedWorkerConfirmation::class, 'sended_worker_id');
    }

    public function scopeFilter($query, $user, array $filters = [])
    {
        return QueryHelper::filterByOrganizations($query, $user, $filters);
    }

}
