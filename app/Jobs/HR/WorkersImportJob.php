<?php

namespace App\Jobs\HR;

use App\Helpers\PositionHelper;
use App\Helpers\TranslateHelper;
use App\Models\User;
use Carbon\Carbon;
use Exception;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Log;
use Modules\HR\Enums\MaritalStatusEnum;
use Modules\HR\Enums\MedStatusEnum;
use Modules\HR\Models\Contract;
use Modules\HR\Models\Department;
use Modules\HR\Models\DepartmentPosition;
use Modules\HR\Models\Med;
use Modules\HR\Models\OrganizationDisciplinary;
use Modules\HR\Models\OrganizationIncentive;
use Modules\HR\Models\Vacation;
use Modules\HR\Models\Worker;
use Modules\HR\Models\WorkerLanguage;
use Modules\HR\Models\WorkerOldCareer;
use Modules\HR\Models\WorkerPassport;
use Modules\HR\Models\WorkerPhone;
use Modules\HR\Models\WorkerPhoto;
use Modules\HR\Models\WorkerPosition;
use Modules\HR\Models\WorkerRelative;
use Modules\HR\Models\WorkerUniversity;
use Spatie\Permission\Models\Role;

class WorkersImportJob implements ShouldQueue
{
    use Queueable;

    public int $timeout = 36000;

    protected array $organizations;

    public function __construct($organizations)
    {
        $this->organizations = $organizations;
    }

    public function handle(): void
    {
        $token = "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJodHRwczovL2FwaS1leG9kaW0ucmFpbHdheS51ei9hcGkvYXV0aC9sb2dpbiIsImlhdCI6MTc1Mzc4MjIyOSwiZXhwIjoxNzUzODY4NjI5LCJuYmYiOjE3NTM3ODIyMjksImp0aSI6InFWUEJ5bkx0MVNaMk96QUMiLCJzdWIiOiIyMzkiLCJwcnYiOiIyM2JkNWM4OTQ5ZjYwMGFkYjM5ZTcwMWM0MDA4NzJkYjdhNTk3NmY3In0.i_sZpye9YclTqA4W8Pxy29HGc7MtjqWYG78gF600_2A";

        $json = file_get_contents(base_path('database/seeders/json/regions.json'));
        $regions = collect(json_decode($json, true, 512, JSON_THROW_ON_ERROR));

        $json = file_get_contents(base_path('database/seeders/json/cities.json'));
        $cities = collect(json_decode($json, true, 512, JSON_THROW_ON_ERROR));

        $json = file_get_contents(base_path('database/seeders/json/old_base.json'));
        $old_cities = collect(json_decode($json, true, 512, JSON_THROW_ON_ERROR));

        $json = file_get_contents(base_path('database/seeders/json/old_positions.json'));
        $oldPositions = collect(json_decode($json, true, 512, JSON_THROW_ON_ERROR));

        $json = file_get_contents(base_path('database/seeders/json/workers.json'));
        $oldWorkers = json_decode($json, true, 512, JSON_THROW_ON_ERROR);

        $json = file_get_contents(base_path('database/seeders/json/univer.json'));
        $univers = collect(json_decode($json, true, 512, JSON_THROW_ON_ERROR));

        $json = file_get_contents(base_path('database/seeders/json/speciality.json'));
        $specialities = collect(json_decode($json, true, 512, JSON_THROW_ON_ERROR));

        $json = file_get_contents(base_path('database/seeders/json/incentives.json'));
        $incentives = collect(json_decode($json, true, 512, JSON_THROW_ON_ERROR));

        $json = file_get_contents(base_path('database/seeders/json/disciplinary_actions.json'));
        $disciplinary_actions = collect(json_decode($json, true, 512, JSON_THROW_ON_ERROR));

        $role = Role::findByName('Worker');

        foreach ($this->organizations as $organization) {
            $structure = Http::withToken($token)->withQueryParameters([
                'organization_id' => $organization['id']
            ])->get('https://api-exodim.railway.uz/api/v2/organization/bio/workers');

            foreach ($structure->json() as $item) {
                DB::beginTransaction();
                try {
                    $pin = preg_replace('/\D/', '', $item['jshshir']);
                    $newWorker = Worker::where('pin', $pin)->first();
                    if (!$newWorker) {
                        $city = $old_cities->where('id', $item['birth_city_id'])->first();
                        if (!$city) {
                            $city = $old_cities->first();
                        }
                        $region = $cities->where('id', $city['city_id'])->first();
                        if (!$region) {
                            $region = $cities->first();
                        }
                        $country = $regions->where('id', $region['region_id'])->first();
                        if (!$country) {
                            $country = $regions->first();
                        }
                        $current_city = $old_cities->where('id', $item['address_city_id'])->first();
                        if (!$current_city) {
                            $current_city = $old_cities->first();
                        }
                        $current_region = $cities->where('id', $city['city_id'])->first();
                        if (!$current_region) {
                            $current_region = $cities->first();
                        }
                        $passport_city = $old_cities->where('id', $item['pass_city_id'])->first();
                        if (!$passport_city) {
                            $passport_city = $old_cities->first();
                        }
                        $passport_region = $cities->where('id', $passport_city['city_id'])->first();
                        if (!$passport_region) {
                            $passport_region = $cities->first();
                        }
                        $pass_region = $regions->where('id', $passport_region['region_id'])->first();
                        if (!$pass_region) {
                            $pass_region = $regions->first();
                        }
                        $experience = Carbon::parse($item['job_date'])->diffInMonths();

                        $oldWorker = in_array((int)$pin, $oldWorkers, true);

                        $marital_status = collect($item['relatives'])->where('relative_id', 7)->first(
                        ) ? MaritalStatusEnum::TWO->value : MaritalStatusEnum::ONE->value;

                        $worker = [
                            'last_name'         => $item['last_name'],
                            'first_name'        => $item['first_name'],
                            'middle_name'       => $item['middle_name'],
                            'sex'               => $item['sex'],
                            'pin'               => $pin,
                            'country_id'        => $country['country_id'],
                            'city_id'           => $city['city_id'],
                            'region_id'         => $region['region_id'],
                            'current_city_id'   => $current_city['city_id'],
                            'current_region_id' => $current_region['region_id'],
                            'address'           => Str::squish($item['address']),
                            'birthday'          => $this->convertDate($item['birth_date']),
                            'work_experience'   => (int)round($experience),
                            'experience_date'   => $item['job_date'],
                            'nationality_id'    => $item['nationality_id'],
                            'marital_status'    => $marital_status,
                            'external'          => $item['id'],
                        ];
                        $newWorker = Worker::create($worker);

                        $passport_address = implode(', ', [$pass_region['name'], $passport_region['name'] . ' IIB']);

                        $photoUrl = 'https://api-exodim.railway.uz/storage/' . $item['photo'];
                        $newFileName = basename($photoUrl);

                        if (!$oldWorker) {
                            if ($this->checkFileExists($photoUrl)) {
                                $file = Storage::disk(config('filesystems.default'))->putFileAs(
                                    'worker-photos',
                                    $photoUrl,
                                    $newFileName
                                );
                                WorkerPhoto::create(['worker_id' => $newWorker->id, 'photo' => $file]);
                                $newWorker->update(['photo' => $file]);
                            }
                        } else {
                            $file = 'worker-photos/' . $newFileName;
                            WorkerPhoto::create(['worker_id' => $newWorker->id, 'photo' => $file]);
                            $newWorker->update(['photo' => $file]);
                        }

                        $phone = preg_replace('/\D/', '', $item['phone']);

                        if ((int)substr($phone, 2, 7) < 1000000) {
                            $phone = random_int(991111111, 999999999);
                        }

                        WorkerPhone::create(['worker_id' => $newWorker->id, 'phone' => $phone]);

                        foreach (explode(',', $item['language']) as $language) {
                            if (in_array((int)$language, [1, 2, 3, 4, 5, 7, 8, 9, 10], true)) {
                                WorkerLanguage::where(['worker_id' => $newWorker->id])->forceDelete();
                                WorkerLanguage::create([
                                    'worker_id'   => $newWorker->id,
                                    'language_id' => (int)$language
                                ]);
                            }
                        }

                        $user = User::where('worker_id', $newWorker->id)->first();

                        if (!$user) {
                            $userPhoneCount = User::where('phone', $phone)->count();
                            if (!$userPhoneCount) {
                                $user = User::create([
                                    'worker_id'       => $newWorker->id,
                                    'phone'           => $phone,
                                    'organization_id' => $organization['new_id'],
                                    'password'        => bcrypt($pin),
                                ]);
                            }
                        }

                        if ($user && !count($user->load('roles')->roles)) {
                            $user->roles()->attach($role->id, [
                                'organization_id' => $organization['new_id'],
                                'model_type'      => User::class,
                            ]);
                        }

                        $pass = collect($item['passports'])->last();
                        if ($pass) {
                            $passportFile = 'https://api-exodim.railway.uz/' . $pass['file_path'];
                            $newFileName = md5($pin) . '.' . $pass['file_extension'];

                            if (!$oldWorker) {
                                $passportFile = str_replace(' ', '%20', $passportFile);
                                $file = null;
                                if ($this->checkFileExists($passportFile)) {
                                    $file = Storage::disk(config('filesystems.default'))->putFileAs(
                                        'worker-passports',
                                        $passportFile,
                                        $newFileName
                                    );
                                }
                            } else {
                                $file = 'worker-passports/' . $newFileName;
                            }
                        }

                        $data = [
                            'worker_id'     => $newWorker->id ?? null,
                            'serial_number' => str_replace(' ', '', $item['passport']),
                            'from_date' => Carbon::parse($item['pass_date'])->setTimezone('Asia/Tashkent')->format('Y-m-d'),
                            'to_date' => Carbon::parse($item['pass_date'])->setTimezone('Asia/Tashkent')->addYear(10)->format('Y-m-d'),
                            'address'       => $passport_address,
                            'file'          => $file ?? null
                        ];

                        WorkerPassport::where(['worker_id' => $newWorker->id])->forceDelete();
                        WorkerPassport::create($data);

                        if (count($item['relatives'])) {
                            $data = [];
                            foreach ($item['relatives'] as $relative) {
                                $name = $this->parseFullName(
                                    TranslateHelper::translate($relative['fullname'], 'latin')
                                );
                                if ($name) {
                                    $data[] = [
                                        'worker_id'   => $newWorker->id ?? null,
                                        'relative'    => $this->relative($relative['relative_id']),
                                        'sort'        => $relative['sort'],
                                        'birthday'    => $this->convertDate($relative['birth_date']),
                                        'last_name'   => $name['last_name'],
                                        'first_name'  => $name['first_name'],
                                        'middle_name' => $name['middle_name'],
                                        'birth_place' => $relative['birth_place'],
                                        'post_name'   => $relative['post'],
                                        'address'     => $relative['address'],
                                    ];
                                }
                            }

                            WorkerRelative::where(['worker_id' => $newWorker->id])->forceDelete();
                            WorkerRelative::insert($data);
                        }

                        $data = [];
                        foreach ($item['careers'] as $career) {
                            $date1 = (int)$career['date1'];
                            $date2 = (int)$career['date2'];
                            if ($date1 < 1800 || $date1 > 2030 || $date2 < 1800 || $date2 > 2030) {
                                continue;
                            }
                            $data[] = [
                                'worker_id' => $newWorker->id ?? null,
                                'sort'      => $career['sort'],
                                'from_date' => Carbon::create($career['date1'])?->format('Y-m-d'),
                                'to_date'   => Carbon::create($career['date2'])?->format('Y-m-d'),
                                'post_name' => $career['staff'],
                            ];
                        }
                        WorkerOldCareer::where(['worker_id' => $newWorker->id])->forceDelete();
                        WorkerOldCareer::insert($data);

                        $position = $item['position'];

                        $department = $position['department_position']['worker_department'];

                        if (!$department) {
                            Log::error($item['id'] . ' -department is null');
                        }
                        $departmentPosition = $position['department_position'];
                        $depPos = $oldPositions->where('id', $position['id'])->first();

                        if (!$depPos) {
                            $depPos = $oldPositions->where('pos_id', $departmentPosition['worker_position_id'])->first();
                        }

                        if (!$depPos) {
                            $depPos = $oldPositions->where('id', 866)->first();
                        }

                        $newDepartment = Department::query()->where('external', $department['id'])->first();

                        if (!$newDepartment) {
                            $newDepartment = Department::create([
                                'external'        => $department['id'],
                                'name'            => $department['name'],
                                'organization_id' => $organization['new_id'],
                                'level'           => $this->deparmentLevel($department['level'])
                            ]);
                        }

                        $newDepartmentPosition = DepartmentPosition::query()->where(['external' => $departmentPosition['id']])->first();

                        if (!$newDepartmentPosition || $newDepartmentPosition->position_id !== $depPos['new_pos_id']) {
                            if ($newDepartmentPosition && $newDepartmentPosition->position_id !== $depPos['new_pos_id']) {
                                $newDepartmentPosition->rate -= 100;
                                $newDepartmentPosition->save();
                            }

                            $newDepartmentPosition = DepartmentPosition::create([
                                'department_id'   => $newDepartment->id,
                                'organization_id' => $organization['new_id'],
                                'position_id'     => $depPos['new_pos_id'],
                                'group'           => $departmentPosition['group'],
                                'rank'            => $departmentPosition['rank'],
                                'max_rank'        => $departmentPosition['max_rank'],
                                'rate'            => $position['rate'],
                                'salary'          => $departmentPosition['salary'],
                            ]);
                        }

                        $positionDate = $this->convertDate($position['position_date']) ?? '2025-05-01';

                        $contractType = $this->positionType($position['position_type']);

                        $contractLength = strlen($position['contract_number']);
                        $newContract = Contract::create(
                            [
                                'worker_id'       => $newWorker->id,
                                'organization_id' => $organization['new_id'],
                                'user_id'         => 1,
                                'director_id'     => null,
                                'number'          => $contractLength <= 15 ? $position['contract_number'] : null,
                                'contract_date'   => $positionDate,
                                'type'            => $contractType,
                                'status'          => 2,
                                'confirmation'    => 3
                            ]
                        );

                        $postName = PositionHelper::getFullPosition($newDepartmentPosition);

                        $newWorkerPosition = WorkerPosition::create([
                            'external'               => $position['id'],
                            'organization_id'        => $organization['new_id'],
                            'department_id'          => $newDepartment->id,
                            'department_position_id' => $newDepartmentPosition->id,
                            'position_id'            => $depPos['new_pos_id'],
                            'contract_id'            => $newContract->id,
                            'worker_id'              => $newWorker->id,
                            'command_id'             => null,
                            'type'                   => $contractType,
                            'group'                  => $position['group'],
                            'rank'                   => $position['rank'],
                            'rate'                   => $position['rate'],
                            'salary'                 => $position['result'],
                            'position_date'          => $positionDate,
                            'contract_position'      => true,
                            'vacation_main_day'      => 21,
                            'overstaffed'            => $position['overstaffed'],
                            'post_name'              => $postName,
                            'status'                 => 2
                        ]);

                        $med = collect($item['medical_examinations'])->where('status', 1)->first();

                        if ($med) {
                            Med::create([
                                'organization_id'    => $organization['new_id'],
                                'worker_id'          => $newWorker->id,
                                'user_id'            => 1,
                                'worker_position_id' => $newWorkerPosition->id,
                                'status'             => MedStatusEnum::ONE->value,
                                'from'               => $this->convertDate($med['date1']),
                                'to'                 => $this->convertDate($med['date2']),
                                'current'            => true
                            ]);
                        }

                        if ($item['vacation']) {
                            $vacation = collect($item['vacation']);
                            Vacation::create([
                                'organization_id'    => $organization['new_id'],
                                'worker_id'          => $newWorker->id,
                                'worker_position_id' => $newWorkerPosition->id,
                                'contract_id'        => $newContract->id,
                                'type'               => $this->categoryVacation($vacation['category_vacation_id']),
                                'from'               => $this->convertDate($vacation['date1']),
                                'to'                 => $this->convertDate($vacation['date2']),
                                'period_from'        => $this->convertDate($vacation['period1']),
                                'period_to'          => $this->convertDate($vacation['period2']),
                                'all_day'            => $vacation['all_days'],
                            ]);
                        }

                        $univers1 = $univers->where('cadry_id', $item['id']);
                        foreach ($univers1 as $univer) {
                            $spes = $specialities->where('id', $univer['speciality_id'])->first();
                            if ($spes) {
                                WorkerUniversity::create([
                                    'worker_id'     => $newWorker->id,
                                    'university_id' => $univer['university_id'],
                                    'speciality_id' => $univer['speciality_id'],
                                    'from_date'     => Carbon::create($univer['from_date'])?->format('Y-m-d'),
                                    'to_date'       => Carbon::create($univer['to_date'])?->format('Y-m-d'),
                                ]);
                            }
                        }

                        $incentives1 = $incentives->where('cadry_id', $item['id']);
                        foreach ($incentives1 as $incentive) {
                            OrganizationIncentive::create([
                                'organization_id'    => $incentive['organization_id'],
                                'worker_id'          => $newWorker->id,
                                'worker_position_id' => $newWorkerPosition->id,
                                'number'             => $incentive['number'],
                                'reason'             => $incentive['reason'],
                                'by_whom'            => $incentive['by_whom'],
                                'gift'               => $incentive['fine'],
                                'gift_type'          => $incentive['fine_type'],
                                'date'               => $incentive['date'],
                            ]);
                        }

                        $disciplinary_actions1 = $disciplinary_actions->where('cadry_id', $item['id']);
                        foreach ($disciplinary_actions1 as $disciplinary_action) {
                            OrganizationDisciplinary::create([
                                'organization_id'    => $disciplinary_action['organization_id'],
                                'worker_id'          => $newWorker->id,
                                'worker_position_id' => $newWorkerPosition->id,
                                'number'             => $disciplinary_action['number'],
                                'reason'             => $disciplinary_action['reason'],
                                'fine'               => $disciplinary_action['fine'],
                                'fine_type'          => $disciplinary_action['fine_type'],
                                'date'               => $disciplinary_action['date'],
                            ]);
                        }
                    }
                    DB::commit();
                } catch (Exception $exception) {
                    Log::error($exception->getMessage() . ' ' . $exception->getLine());
                    DB::rollBack();
                }
            }
        }
    }

    public function convertDate($date): ?string
    {
        return $date ? Carbon::parse($date)->setTimezone('Asia/Tashkent')->format('Y-m-d') : null;
    }

    public function checkFileExists($url): bool
    {
        $ch = curl_init($url);
        curl_setopt($ch, CURLOPT_NOBODY, true);
        curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        return $httpCode === 200;
    }

    public function parseFullName($fullName): ?array
    {
        $result = [
            'last_name'   => '',
            'first_name'  => '',
            'middle_name' => ''
        ];

        if (preg_match('/\((.*?)\)/u', $fullName, $matches)) {
            $alternateLastName = trim($matches[1]);
            $fullName = preg_replace('/\(.*?\)/u', '', $fullName);
        }
        $fullName = trim(preg_replace('/\s+/u', ' ', $fullName));

        $parts = explode(' ', $fullName);

        if (count($parts) === 3) {
            [$lastName, $firstName, $middleName] = $parts;
        } elseif (count($parts) === 4 && (str_contains($parts[3], "o'g'li") || str_contains(
                    $parts[3],
                    "ogli"
                ) || str_contains($parts[3], "ug'li") || str_contains($parts[3], "ugli") || str_contains(
                    $parts[3],
                    'qizi'
                ))) {
            [$lastName, $firstName, $middleName1, $middleName2] = $parts;
            $middleName = $middleName1 . ' ' . $middleName2;
        } elseif (count($parts) === 4) {
            [$lastName, $firstName, $middleName] = [$parts[0] . ' ' . $parts[1], $parts[2], $parts[3]];
        } elseif (count($parts) === 2) {
            [$lastName, $firstName] = [$parts[0], $parts[1]];
        } elseif (count($parts) === 5) {
            [$lastName1, $lastName2, $firstName, $middleName1, $middleName2] = $parts;
            $middleName = $middleName1 . ' ' . $middleName2;
            $lastName = $lastName1 . ' ' . $lastName2;
        } else {
            return null;
        }

        $result['last_name'] = $lastName;
        $result['first_name'] = $firstName;
        $result['middle_name'] = $middleName ?? '';

        if (!empty($alternateLastName)) {
            $result['last_name'] .= ' (' . $alternateLastName . ')';
        }

        return $result;
    }

    public function relative($id): int
    {
        return match ($id) {
            3 => 10,
            4 => 11,
            6 => 2,
            7 => 5,
            8 => 3,
            9 => 4,
            10 => 6,
            11 => 7,
            12 => 9,
            13 => 8,
            default => 1,
        };
    }

    public function deparmentLevel($level): int
    {
        return match ($level) {
            'department' => 2,
            'section' => 5,
            'station' => 8,
            'management' => 3,
            'around' => 11,
            'network' => 10,
            'sector' => 6,
            'plot' => 13,
            'group' => 7,
            'bureau' => 9,
            'central' => 14,
            'institution' => 12,
            default => 1,
        };
    }

    public function positionType($positionType): int
    {
        return match ($positionType) {
            2, 7 => 6,
            3 => 3,
            4, 5 => 2,
            default => 1,
        };
    }

    public function categoryVacation($type): int
    {
        return match ($type) {
            2 => 2,
            3 => 3,
            4 => 6,
            5 => 7,
            6 => 4,
            7 => 5,
            default => 1,
        };
    }
}
