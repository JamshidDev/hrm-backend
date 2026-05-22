<?php

    namespace Modules\HR\Models;

    use App\Helpers\Helper;
    use Carbon\Carbon;
    use Illuminate\Database\Eloquent\Model;
    use Illuminate\Database\Eloquent\Relations\BelongsTo;
    use Illuminate\Database\Eloquent\Relations\HasMany;
    use Illuminate\Database\Eloquent\SoftDeletes;


    class WorkerRelative extends Model
    {
        use SoftDeletes;


        protected $guarded = ['id'];

        public function full_name(): string
        {
            return $this->last_name . ' ' . $this->first_name . ' ' . $this->middle_name;
        }

        public function worker(): BelongsTo
        {
            return $this->belongsTo(Worker::class);
        }

        public function disabilities(): HasMany
        {
            return $this->hasMany(WorkerRelativeDisability::class);
        }

        public function relative_worker(): BelongsTo
        {
            return $this->belongsTo(Worker::class, 'relative_worker_id');
        }

        public function setBirthdayAttribute($value): void
        {
            $this->attributes['birthday'] = Carbon::parse($value)->format('Y-m-d');
        }

        public function scopeFilter($query)
        {
            return $query->where('worker_id', Helper::idUuid(request('uuid')));
        }

        public function scopeSearch($query)
        {
            return $query
                ->when(request('relative'), function ($q, $relative) {
                    $q->where('relative', $relative);
                })
                ->when(request('last_name'), function ($q, $last_name) {
                    $q->whereLike('last_name', "%$last_name%");
                })
                ->when(request('first_name'), function ($q, $first_name) {
                    $q->whereLike('first_name', "%$first_name%");
                })
                ->when(request('middle_name'), function ($q, $middle_name) {
                    $q->whereLike('middle_name', "%$middle_name%");
                })
                ->when(request('birth_place'), function ($q, $birth_place) {
                    $q->whereLike('birth_place', "%$birth_place%");
                })
                ->when(request('post_name'), function ($q, $post_name) {
                    $q->whereLike('post_name', "%$post_name%");
                })
                ->when(request('address'), function ($q, $address) {
                    $q->whereLike('address', "%$address%");
                })
                ->when(request('birthday'), function ($q, $birthday) {
                    $q->whereDate('birthday', $birthday);
                });
        }

    }
