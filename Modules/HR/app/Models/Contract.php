<?php

namespace Modules\HR\Models;

use App\Helpers\QueryHelper;
use App\Models\User;
use Carbon\Carbon;
use Dyrynda\Database\Support\CascadeSoftDeletes;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\Relations\MorphMany;
use Illuminate\Database\Eloquent\Relations\MorphOne;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;
use Modules\Confirmation\Models\ContractConfirmation;
use Modules\Confirmation\Models\DocumentChat;
use Modules\Confirmation\Models\DocumentFile;
use Modules\Confirmation\Models\DocumentHistory;
use Modules\HR\Enums\PositionStatusEnum;
use Modules\Structure\Models\Organization;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;

class Contract extends Model
{
    use SoftDeletes, LogsActivity, CascadeSoftDeletes;

    protected $guarded = ['id'];

    protected array $cascadeDeletes = ['confirmations', 'worker_positions'];

    protected static function boot(): void
    {
        parent::boot();

        static::creating(static function ($model) {
            $uuid = (string)Str::uuid();
            $model->uuid = $uuid;
            $model->file = 'contracts/' . $uuid . '.docx';
            $model->confirmation_file = 'documents/contracts/' . $uuid . '.pdf';
        });
    }

    public static function getModelKeyName(): string
    {
        return 'contracts';
    }

    public function getActivityLogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->useLogName('Contract')
            ->logOnly([
                'organization_id',
                'type',
                'worker_id',
                'command_status',
                'user_id',
                'contract_date',
                'contract_to_date',
                'generate',
                'status',
                'deleted_at'
            ])
            ->logOnlyDirty()
            ->dontSubmitEmptyLogs();
    }

    public function worker(): BelongsTo
    {
        return $this->belongsTo(Worker::class);
    }

    public function director(): BelongsTo
    {
        return $this->belongsTo(ConfirmationWorker::class);
    }

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    public function histories(): MorphMany
    {
        return $this->morphMany(DocumentHistory::class, 'model');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
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

    public function command(): MorphOne
    {
        return $this->morphOne(Command::class, 'contract_model', 'contract_model_type', 'contract_model_id');
    }

    public function confirmations(): HasMany
    {
        return $this->hasMany(ContractConfirmation::class, 'contract_id');
    }

    public function last_vacation(): HasOne
    {
        return $this->hasOne(Vacation::class, 'contract_id')->latest('id');
    }

    public function worker_positions(): HasMany
    {
        return $this->hasMany(WorkerPosition::class, 'contract_id');
    }

    public function last_position(): HasOne
    {
        return $this->hasOne(WorkerPosition::class, 'contract_id')
            ->latest('id');
    }

    public function current_position(): HasOne
    {
        return $this->hasOne(WorkerPosition::class, 'contract_id')
            ->where('status', PositionStatusEnum::ACTIVE->value);
    }

    public function contract_position(): HasOne
    {
        return $this->hasOne(WorkerPosition::class, 'contract_id')->where('contract_position', true);
    }

    public function scopeFilter($query, $user, array $filters = [])
    {
        return QueryHelper::filterByOrganizations($query, $user, $filters);
    }

    public function scopeRemainingFilter($query)
    {
        return $query->when(request('confirmation'), function ($query, $confirmation) {
            $query->whereConfirmation($confirmation);
        })->when(request('created'), function ($query, $created) {
            $query->whereDate('created_at', $created);
        });
    }

    public function setContractDateAttribute($value): void
    {
        $this->attributes['contract_date'] = Carbon::parse($value)->format('Y-m-d');
    }

    public function scopeSearch($query): Builder
    {
        return $query
            ->when(request('search'), function ($q) {
                $q->whereLike('number', request('search'))
                    ->orWhere(function ($query) {
                        $query->whereHas('worker', fn($query) => $query->searchByFullName());
                    });
            });
    }

    public function vacation_schedule(): HasOne
    {
        return $this->hasOne(VacationSchedule::class, 'contract_id');
    }


}
