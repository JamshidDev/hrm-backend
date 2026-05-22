<?php

namespace Modules\HR\Models;

use App\Helpers\QueryHelper;
use App\Models\User;
use Dyrynda\Database\Support\CascadeSoftDeletes;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphMany;
use Illuminate\Database\Eloquent\Relations\MorphOne;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;
use Modules\Confirmation\Models\ContractAdditionalConfirmation;
use Modules\Confirmation\Models\DocumentChat;
use Modules\Confirmation\Models\DocumentFile;
use Modules\Confirmation\Models\DocumentHistory;
use Modules\Structure\Models\Organization;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;

class ContractAdditional extends Model
{
    use SoftDeletes, CascadeSoftDeletes, LogsActivity;

    protected $table = 'contract_additional';

    protected $guarded = ['id'];

    protected array $cascadeDeletes = ['confirmations'];

    protected static function boot(): void
    {
        parent::boot();

        static::creating(static function ($model) {
            $uuid = (string)Str::uuid();
            $model->uuid = $uuid;
            $model->file = 'contract-additional/' . $uuid . '.docx';
            $model->confirmation_file = 'documents/contract-additional/' . $uuid . '.pdf';
        });
    }

    public function getActivityLogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->useLogName('ContractAdditional')
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

    public static function getModelKeyName(): string
    {
        return 'contract.additional';
    }

    public function worker(): BelongsTo
    {
        return $this->belongsTo(Worker::class);
    }

    public function contract(): BelongsTo
    {
        return $this->belongsTo(Contract::class);
    }

    public function command(): MorphOne
    {
        return $this->morphOne(Command::class, 'contract_model', 'contract_model_type', 'contract_model_id');
    }

    public function confirmations(): HasMany
    {
        return $this->hasMany(ContractAdditionalConfirmation::class, 'contract_additional_id');
    }

    public function histories(): MorphMany
    {
        return $this->morphMany(DocumentHistory::class, 'model');
    }

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    public function scopeFilter($query, $user, array $filters = [])
    {
        return QueryHelper::filterByOrganizations($query, $user, $filters);
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

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
