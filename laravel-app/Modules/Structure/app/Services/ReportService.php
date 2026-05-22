<?php

namespace Modules\Structure\Services;

use App\Helpers\ConvertHelper;
use App\Helpers\Helper;
use App\Traits\Base64FileUploadTrait;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection as SupportCollection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use Maatwebsite\Excel\Facades\Excel;
use Modules\Confirmation\Enums\ConfirmationStatusEnum;
use Modules\Confirmation\Models\ReportConfirmation;
use Modules\HR\Enums\CommandTypeEnum;
use Modules\HR\Enums\ContractTypeEnum;
use Modules\HR\Enums\PositionStatusEnum;
use Modules\HR\Models\ConfirmationWorker;
use Modules\HR\Models\Contract;
use Modules\HR\Models\DepartmentPosition;
use Modules\Structure\Enums\EducationEnum;
use Modules\Structure\Exports\ReportOneStatsExport;
use Modules\Structure\Exports\ReportThreeStatsExport;
use Modules\Structure\Exports\ReportTwoStatsExport;
use Modules\Structure\Models\Organization;
use Modules\Structure\Models\Report;
use Modules\Structure\Models\ReportDetail;
use Modules\Structure\Exceptions\StructureServiceException;
use Modules\Structure\Models\ReportMothPer;
use PhpOffice\PhpWord\TemplateProcessor;
use Symfony\Component\HttpFoundation\BinaryFileResponse;
use Throwable;

class ReportService
{
    use Base64FileUploadTrait;

    private SupportCollection $rows;
    private int $maxDepth = 1;

    public function monthHiringFull(array $organizationIds, int $month, int $year): SupportCollection
    {
        $univerId = 1;
        $monthlyContracts = DB::table('contracts as c')
            ->selectRaw('c.organization_id, c.worker_id, MIN(c.contract_date) as hired_at')
            ->whereIn('c.organization_id', $organizationIds)
            ->whereMonth('c.contract_date', $month)
            ->whereYear('c.contract_date', $year)
            ->where('confirmation', ConfirmationStatusEnum::SUCCESS->value)
            ->whereNull('c.deleted_at')
            ->whereNotNull('c.worker_id')
            ->whereExists(function ($query) {
                $query->select(DB::raw(1))
                    ->from('worker_positions as wp')
                    ->whereColumn('wp.contract_id', 'c.id')
                    ->where('wp.contract_position', true)
                    ->where('wp.status', PositionStatusEnum::ACTIVE->value)
                    ->whereNull('wp.deleted_at');
            })
            ->groupBy('c.organization_id', 'c.worker_id');

        return DB::query()
            ->fromSub($monthlyContracts, 'mc')
            ->join('workers as w', 'w.id', '=', 'mc.worker_id')
            ->selectRaw("
                mc.organization_id,
                COUNT(*) as month_created,
                COUNT(*) FILTER (
                    WHERE EXISTS (
                        SELECT 1
                        FROM contracts old_c
                        WHERE old_c.worker_id = mc.worker_id
                          AND old_c.deleted_at IS NULL
                          AND old_c.contract_date < mc.hired_at
                    )
                ) as month_updated,
                COUNT(*) FILTER (
                    WHERE EXISTS (
                        SELECT 1
                        FROM contracts old_c
                        WHERE old_c.worker_id = mc.worker_id
                          AND old_c.deleted_at IS NULL
                          AND old_c.contract_date < mc.hired_at
                    )
                    AND w.sex = '1'
                ) as month_updated_men,
                COUNT(*) FILTER (
                    WHERE EXISTS (
                        SELECT 1
                        FROM contracts old_c
                        WHERE old_c.worker_id = mc.worker_id
                          AND old_c.deleted_at IS NULL
                          AND old_c.contract_date < mc.hired_at
                    )
                    AND w.sex = '0'
                ) as month_updated_women,
                COUNT(*) FILTER (
                    WHERE NOT EXISTS (
                        SELECT 1
                        FROM contracts old_c
                        WHERE old_c.worker_id = mc.worker_id
                          AND old_c.deleted_at IS NULL
                          AND old_c.contract_date < mc.hired_at
                    )
                ) as month_other_created,
                COUNT(*) FILTER (
                    WHERE NOT EXISTS (
                        SELECT 1
                        FROM contracts old_c
                        WHERE old_c.worker_id = mc.worker_id
                          AND old_c.deleted_at IS NULL
                          AND old_c.contract_date < mc.hired_at
                    )
                    AND w.sex = '1'
                ) as month_other_created_men,
                COUNT(*) FILTER (
                    WHERE NOT EXISTS (
                        SELECT 1
                        FROM contracts old_c
                        WHERE old_c.worker_id = mc.worker_id
                          AND old_c.deleted_at IS NULL
                          AND old_c.contract_date < mc.hired_at
                    )
                    AND w.sex = '0'
                ) as month_other_created_women,
                COUNT(*) FILTER (
                    WHERE DATE_PART('year', AGE(w.birthday)) < 30
                ) as month_created_30,
                COUNT(*) FILTER (
                    WHERE EXISTS (
                        SELECT 1
                        FROM worker_universities wu
                        JOIN universities u ON u.id = wu.university_id
                        WHERE wu.worker_id = mc.worker_id
                          AND wu.deleted_at IS NULL
                          AND u.deleted_at IS NULL
                          AND u.type = 1
                          AND u.id = {$univerId}
                    )
                ) as month_created_univer,
                COUNT(*) FILTER (
                    WHERE EXISTS (
                        SELECT 1
                        FROM worker_universities wu
                        JOIN universities u ON u.id = wu.university_id
                        WHERE wu.worker_id = mc.worker_id
                          AND wu.deleted_at IS NULL
                          AND u.deleted_at IS NULL
                          AND u.type = 3
                    )
                ) as month_created_tex,
                COUNT(*) FILTER (
                    WHERE EXISTS (
                        SELECT 1
                        FROM worker_universities wu
                        JOIN universities u ON u.id = wu.university_id
                        WHERE wu.worker_id = mc.worker_id
                          AND wu.deleted_at IS NULL
                          AND u.deleted_at IS NULL
                          AND u.type = 1
                          AND u.id <> {$univerId}
                    )
                ) as month_created_other_univer,
                COUNT(*) FILTER (
                    WHERE EXISTS (
                        SELECT 1
                        FROM worker_universities wu
                        JOIN universities u ON u.id = wu.university_id
                        WHERE wu.worker_id = mc.worker_id
                          AND wu.deleted_at IS NULL
                          AND u.deleted_at IS NULL
                          AND u.type = 2
                    )
                ) as month_created_coll,
                COUNT(*) FILTER (
                    WHERE NOT EXISTS (
                        SELECT 1
                        FROM worker_universities wu
                        WHERE wu.worker_id = mc.worker_id
                          AND wu.deleted_at IS NULL
                    )
                ) as month_created_school,
                0 as month_created_band
            ")
            ->groupBy('mc.organization_id')
            ->get();
    }

    public function monthTerminationFull(array $organizationIds, int $month, int $year): SupportCollection
    {
        $terminationTypes = range(
            CommandTypeEnum::THIRTY_ONE->value,
            CommandTypeEnum::THIRTY_NINE->value
        );

        return DB::table('commands as cmd')
            ->selectRaw('cmd.organization_id, COUNT(DISTINCT cmd.command_number) as month_deleted')
            ->whereIn('cmd.organization_id', $organizationIds)
            ->whereIn('cmd.type', $terminationTypes)
            ->whereMonth('cmd.command_date', $month)
            ->whereYear('cmd.command_date', $year)
            ->whereConfirmation(ConfirmationStatusEnum::SUCCESS->value)
            ->whereNull('cmd.deleted_at')
            ->groupBy('cmd.organization_id')
            ->get();
    }

    private function checkGeneratePermission($report, $organizationId, $orgPers): bool
    {
        $now = Carbon::now();
        $today = $now->toDateTimeString();
        $lastDay = Carbon::create($now->year, $now->month, 10);

        if ($lastDay->isSaturday()) {
            $lastDay = $lastDay->addDay(2)->endOfDay()->toDateTimeString();
        } else if ($lastDay->isSunday()) {
            $lastDay = $lastDay->addDay()->endOfDay()->toDateTimeString();
        }

        if ($today > $lastDay) {
            if ($orgPers[$organizationId] ?? null) {
                return true;
            }
            return false;
        }
        return true;
    }

    public function generate(Request $request): JsonResponse
    {
        $request->validate([
            'organizations' => 'required|array'
        ]);

        $user = auth()->user();
        $reportDate = now()->subMonth();
        $month = $reportDate->month;
        $year = $reportDate->year;
        $organizationIds = $request->organizations;

        if (Report::query()
            ->whereIn('organization_id', $organizationIds)
            ->where('year', $year)
            ->where('month', $month)
            ->where('confirmation', ConfirmationStatusEnum::SUCCESS->value)->exists()) {
            throw new \Exception(trans("Ushbu tashkilotda joriy oy uchun hisobot allaqachon imzolangan!"));
        }

        //Amaldagi xodimlar statistikasi
        $today = Carbon::today()->toDateString();

        $contractTypes = Helper::contractTypes();
        $contractTypeValues = implode(',', $contractTypes);

        $workerStats = DB::table('worker_positions as wp')
            ->join('workers as w', 'w.id', '=', 'wp.worker_id')
            ->join('contracts as c', 'c.id', '=', 'wp.contract_id')
            ->where('wp.status', PositionStatusEnum::ACTIVE->value)
            ->leftJoin('worker_disabilities as wd', function ($join) use ($today) {
                $join->on('wd.worker_id', '=', 'w.id')
                    ->whereNull('wd.deleted_at')
                    ->where(function ($query) use ($today) {
                        $query->whereNull('wd.from')
                            ->orWhere('wd.from', '<=', $today);
                    })
                    ->where(function ($query) use ($today) {
                        $query->whereNull('wd.to')
                            ->orWhere('wd.to', '>=', $today);
                    });
            })
            ->leftJoin('vacations as v', function ($join) use ($today) {
                $join->on('v.worker_id', '=', 'w.id')
                    ->on('v.contract_id', '=', 'c.id')
                    ->whereNull('v.deleted_at')
                    ->where(function ($query) use ($today) {
                        $query->where("v.to", '>=', $today);
                    });
            })
            ->whereNull('wp.deleted_at')
            ->whereNull('c.deleted_at')
            ->where('wp.contract_position', true)
            ->whereIn('wp.organization_id', $organizationIds)
            ->selectRaw("
                wp.organization_id,

                COUNT(DISTINCT w.id) FILTER (WHERE wp.type IN ($contractTypeValues)) as total,

                SUM(wp.rate) as total_rate,

                COUNT(DISTINCT w.id) FILTER (WHERE w.sex = '1' AND wp.type IN ($contractTypeValues)) as men,
                COUNT(DISTINCT w.id) FILTER (WHERE w.sex = '0' AND wp.type IN ($contractTypeValues)) as women,

                COUNT(DISTINCT w.id) FILTER (WHERE c.type = " . ContractTypeEnum::TWO->value . ") as part_time_contract,

                COUNT(DISTINCT w.id) FILTER (WHERE w.education = 1 AND wp.type IN ($contractTypeValues)) as higher_count,
                COUNT(DISTINCT w.id) FILTER (WHERE w.education = 1 AND w.sex = '1' AND wp.type IN ($contractTypeValues)) as higher_men_count,
                COUNT(DISTINCT w.id) FILTER (WHERE w.education = 1 AND w.sex = '0' AND wp.type IN ($contractTypeValues)) as higher_women_count,

                COUNT(DISTINCT w.id) FILTER (WHERE w.education = 2 AND wp.type IN ($contractTypeValues)) as special_count,
                COUNT(DISTINCT w.id) FILTER (WHERE w.education = 2 AND w.sex = '1' AND wp.type IN ($contractTypeValues)) as special_men_count,
                COUNT(DISTINCT w.id) FILTER (WHERE w.education = 2 AND w.sex = '0' AND wp.type IN ($contractTypeValues)) as special_women_count,

                COUNT(DISTINCT w.id) FILTER (WHERE w.education = 3 AND wp.type IN ($contractTypeValues)) as middle_count,
                COUNT(DISTINCT w.id) FILTER (WHERE w.education = 3 AND w.sex = '1' AND wp.type IN ($contractTypeValues)) as middle_men_count,
                COUNT(DISTINCT w.id) FILTER (WHERE w.education = 3 AND w.sex = '0' AND wp.type IN ($contractTypeValues)) as middle_women_count,

                COUNT(DISTINCT w.id) FILTER (
                    WHERE w.birthday >= CURRENT_DATE - INTERVAL '30 years' AND wp.type IN ($contractTypeValues)
                ) as age_under_30,

                COUNT(DISTINCT w.id) FILTER (
                    WHERE w.birthday >= CURRENT_DATE - INTERVAL '30 years' AND wp.type IN ($contractTypeValues)
                      AND w.sex = true
                ) as age_under_30_men,

                COUNT(DISTINCT w.id) FILTER (
                    WHERE w.birthday >= CURRENT_DATE - INTERVAL '30 years' AND wp.type IN ($contractTypeValues)
                      AND w.sex = false
                ) as age_under_30_women,


                COUNT(DISTINCT w.id) FILTER (
                    WHERE w.birthday < CURRENT_DATE - INTERVAL '30 years' AND wp.type IN ($contractTypeValues)
                      AND w.birthday >= CURRENT_DATE - INTERVAL '45 years'
                ) as age_31_45,

                COUNT(DISTINCT w.id) FILTER (
                    WHERE w.birthday < CURRENT_DATE - INTERVAL '30 years' AND wp.type IN ($contractTypeValues)
                      AND w.birthday >= CURRENT_DATE - INTERVAL '45 years'
                      AND w.sex = true
                ) as age_31_45_men,

                COUNT(DISTINCT w.id) FILTER (
                    WHERE w.birthday < CURRENT_DATE - INTERVAL '30 years' AND wp.type IN ($contractTypeValues)
                      AND w.birthday >= CURRENT_DATE - INTERVAL '45 years'
                      AND w.sex = false
                ) as age_31_45_women,


                COUNT(DISTINCT w.id) FILTER (
                    WHERE w.birthday < CURRENT_DATE - INTERVAL '45 years' AND wp.type IN ($contractTypeValues)
                ) as age_46_plus,

                COUNT(DISTINCT w.id) FILTER (
                    WHERE w.birthday < CURRENT_DATE - INTERVAL '45 years' AND wp.type IN ($contractTypeValues)
                      AND w.sex = true
                ) as age_46_plus_men,

                COUNT(DISTINCT w.id) FILTER (
                    WHERE w.birthday < CURRENT_DATE - INTERVAL '45 years' AND wp.type IN ($contractTypeValues)
                      AND w.sex = false
                ) as age_46_plus_women,

                COUNT(DISTINCT w.id) FILTER (
                    WHERE (
                        (w.sex = '1' AND DATE_PART('year', AGE(w.birthday)) >= 60) AND wp.type IN ($contractTypeValues)
                        OR
                        (w.sex = '0' AND DATE_PART('year', AGE(w.birthday)) >= 55) AND wp.type IN ($contractTypeValues)
                    )
                ) as pension_age_count,
                COUNT(DISTINCT w.id) FILTER (
                    WHERE w.sex = '1'
                      AND DATE_PART('year', AGE(w.birthday)) >= 60 AND wp.type IN ($contractTypeValues)
                ) as pension_count_men,
                COUNT(DISTINCT w.id) FILTER (
                    WHERE w.sex = '0'
                      AND DATE_PART('year', AGE(w.birthday)) >= 55 AND wp.type IN ($contractTypeValues)
                ) as pension_count_women,

                COUNT(DISTINCT w.id) FILTER (WHERE wd.id IS NOT NULL AND wp.type IN ($contractTypeValues)) as disability_count,
                COUNT(DISTINCT w.id) FILTER (WHERE wd.id IS NOT NULL AND w.sex = '1' AND wp.type IN ($contractTypeValues)) as disability_men_count,
                COUNT(DISTINCT w.id) FILTER (WHERE wd.id IS NOT NULL AND w.sex = '0' AND wp.type IN ($contractTypeValues)) as disability_women_count,

                COUNT(DISTINCT w.id) FILTER (WHERE v.id IS NOT NULL AND v.type IN (45, 46, 49) AND wp.type IN ($contractTypeValues)) as vacation_count,
                COUNT(DISTINCT w.id) FILTER (WHERE v.id IS NOT NULL AND v.type IN (45, 46, 49) AND w.sex = '1' AND wp.type IN ($contractTypeValues)) as vacation_count_men,
                COUNT(DISTINCT w.id) FILTER (WHERE v.id IS NOT NULL AND v.type IN (45, 46, 49) AND w.sex = '0' AND wp.type IN ($contractTypeValues)) as vacation_count_women
            ")
            ->groupBy('wp.organization_id')
            ->get()
            ->keyBy('organization_id');

        // Tasdiqlangan shtat birliklari
        $approvedStats = DepartmentPosition::query()
            ->whereIn('organization_id', $organizationIds)
            ->selectRaw("
                organization_id,
                COALESCE(SUM(rate),0) as approved
            ")
            ->whereNull('deleted_at')
            ->groupBy('organization_id')
            ->get()
            ->keyBy('organization_id');


        $createdStats = collect($this->monthHiringFull($organizationIds, $month, $year))
            ->keyBy('organization_id');
        $deletedStats = collect($this->monthTerminationFull($organizationIds, $month, $year))
            ->keyBy('organization_id');

        // Qabul qilingan xodimlar
        $ws = Contract::query()
            ->whereIn('organization_id', $organizationIds)
            ->whereMonth('contract_date', $month)
            ->whereYear('contract_date', $year)
            ->whereHas('contract_position')
            ->with([
                'worker.universities',
                'worker.universities.university',
                'worker.universities.speciality',
                'contract_position',
                'contract_position.organization',
                'contract_position.position',
                'worker.all_positions.organization',
                'worker.all_positions.position',
                'command'
            ])
            ->get()
            ->groupBy('organization_id');

        $result = [];
        if (count($organizationIds)) {
            $organizations = Organization::whereIn('id', $organizationIds)->get();
            $report = Report::updateOrCreate([
                'user_id' => $user->id,
                'year' => $year,
                'month' => $month,
                'organization_id' => $user->organization_id
            ]);

            ReportDetail::where('report_id', $report->id)->forceDelete();
            foreach ($organizationIds as $orgId) {
                $organization = $organizations->firstWhere('id', $orgId);
                $stat = (object)array_merge(
                    (array)($createdStats->get($orgId) ?? []),
                    (array)($deletedStats->get($orgId) ?? [])
                );
                $workers = $workerStats[$orgId] ?? null;
                $approved = $approvedStats[$orgId]->approved ?? 0;
                $active = $workers->total_rate ?? 0;
                $vacancies = $approved - $active;
                if ($vacancies < 0) {
                    $vacancies = 0;
                }
                $statValues = [
                    'all_rate' => number_format($approved / 100, 2),
                    'workers_count' => $workers->total ?? 0,
                    'men' => $workers->men ?? 0,
                    'women' => $workers->women ?? 0,
                    'vacancies' => number_format(($vacancies) / 100, 2),
                    'part_time_contract' => $workers->part_time_contract ?? 0,
                    'month_created' => $stat->month_created ?? 0,
                    'month_updated' => $stat->month_updated ?? 0,
                    'month_updated_men' => $stat->month_updated_men ?? 0,
                    'month_updated_women' => $stat->month_updated_women ?? 0,
                    'month_other_created' => $stat->month_other_created ?? 0,
                    'month_other_created_men' => $stat->month_other_created_men ?? 0,
                    'month_other_created_women' => $stat->month_other_created_women ?? 0,
                    'month_created_30' => $stat->month_created_30 ?? 0,
                    'month_created_univer' => $stat->month_created_univer ?? 0,
                    'month_created_tex' => $stat->month_created_tex ?? 0,
                    'month_created_other_univer' => $stat->month_created_other_univer ?? 0,
                    'month_created_coll' => $stat->month_created_coll ?? 0,
                    'month_created_school' => $stat->month_created_school ?? 0,
                    'month_created_band' => $stat->month_created_band ?? 0,
                    'month_deleted' => $stat->month_deleted ?? 0,
                    'higher_count' => $workers->higher_count ?? 0,
                    'higher_men_count' => $workers->higher_men_count ?? 0,
                    'higher_women_count' => $workers->higher_women_count ?? 0,
                    'special_count' => $workers->special_count ?? 0,
                    'special_men_count' => $workers->special_men_count ?? 0,
                    'special_women_count' => $workers->special_women_count ?? 0,
                    'middle_count' => $workers->middle_count ?? 0,
                    'middle_men_count' => $workers->middle_men_count ?? 0,
                    'middle_women_count' => $workers->middle_women_count ?? 0,
                    'age_under_30' => $workers->age_under_30 ?? 0,
                    'age_under_30_men' => $workers->age_under_30_men ?? 0,
                    'age_under_30_women' => $workers->age_under_30_women ?? 0,
                    'age_31_45' => $workers->age_31_45 ?? 0,
                    'age_31_45_men' => $workers->age_31_45_men ?? 0,
                    'age_31_45_women' => $workers->age_31_45_women ?? 0,
                    'age_46_plus' => $workers->age_46_plus ?? 0,
                    'age_46_plus_men' => $workers->age_46_plus_men ?? 0,
                    'age_46_plus_women' => $workers->age_46_plus_women ?? 0,
                    'pension_age_count' => $workers->pension_age_count ?? 0,
                    'pension_count_men' => $workers->pension_count_men ?? 0,
                    'pension_count_women' => $workers->pension_count_women ?? 0,
                    'vacation_count' => $workers->vacation_count ?? 0,
                    'vacation_count_men' => $workers->vacation_count_men ?? 0,
                    'vacation_count_women' => $workers->vacation_count_women ?? 0,
                    'disability_count' => $workers->disability_count ?? 0,
                    'disability_men_count' => $workers->disability_men_count ?? 0,
                    'disability_women_count' => $workers->disability_women_count ?? 0
                ];
                $res = [
                    'organization_id' => $orgId,
                    'organization_name' => $organization?->name,
                    'stats' => $this->buildStats($statValues)
                ];

                $cData = [];
                if ($stat && ($ws[$orgId] ?? null)) {
                    foreach ($ws[$orgId] as $contract) {
                        $lastPosition = $contract
                            ->worker
                            ->all_positions
                            ->where('contract_id', '!=', $contract->id)
                            ->sortByDesc('position_date')
                            ->first();
                        if ($contract->command) {
                            $cmN = '№ ' . $contract->command?->command_number . ', ' . $contract->command?->command_date;
                        } else {
                            $cmN = '';
                        }

                        $cData[] = [
                            'id' => $contract->id,
                            'organization' => $contract->organization->name,
                            'full_name' => $contract->worker->full_name(),
                            'birthday' => $contract->worker->birthday,
                            'position_name' => $contract->contract_position?->position?->name,
                            'educations' => EducationEnum::get($contract->worker->education) . ', ' .
                                $contract->worker->fullEducations(),
                            'old_organization_name' => $lastPosition?->organization->name,
                            'old_position_name' => $lastPosition?->position->name,
                            'old_position_date' => $lastPosition?->to,
                            'command' => $cmN,
                            'command_reason' => '',
                            'type' => ContractTypeEnum::getMinimized($contract->type),
                        ];
                    }
                }
                $res['contracts'] = $cData;

                $reportDetail = ReportDetail::updateOrCreate(
                    [
                        'organization_id' => $orgId,
                        'report_id' => $report->id
                    ],
                    [
                        'data' => $res
                    ]
                );

                $result[] = [
                    'reportId' => $reportDetail->id,
                    'data' => $res
                ];
            }
        }

        return Helper::response(true, [
            'report' => $report ?? null,
            'data' => $result
        ]);
    }

    private function buildStats(array $values): array
    {
        $stats = [];

        foreach ($this->labels() as $label) {
            if (!empty($label['man_woman'])) {
                foreach ($label['man_woman'] as $subKey) {
                    $stats[] = [
                        'key' => $subKey,
                        'value' => $values[$subKey] ?? 0
                    ];
                }
            }

            $stats[] = [
                'key' => $label['key'],
                'value' => $values[$label['key']] ?? 0
            ];
        }

        return $stats;
    }

    public function labels(): array
    {
        return [
            [
                'name' => trans('messages.report.labels.all_rate'),
                'key' => 'all_rate'
            ],
            [
                'name' => trans('messages.report.labels.workers_count'),
                'key' => 'workers_count'
            ],
            [
                'name' => trans('messages.report.labels.men'),
                'key' => 'men'
            ],
            [
                'name' => trans('messages.report.labels.women'),
                'key' => 'women'
            ],
            [
                'name' => trans('messages.report.labels.vacancies'),
                'key' => 'vacancies'
            ],
            [
                'name' => trans('messages.report.labels.part_time_contract'),
                'key' => 'part_time_contract'
            ],
            [
                'name' => trans('messages.report.labels.month_created'),
                'key' => 'month_created'
            ],
            [
                'name' => trans('messages.report.labels.month_updated'),
                'key' => 'month_updated',
                'man_woman' => ['month_updated_men', 'month_updated_women']
            ],
            [
                'name' => trans('messages.report.labels.month_other_created'),
                'key' => 'month_other_created',
                'man_woman' => ['month_other_created_men', 'month_other_created_women']
            ],
            [
                'name' => trans('messages.report.labels.month_created_30'),
                'key' => 'month_created_30'
            ],
            [
                'name' => trans('messages.report.labels.month_created_univer'),
                'key' => 'month_created_univer'
            ],
            [
                'name' => trans('messages.report.labels.month_created_tex'),
                'key' => 'month_created_tex'
            ],
            [
                'name' => trans('messages.report.labels.month_created_other_univer'),
                'key' => 'month_created_other_univer'
            ],
            [
                'name' => trans('messages.report.labels.month_created_coll'),
                'key' => 'month_created_coll'
            ],
            [
                'name' => trans('messages.report.labels.month_created_school'),
                'key' => 'month_created_school'
            ],
            [
                'name' => trans('messages.report.labels.month_created_band'),
                'key' => 'month_created_band',
                'change' => true
            ],
            [
                'name' => trans('messages.report.labels.month_deleted'),
                'key' => 'month_deleted'
            ],
            [
                'name' => trans('messages.report.labels.higher_count'),
                'key' => 'higher_count',
                'man_woman' => ['higher_men_count', 'higher_women_count']
            ],
            [
                'name' => trans('messages.report.labels.special_count'),
                'key' => 'special_count',
                'man_woman' => ['special_men_count', 'special_women_count']
            ],
            [
                'name' => trans('messages.report.labels.middle_count'),
                'key' => 'middle_count',
                'man_woman' => ['middle_men_count', 'middle_women_count']
            ],
            [
                'name' => trans('messages.report.labels.age_under_30'),
                'key' => 'age_under_30',
                'man_woman' => ['age_under_30_men', 'age_under_30_women']
            ],
            [
                'name' => trans('messages.report.labels.age_31_45'),
                'key' => 'age_31_45',
                'man_woman' => ['age_31_45_men', 'age_31_45_women']
            ],
            [
                'name' => trans('messages.report.labels.age_46_plus'),
                'key' => 'age_46_plus',
                'man_woman' => ['age_46_plus_men', 'age_46_plus_women']
            ],
            [
                'name' => trans('messages.report.labels.pension_age_count'),
                'key' => 'pension_age_count',
                'man_woman' => ['pension_count_men', 'pension_count_women']
            ],
            [
                'name' => trans('messages.report.labels.vacation_count'),
                'key' => 'vacation_count',
                'man_woman' => ['vacation_count_men', 'vacation_count_women']
            ],
            [
                'name' => trans('messages.report.labels.disability_count'),
                'key' => 'disability_count',
                'man_woman' => ['disability_men_count', 'disability_women_count']
            ]
        ];
    }

    private function organizations($data): array
    {
        $user = auth()->user();
        if (array_key_exists('report', $data)) {
            $report = Report::whereUuid($data['report'])->firstOrFail();
            $orgIds = $report->details->pluck('organization_id')->unique();

            $organizations = Organization::whereIn('id', $orgIds)->getTree();
            $organizations = $organizations->values()->toArray();
            $stats = $report->details->keyBy('organization_id');

            return [$organizations, $stats, $report->year, $report->month];
        }

        $orgIds = ReportDetail::query()
            ->filter($user, request()->all())
            ->whereHas('report', function ($query) use ($data) {
                $query->where('year', $data['year'])
                    ->where('month', $data['month']);
//          ->whereConfirmation(ConfirmationStatusEnum::SUCCESS->value)
            })
            ->select('organization_id');

        $organizations = Organization::whereIn('id', $orgIds)->getTree();
        $organizations = $organizations->values()->toArray();
        $stats = ReportDetail::query()
            ->whereIn('organization_id', $orgIds)
            ->get()
            ->keyBy('organization_id');

        return [$organizations, $stats, $data['year'], $data['month']];

    }

    public function typeOneExcel($data): BinaryFileResponse
    {
        [$organizations, $stats, $year, $month] = $this->organizations($data);

        $this->rows = collect();
        $this->flattenOneTree($organizations, $stats);

        return Excel::download(new ReportOneStatsExport($this->rows, $this->maxDepth, $year, $month), 'stats.xlsx');
    }

    public function typeTwoExcel($data): BinaryFileResponse
    {
        [$organizations, $stats, $year, $month] = $this->organizations($data);

        $this->rows = collect();
        $this->flattenTwoTree($organizations, $stats);
        return Excel::download(new ReportTwoStatsExport($this->rows, $this->maxDepth), 'created-workers.xlsx');
    }

    public function typeThreeExcel($data): BinaryFileResponse
    {
        [$organizations, $stats, $year, $month] = $this->organizations($data);

        $this->rows = collect();
        $this->flattenThreeTree($organizations, $stats);

        return Excel::download(new ReportThreeStatsExport($this->rows, $this->maxDepth, $year, $month), 'stats.xlsx');
    }

    private function flattenThreeTree($nodes, $stats, $level = 1): void
    {
        foreach ($nodes as $node) {
            $stat = $stats[$node['id']] ?? null;
            $row = [
                'id' => $node['id'],
                'level' => $level,
                'has_child' => array_key_exists('children', $node) && count($node['children']) > 0,
                "name_level_$level" => $node['name']
            ];

            if ($stat) {
                foreach ($stat->data['stats'] as $item) {
                    $row[$item['key']] = $item['value'];
                }

                $this->rows->push($row);
                $this->maxDepth = max($this->maxDepth, $level);
            }

            if ($row['has_child']) {
                $this->flattenOneTree($node['children'], $stats, $level + 1);
            }
        }
    }

    private function flattenTwoTree($nodes, $stats, $level = 1): void
    {
        $index = 0;
        foreach ($nodes as $node) {
            $stat = $stats[$node['id']] ?? null;
            $contracts = data_get($stat, 'data.contracts', []);
            $hasChild = array_key_exists('children', $node) && count($node['children']) > 0;

            foreach ($contracts as $contract) {
                $index++;
                $this->rows->push([
                    'id' => $index,
                    'level' => $level,
                    'has_child' => false,
                    "name_level_$level" => $node['name'],
                    'full_name' => $contract['full_name'] ?? '',
                    'birthday' => $contract['birthday'] ?? '',
                    'position_name' => $contract['position_name'] ?? '',
                    'educations' => $contract['educations'] ?? '',
                    'old_organization_name' => $contract['old_organization_name'] ?? '',
                    'old_position_name' => $contract['old_position_name'] ?? '',
                    'old_position_date' => $contract['old_position_date'] ?? '',
                    'command' => $contract['command'] ?? '',
                    'command_reason' => $contract['command_reason'] ?? '',
                    'type' => $contract['type'] ?? '',
                ]);
                $this->maxDepth = max($this->maxDepth, $level);
            }

            if ($hasChild) {
                $this->flattenTwoTree($node['children'], $stats, $level + 1);
            }
        }
    }

    private function flattenOneTree($nodes, $stats, $level = 1): void
    {
        foreach ($nodes as $node) {
            $stat = $stats[$node['id']] ?? null;
            $row = [
                'id' => $node['id'],
                'level' => $level,
                'has_child' => array_key_exists('children', $node) && count($node['children']) > 0,
                "name_level_$level" => $node['name']
            ];

            if ($stat) {
                foreach ($stat->data['stats'] as $item) {
                    $row[$item['key']] = $item['value'];
                }

                $this->rows->push($row);
                $this->maxDepth = max($this->maxDepth, $level);
            }

            if ($row['has_child']) {
                $this->flattenOneTree($node['children'], $stats, $level + 1);
            }
        }
    }

    public function update($reportUuid, $data): void
    {
        $report = Report::whereUuid($reportUuid)->first();
        if (!$report) {
            throw new \Exception(trans('messages.document.not_found'));
        }
        $report->director_id = $data['director_id'];
        $report->save();
    }

    public function deleteDetail($reportDetailId): void
    {
        $reportDetail = ReportDetail::findOrFail($reportDetailId);
        $reportId = $reportDetail->report_id;
        $reportDetail->delete();

        $report = Report::with([
            'details',
            'director',
            'director.worker',
            'user.organization'
        ])->findOrFail($reportId);

        $this->generateDocument($report);
    }

    public function updateDetail($reportDetailId, $data, $user): void
    {
        $reportDetail = ReportDetail::with('report')->findOrFail($reportDetailId);
        if ($reportDetail->report->organization_id !== $user->organization_id) {
            throw new \Exception(trans('messages.errors.organization_not_allowed_permission'));
        }
        $reportDetail->data = $data['data'];
        $reportDetail->save();

        $reportDetail->load([
            'report.details',
            'report.director',
            'report.director.worker',
            'report.user.organization'
        ]);
        $report = $reportDetail->report;
        $this->generateDocument($report);
    }

    public function delete($reportId, $user): void
    {
        $report = Report::findOrFail($reportId);
        if ($report->organization_id !== $user->organization_id) {
            throw StructureServiceException::invalidReportStats(trans('messages.errors.organization_not_allowed_permission'));
        }
        if ($report->confirmation === ConfirmationStatusEnum::SUCCESS->value) {
            if ($user->hasPermissionTo('delete_report')) {
                $report->delete();
            } else {
                throw StructureServiceException::invalidReportStats("Tasdiqlangan hujjatni o'chirish mumkin emas");
            }
        } else {
            $report->delete();
        }

    }

    public function store($data, $user): void
    {
        $this->validateData($data);
        $report = Report::whereUuid($data['report'])->with('details')->first();

        if (!$report) {
            throw StructureServiceException::notFound(trans('messages.not_found'));
        }

        $organizations = $report->details->pluck('organization_id')->toArray() ?? [];
        $nowDate = now()->subMonth();
        $orgPers = ReportMothPer::query()
            ->whereIn('organization_id', $organizations)
            ->where('year', $nowDate->year)
            ->where('month', $nowDate->month)
            ->select('id', 'organization_id')
            ->get()
            ->keyBy('organization_id')
            ->toArray();

        foreach ($organizations as $organization) {
            $per = $this->checkGeneratePermission($report, $organization, $orgPers);
            if (!$per) {
                $organization = Organization::find($organization);
                throw StructureServiceException::invalidReportStats(trans('Ushbu ' . $organization->name . ' uchun joriy oyda hisobot yuklash muddati tugadi'));
            }
        }

        $report->director_id = $data['director_id'];
        $report->active = true;
        $report->save();

        foreach ($data['data'] as $detail) {
            $r = ReportDetail::find($detail['reportId']);
            $r->data = $detail['data'];
            $r->save();
        }
        $this->confirmations(array_merge($data['confirmations'], [$report->director_id]), $report);
        $this->generateDocument($report->load([
            'details',
            'director',
            'director.worker',
            'user.organization'
        ]));
    }

    private function validateData($data): void
    {
        foreach ($data['data'] as $detail) {
            $stats = collect($detail['data']['stats']);
            $monthCreatedBand = $stats->where('key', 'month_created_band')->first();
            $monthOtherCreated = $stats->where('key', 'month_other_created')->first();
            if ((int)$monthCreatedBand['value'] > (int)$monthOtherCreated['value']) {
                throw StructureServiceException::invalidReportStats(trans('messages.report.error.month_created_band'));
            }
        }
    }

    public function generateDocument($report): void
    {
        $filePath = public_path('resumes/report/report.docx');
        $temp = new TemplateProcessor($filePath);
        $report->loadMissing('details', 'director.worker');

        $blocks = [];
        $contracts = [];
        foreach ($report->details as $detail) {
            $blocks[] = $this->detailDocumentStats($detail->data ?? [], $detail->data['organization_name'] ?? '');
            if (($detail->data ?? null) &&
                array_key_exists('contracts', $detail->data) &&
                count($detail->data['contracts']) > 0) {
                foreach ($detail->data['contracts'] as $contract) {
                    $contracts[] = $contract;
                }
            }

        }

        if ($blocks) {
            $temp->cloneBlock('block', count($blocks), true, false, $blocks);
        } else {
            $temp->cloneBlock('block', 0, true, true);
        }

        if (count($contracts) > 0) {
            $temp->cloneBlock('contractsBlock');
            $temp->cloneRowAndSetValues('organization', $contracts);
        } else {
            $temp->cloneBlock('contractsBlock', 0, true, true);
        }

        $director = $report->director;
        $temp->setValue('user_organization', $report->user->organization->name ?? '');
        $temp->setValue('year', $report->year);
        $temp->setValue('month', strtoupper(Helper::getMonth($report->month)));
        $temp->setValue('director_position', $director?->position);
        $temp->setValue('director', $director?->worker?->short_name());

        $newFilePath = 'storage/replaced-files/' . $report->file;
        $fileName = $report->uuid . '.docx';
        try {
            $temp->saveAs(public_path($newFilePath));
            $this->uploadFileFromPath(public_path($newFilePath), $fileName, 'report');
            ConvertHelper::docxToPdf($report->file, 'documents/report', 'minio');
            $report->generate = 3;
            $report->save();
        } catch (Throwable $e) {
            Helper::setLog($e, 'LMSCertificateGenerate');
            throw StructureServiceException::serverError(trans('messages.server_error'));
        } finally {
            File::delete(public_path($newFilePath));
        }
    }

    private function detailDocumentStats(array $detailData, string $organizationName = ''): array
    {
        $stats = collect($detailData['stats'] ?? [])
            ->pluck('value', 'key')
            ->map(static fn($value) => (float)$value ? $value : '')
            ->all();

        $stats['organization_name'] = $organizationName;

        return $stats;
    }

    public function confirmations($confirmations, $report): void
    {
        $confirmations = ConfirmationWorker::whereIn('id', $confirmations)->get();
        foreach ($confirmations as $confirmation) {
            ReportConfirmation::updateOrCreate(
                [
                    'report_id' => $report->id,
                    'worker_id' => $confirmation->worker_id,
                ],
                [

                    'position' => $confirmation->position,
                    'type' => $confirmation->id === $report->director_id ? 'd' : 's',
                ]
            );
        }
        ReportConfirmation::whereNotIn('worker_id', $confirmations->pluck('worker_id')->toArray())
            ->where('report_id', $report->id)
            ->delete();
    }

    public function deleteConfirmation($confirmationId): void
    {
        ReportConfirmation::findOrFail($confirmationId)->delete();
    }

    public function createConfirmation($data): void
    {
        $report = Report::whereUuid($data['report'])->firstOrFail();
        $confirmation = ConfirmationWorker::findOrFail($data['confirmation_id']);
        ReportConfirmation::updateOrCreate(
            [
                'report_id' => $report->id,
                'worker_id' => $confirmation->worker_id,
            ],
            [

                'position' => $confirmation->position,
                'type' => 'd',
            ]
        );
    }

    public function stats($request): JsonResponse
    {
        $year = $request->get('year') ?? date('Y');
        $month = $request->get('month') ?? date('m');
        $user = auth()->user();

        $organizations = Organization::query()
            ->leaderOrganizations($user)
            ->select('id', 'name', 'parent_id', '_lft', '_rgt')
            ->with(['reportForPeriod' => function ($query) use ($year, $month) {
                $query->where('year', $year)
                    ->where('month', $month)
                    ->whereNull('reports.deleted_at')
                    ->select('reports.id', 'reports.confirmation');
            }])
            ->defaultOrder()
            ->get()
            ->toTree();

        return Helper::response(true, [
            'organizations' => $organizations
        ]);
    }
}
