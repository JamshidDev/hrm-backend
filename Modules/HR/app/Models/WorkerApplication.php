<?php

namespace Modules\HR\Models;

use App\Helpers\Helper;
use App\Helpers\QueryHelper;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;
use Modules\Confirmation\Models\DocumentChat;
use Modules\Confirmation\Models\DocumentFile;
use Modules\Confirmation\Models\DocumentHistory;
use Modules\Confirmation\Models\WorkerApplicationConfirmation;
use Modules\Structure\Models\Organization;


class WorkerApplication extends Model
{
    use SoftDeletes;

    protected $guarded = ['id'];

    protected static function boot(): void
    {
        parent::boot();

        static::creating(static function ($model) {
            $uuid = (string)Str::uuid();
            $model->number = Helper::generateDocumentNumber($model, self::class, 'KXA');
            $model->uuid = $uuid;
            $model->file = 'worker-application/' . $uuid . '.docx';
            $model->confirmation_file = 'documents/worker-application/' . $uuid . '.pdf';
        });
    }
    public static function getModelKeyName(): string
    {
        return 'worker.application';
    }
    public function scopeFilter($query, $user, array $filters = [])
    {
        if (!$user) {
            $user = auth()->user();
        }
        return $query->where('user_id', $user->id);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function scopeOrganizationFilter($query, $user, $filters)
    {
        return QueryHelper::filterByOrganizations($query, $user, $filters);
    }

    public function director(): BelongsTo
    {
        return $this->belongsTo(ConfirmationWorker::class, 'director_id');
    }

    public function worker(): BelongsTo
    {
        return $this->belongsTo(Worker::class);
    }

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    public function confirmations(): HasMany
    {
        return $this->hasMany(WorkerApplicationConfirmation::class, 'worker_application_id');
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

}
