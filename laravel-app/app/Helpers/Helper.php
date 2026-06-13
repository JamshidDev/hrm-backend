<?php

namespace App\Helpers;

use Carbon\Carbon;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Modules\HR\Enums\ContractTypeEnum;
use Modules\HR\Models\Worker;
use Modules\Structure\Enums\OrganizationServiceEnum;
use Modules\Turnstile\Models\OrganizationAccessLevel;
use URL;

class Helper
{

    public static function contractTypes(): array
    {
        return [
            ContractTypeEnum::ONE->value,
            ContractTypeEnum::SIX->value,
            ContractTypeEnum::THREE->value,
        ];
    }
    public static function cleanBase64(string $base64): string
    {
        if (str_contains($base64, 'base64,')) {
            $base64 = explode('base64,', $base64)[1];
        }
        $base64 = str_replace(' ', '+', $base64);
        return preg_replace('/[^A-Za-z0-9+\/=]/', '', $base64);
    }

    public static function leadPositionIds(): array
    {
        $leadIds = [84, 399, 934, 144, 171, 232, 1546, 21, 8, 12, 16, 218, 437, 499, 822, 1503];

        $leadDeputyIds = [427, 506, 513, 514, 515, 516, 6, 12, 85, 86, 87, 93,
            425, 426, 9, 13, 27, 83, 135, 400, 421, 422, 423, 424, 504, 1392, 1506, 575, 94, 236];

        return [$leadIds, $leadDeputyIds];
    }

    public static function extractColumnsFromCollection(Collection $collection, $clearColumns): array
    {
        return $collection
            ->map(fn($item) => array_keys(self::flattenAssoc($item->toArray())))
            ->flatten()
            ->filter(fn($col) => !in_array($col, $clearColumns, true))
            ->unique()
            ->values()
            ->toArray();
    }

    public static function pad_number(int|string $number, int $length = 6): string
    {
        return str_pad((string)$number, $length, '0', STR_PAD_LEFT);
    }

    public static function setLog($e, $message = 'Error'): void
    {
        Log::error($message, [
            'message' => $e->getMessage(),
            'file' => $e->getFile(),
            'line' => $e->getLine(),
            'trace' => $e->getTraceAsString(),
        ]);
    }

    public static function flattenAssoc(array $array, string $prefix = ''): array
    {
        $result = [];

        foreach ($array as $key => $value) {
            $newKey = $prefix ? $prefix . '.' . $key : $key;

            if (is_array($value)) {
                $result += self::flattenAssoc($value, $newKey);
            } else {
                $result[$newKey] = $value;
            }
        }

        return $result;
    }

    public static function prepareExportCollection(Collection $collection, $clearColumns): array
    {
        $columns = self::extractColumnsFromCollection($collection, $clearColumns);

        return $collection->map(function ($item) use ($columns) {
            $flat = self::flattenAssoc($item->toArray());

            return collect($columns)
                ->mapWithKeys(fn($col) => [$col => $flat[$col] ?? ''])
                ->toArray();
        })->toArray();
    }


    public static function formatMinutes($minutes): string
    {
        $hours = floor($minutes / 60);
        $mins = $minutes % 60;

        $result = [];

        if ($hours > 0) {
            $result[] = "$hours soat";
        }

        if ($mins > 0) {
            $result[] = "$mins " . trans('messages.minutes');
        }

        return implode(' ', $result);
    }

    public static function userAccessLevels($user)
    {
        $accessLevelIds = Cache::get('access_level_ids_' . $user->id);
        if (!$accessLevelIds) {
            $organization = $user->load('organization.access_levels', 'organization.descendants.access_levels')
                ->organization;
            $accessLevelIds = collect();
            if ($organization) {
                $accessLevelIds = $accessLevelIds->merge($organization->access_levels->pluck('id'));
                foreach ($organization->descendants as $descendant) {
                    $accessLevelIds = $accessLevelIds->merge($descendant->access_levels->pluck('id'));
                }
            }
            $accessLevelIds = $accessLevelIds->unique()->values()->toArray();
            Cache::put('access_level_ids_' . $user->id, $accessLevelIds);
        }
        if (request('organizations')) {
            $alIds = OrganizationAccessLevel::query()
                ->whereIn('organization_id', explode(',', request('organizations')))
                ->when(request('access_levels'), function ($q) {
                    $q->whereIn('hik_central_access_level_id', explode(',', request('access_levels')));
                })
                ->pluck('hik_central_access_level_id')
                ->toArray();

            $accessLevelIds = array_intersect($accessLevelIds, $alIds ?? []);
        }
        return $accessLevelIds;
    }

    public static function formatExperience($months): string
    {
        $years = floor($months / 12);
        $remainingMonths = $months % 12;

        return ($years > 0 ? "{$years} yil " : "") . ($remainingMonths > 0 ? "{$remainingMonths} oy" : "");
    }

    public static function experienceFromDate($startDate, $endDate = null): string
    {
        $start = Carbon::parse($startDate);
        $end = $endDate ? Carbon::parse($endDate) : now();

        $diff = $start->diff($end);

        $years = $diff->y;
        $months = $diff->m;

        return ($years > 0 ? "{$years} yil " : "") . ($months > 0 ? "{$months} oy" : "");
    }


    public static function writeEnvValue($key, $value): void
    {
        $envPath = base_path('.env');
        $envContent = file_get_contents($envPath);

        $pattern = "/^{$key}=.*/m";
        $replacement = "{$key}={$value}";

        if (preg_match($pattern, $envContent)) {
            $envContent = preg_replace($pattern, $replacement, $envContent);
        } else {
            $envContent .= PHP_EOL . $replacement;
        }

        file_put_contents($envPath, $envContent);
    }

    public static function writeOrAppendEnvValue($key, $value): void
    {
        self::writeEnvValue($key, $value);
    }

    public static function response($msg = true, $data = [], $status = 200): JsonResponse
    {
        return response()->json([
            'message' => $msg,
            'error' => $status !== 200,
            'data' => $data
        ], $status);
    }

    public static function userRoleAndPermissions($roles, $currentOrganizationId)
    {
        $currentRole = [];
        $r = false;
        foreach ($roles as $role) {
            if ($role->pivot->organization_id === $currentOrganizationId) {
                $currentRole = $role;
                $r = true;
                break;
            }
        }

        if (!$r) {
            $currentRole = $roles->first();
        }

        return $currentRole;
    }

    public static function fileUrl($filePath): ?string
    {
        if ($filePath) {
            return Storage::disk('minio-external')
                ->temporaryUrl(
                    $filePath,
                    now()->addMinutes(30)
                );
        }
        return null;
    }

    public static function documentSignedUrl($uuid, $model): string
    {
        return URL::temporarySignedRoute(
            'only_office_file',
            now()->addMinutes(30),
            [
                'uuid' => $uuid,
                'model' => $model
            ]
        );
    }

    public static function organizationServices($services): array
    {
        $data = [];

        foreach (OrganizationServiceEnum::all() as $key => $item) {
            $status = $services->where('key', $key)->first();

            $data[] = [
                'key' => $key,
                'name' => $item,
                'active' => $status?->active === 1,
            ];
        }

        return $data;
    }

    public static function idUuid($uuid)
    {
        if ($uuid) {
            $id = Cache::get($uuid);

            if (!$id) {
                $id = Worker::whereUuid($uuid)->first()?->id;
                Cache::put($uuid, $id);
            }
            return $id;
        }
        return null;
    }

    public static function generateDocumentNumber($document, $model, $type): string
    {
        $year = Carbon::parse($document->application_date)->year;
        $lastNumber = $model::where('organization_id', $document->organization_id)
            ->where('year', $year)
            ->max('number');

        return $lastNumber + 1;
    }

    public static function getDateTex($date): string
    {
        $year = $date->format('Y');
        $month = $date->format('m');
        $day = $date->format('d');

        return $year . '-yil ' . $day . '-' . self::getMonth((int)$month);
    }

    public static function getMonth($month): ?string
    {
        $monthNames = [
            1 => 'yanvar',
            2 => 'fevral',
            3 => 'mart',
            4 => 'aprel',
            5 => 'may',
            6 => 'iyun',
            7 => 'iyul',
            8 => 'avgust',
            9 => 'sentyabr',
            10 => 'oktyabr',
            11 => 'noyabr',
            12 => 'dekabr'
        ];

        return $monthNames[$month] ?? null;
    }

    public static function ranks(): array
    {
        return [
            [
                'id' => '1',
                'name' => '1'
            ],
            [
                'id' => '2',
                'name' => '2'
            ],
            [
                'id' => '3',
                'name' => '3'
            ],
            [
                'id' => '4',
                'name' => '4'
            ],
            [
                'id' => '4x',
                'name' => '4x'
            ],
            [
                'id' => '5',
                'name' => '5'
            ],
            [
                'id' => '6',
                'name' => '6'
            ],
            [
                'id' => '7',
                'name' => '7'
            ],
            [
                'id' => '8',
                'name' => '8'
            ],
            [
                'id' => '9',
                'name' => '9'
            ],
            [
                'id' => '10',
                'name' => '10'
            ],
            [
                'id' => '10x',
                'name' => '10x'
            ],
            [
                'id' => '11',
                'name' => '11'
            ],
            [
                'id' => '12',
                'name' => '12'
            ],
            [
                'id' => '12x',
                'name' => '12x'
            ],
            [
                'id' => '13',
                'name' => '13'
            ],
            [
                'id' => '14',
                'name' => '14'
            ],
            [
                'id' => '15',
                'name' => '15'
            ],
            [
                'id' => '15x',
                'name' => '15x'
            ],
            [
                'id' => '16',
                'name' => '16'
            ],
            [
                'id' => '17',
                'name' => '17'
            ],
            [
                'id' => '18',
                'name' => '18'
            ]
        ];
    }

    public static function groups(): array
    {
        return [
            [
                'id' => 0,
                'name' => '0г'
            ],
            [
                'id' => 1,
                'name' => '1г'
            ],
            [
                'id' => 2,
                'name' => '2г'
            ],
            [
                'id' => 3,
                'name' => '3г'
            ]
        ];
    }

    public static function phoneFormat($phone, $code = 'uzb'): string
    {
        if (!$phone) {
            return '';
        }

        if ($code === 'uzb') {
            if (is_array($phone)) {
                $arr = [];
                foreach ($phone as $v) {
                    $arr[] = self::formatUzPhoneNumber([$v])[0];
                }
                return implode(',', $arr);
            }
            return self::formatUzPhoneNumber([$phone])[0];
        }

        return $phone;
    }

    public static function formatUzPhoneNumber($phones): array
    {
        $p = [];
        foreach ($phones as $phone) {
            $p[] = sprintf(
                "(%s)-%s-%s-%s",
                substr($phone, 0, 2),
                substr($phone, 2, 3),
                substr($phone, 5, 2),
                substr($phone, 7, 2)
            );
        }
        return $p;
    }

    public static function sanitizeInsertData(array $data, Model $model): array
    {
        $fillable = $model->getFillable();
        $now = Carbon::now();

        return array_map(static function ($row) use ($fillable, $now) {
            $cleanRow = Arr::only($row, $fillable);
            $cleanRow['created_at'] = $now;
            $cleanRow['updated_at'] = $now;
            return $cleanRow;
        }, $data);
    }

    public static function getFileTypes($type): array
    {
        return match ($type) {
            'image' => [
                'jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp', 'svg', 'tiff', 'tif', 'ico', 'heic', 'heif'
            ],
            'audio' => [
                'mp3', 'wav', 'ogg', 'aac', 'flac', 'wma', 'mp4', 'webm'
            ],
            'video' => [
                'mp4', 'webm', 'ogg', 'avi', 'wmv', 'mpeg', '3gp', 'mov'
            ],
            'document' => [
                'pdf', 'PDF', 'doc', 'docx', 'xls', 'xlsx',
                'ppt', 'pptx', 'txt', 'rtf', 'odt', 'zip'
            ]
        };
    }

    public static function normalizeNumber($value): float
    {
        $value = str_replace(
            [
                "\xc2\xa0", // no-break space
                ' ',
                ',',
                '-',
                '–',
                '—',
            ],
            [
                '', '', '.', '', '', ''
            ],
            $value
        );

        return (float)$value;
    }

}
