<?php

namespace Modules\HR\Models;

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
use Modules\Confirmation\Models\VacationScheduleConfirmation;
use Modules\Structure\Models\Organization;

class VacationScheduleYear extends Model
{
    use SoftDeletes;

    protected $guarded = ['id'];

    protected static function boot(): void
    {
        parent::boot();

        static::creating(static function ($model) {
            $uuid = (string)Str::uuid();
            $model->uuid = $uuid;
            $model->file = 'vacation-schedule/' . $uuid . '.docx';
            $model->confirmation_file = 'documents/vacation-schedule/' . $uuid . '.pdf';
        });
    }

    public static function getModelKeyName(): string
    {
        return 'vacation.schedule';
    }

    public function scopeFilter($query, $user, array $filters = [])
    {
        return QueryHelper::filterByOrganizations($query, $user, $filters);
    }

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    public function tradeUnion(): BelongsTo
    {
        return $this->belongsTo(ConfirmationWorker::class, 'trade_union_id');
    }

    public function director(): BelongsTo
    {
        return $this->belongsTo(ConfirmationWorker::class, 'director_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(WorkerPosition::class, 'creator_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
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
        return $this->hasMany(VacationScheduleConfirmation::class, 'vacation_schedule_year_id');
    }

}
