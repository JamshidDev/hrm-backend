<?php

namespace App\Jobs\ReportExport;

use App\Enums\ExportJobStatusEnum;
use App\Helpers\Helper;
use App\Models\User;
use App\Models\UserExportTask;
use Exception;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Collection as SupportCollection;
use Illuminate\Support\Facades\DB;
use Maatwebsite\Excel\Facades\Excel;
use Modules\HR\Enums\PositionStatusEnum;
use Modules\HR\Exports\OrganizationStatsDynamicExport;
use Modules\Structure\Models\Organization;

class ByEducationJob implements ShouldQueue
{
    use Queueable;

    public int $timeout = 36000;

    protected UserExportTask $task;
    protected User $user;
    protected array $query;
    private int $maxDepth = 1;
    private SupportCollection $rows;
    private array $totals = [];

    private string $type;

    public function __construct($task, $user, $query, $type)
    {
        $this->task = $task;
        $this->user = $user;
        $this->query = $query;
        $this->type = $type;
    }

    public function handle(): void
    {
        try {
            request()->merge($this->query);
            $deptSub = DB::table('department_positions')
                ->whereNull('deleted_at')
                ->selectRaw('organization_id, SUM(rate) as approved_staff')
                ->groupBy('organization_id');

            $workerSub = DB::table('worker_positions as wp')
                ->join('workers as w', 'w.id', '=', 'wp.worker_id')
                ->whereNull('wp.deleted_at')
                ->where('wp.status', PositionStatusEnum::ACTIVE->value)
                ->leftJoin('worker_disabilities as wd', function ($join) {
                    $join->on('wd.worker_id', '=', 'w.id')
                        ->whereNull('wd.deleted_at')
                        ->where(function ($q) {
                            $q->whereNull('wd.from')
                                ->orWhere('wd.from', '<=', DB::raw('CURRENT_DATE'));
                        })
                        ->where(function ($q) {
                            $q->whereNull('wd.to')
                                ->orWhere('wd.to', '>=', DB::raw('CURRENT_DATE'));
                        });
                })
                ->selectRaw("
                    wp.organization_id,
                    COUNT(DISTINCT wp.worker_id) as workers_count,
                    COUNT(DISTINCT CASE WHEN w.sex = true THEN wp.worker_id END) as workers_man_count,
                    COUNT(DISTINCT CASE WHEN w.sex = false THEN wp.worker_id END) as workers_woman_count,
                    COUNT(DISTINCT CASE 
                        WHEN DATE_PART('year', AGE(CURRENT_DATE, w.birthday)) < 30 
                        THEN wp.worker_id END
                    ) as age_under_30,
                    COUNT(DISTINCT CASE 
                        WHEN DATE_PART('year', AGE(CURRENT_DATE, w.birthday)) BETWEEN 30 AND 45
                        THEN wp.worker_id END
                    ) as age_30_45,
                    COUNT(DISTINCT CASE 
                        WHEN DATE_PART('year', AGE(CURRENT_DATE, w.birthday)) > 45
                        THEN wp.worker_id END
                    ) as age_over_45,
                    /* ===== EDUCATION 1 ===== */
                    COUNT(DISTINCT CASE 
                        WHEN w.education = 1 THEN wp.worker_id 
                    END) as education1_count,
                    COUNT(DISTINCT CASE 
                        WHEN w.education = 1 AND w.sex = true THEN wp.worker_id 
                    END) as education1_man_count,
                    COUNT(DISTINCT CASE 
                        WHEN w.education = 1 AND w.sex = false THEN wp.worker_id 
                    END) as education1_woman_count,
                    /* ===== EDUCATION 2 ===== */
                    COUNT(DISTINCT CASE 
                        WHEN w.education = 2 THEN wp.worker_id 
                    END) as education2_count,
                    COUNT(DISTINCT CASE 
                        WHEN w.education = 2 AND w.sex = true THEN wp.worker_id 
                    END) as education2_man_count,
                    COUNT(DISTINCT CASE 
                        WHEN w.education = 2 AND w.sex = false THEN wp.worker_id 
                    END) as education2_woman_count,
                    /* ===== EDUCATION 3 ===== */
                    COUNT(DISTINCT CASE 
                        WHEN w.education = 3 THEN wp.worker_id 
                    END) as education3_count,
                    COUNT(DISTINCT CASE 
                        WHEN w.education = 3 AND w.sex = true THEN wp.worker_id 
                    END) as education3_man_count,
                    COUNT(DISTINCT CASE 
                        WHEN w.education = 3 AND w.sex = false THEN wp.worker_id 
                    END) as education3_woman_count,
                     /* ===== PENSION AGE ===== */
                    COUNT(DISTINCT CASE 
                        WHEN (
                            (w.sex = true  AND DATE_PART('year', AGE(CURRENT_DATE, w.birthday)) >= 60)
                         OR (w.sex = false AND DATE_PART('year', AGE(CURRENT_DATE, w.birthday)) >= 55)
                        )
                        THEN wp.worker_id END
                    ) as pension_total_count,
            
                    COUNT(DISTINCT CASE 
                        WHEN w.sex = true 
                         AND DATE_PART('year', AGE(CURRENT_DATE, w.birthday)) >= 60
                        THEN wp.worker_id END
                    ) as pension_man_count,
            
                    COUNT(DISTINCT CASE 
                        WHEN w.sex = false 
                         AND DATE_PART('year', AGE(CURRENT_DATE, w.birthday)) >= 55
                        THEN wp.worker_id END
                    ) as pension_woman_count,
                    /* ===== DISABILITY ===== */
                    COUNT(DISTINCT CASE 
                        WHEN wd.id IS NOT NULL THEN wp.worker_id 
                    END) as disabled_total_count,
            
                    COUNT(DISTINCT CASE 
                        WHEN wd.id IS NOT NULL AND w.sex = true THEN wp.worker_id 
                    END) as disabled_man_count,
            
                    COUNT(DISTINCT CASE 
                        WHEN wd.id IS NOT NULL AND w.sex = false THEN wp.worker_id 
                    END) as disabled_woman_count,
                    
                    COUNT(DISTINCT CASE WHEN wp.type = 2 THEN wp.worker_id END) as workers_contract2_count
                ")
                ->groupBy('wp.organization_id');

            $organizations = Organization::query()
                ->leaderOrganizations($this->user)
                ->when(request('organizations'), function ($q) {
                    $q->whereIn('organizations.id', explode(',', request('organizations')));
                })
                ->leftJoinSub($deptSub, 'dp', 'dp.organization_id', '=', 'organizations.id')
                ->leftJoinSub($workerSub, 'wp', 'wp.organization_id', '=', 'organizations.id')
                ->selectRaw("
                    organizations.*,
                    COALESCE(dp.approved_staff, 0) as approved_staff,
                    COALESCE(wp.workers_count, 0) as workers_count,
                    COALESCE(wp.workers_man_count, 0) as workers_man_count,
                    COALESCE(wp.workers_woman_count, 0) as workers_woman_count,
                    COALESCE(wp.age_under_30, 0) as age_under_30,
                    COALESCE(wp.age_30_45, 0) as age_30_45,
                    COALESCE(wp.age_over_45, 0) as age_over_45,
                    COALESCE(wp.education1_count, 0) as education1_count,
                    COALESCE(wp.education1_man_count, 0) as education1_man_count,
                    COALESCE(wp.education1_woman_count, 0) as education1_woman_count,
                    COALESCE(wp.education2_count, 0) as education2_count,
                    COALESCE(wp.education2_man_count, 0) as education2_man_count,
                    COALESCE(wp.education2_woman_count, 0) as education2_woman_count,
                    COALESCE(wp.education3_count, 0) as education3_count,
                    COALESCE(wp.education3_man_count, 0) as education3_man_count,
                    COALESCE(wp.education3_woman_count, 0) as education3_woman_count,
                    COALESCE(wp.pension_total_count, 0) as pension_total_count,
                    COALESCE(wp.pension_man_count, 0) as pension_man_count,
                    COALESCE(wp.pension_woman_count, 0) as pension_woman_count,
                    COALESCE(wp.disabled_total_count, 0) as disabled_total_count,
                    COALESCE(wp.disabled_man_count, 0) as disabled_man_count,
                    COALESCE(wp.disabled_woman_count, 0) as disabled_woman_count,
                    COALESCE(wp.workers_contract2_count, 0) as workers_contract2_count
                ")
                ->get()
                ->toTree();

            $this->rows = collect();
            $this->flattenTree($organizations);
            $this->rows->push(array_merge(
                [
                    'id' => 'Total',
                    'level' => 1,
                    'has_child' => false,
                    'name_level_1' => 'Jami',
                ],
                $this->totals
            ));

            $fileName = 'tasks/export/report-export/' . md5($this->task->id) . '.xlsx';
            Excel::store(new OrganizationStatsDynamicExport($this->rows, $this->maxDepth,  $this->type), $fileName, 'minio');

            $this->task->update([
                'file' => $fileName,
                'status' => ExportJobStatusEnum::DONE->value
            ]);
        } catch (Exception $e) {
            DB::rollBack();
            Helper::setLog($e,'Report-Export export with codes job error:');
            $this->task->update(['comment' => trans('messages.server_error'), 'done' => ExportJobStatusEnum::ERROR->value]);
        }
    }

    private function flattenTree($nodes, $level = 1): void
    {
        foreach ($nodes as $node) {
            $row = [
                'id' => $node->id,
                'level' => $level,
                'has_child' => $node->children && $node->children->count() > 0,
                "name_level_$level" => $node->name,
                "approved_staff" => round($node->approved_staff / 100),
                "workers_count" => $node->workers_count ?? 0,
                "workers_man_count" => $node->workers_man_count ?? 0,
                "workers_woman_count" => $node->workers_woman_count ?? 0,
                "age_under_30" => $node->age_under_30 ?? 0,
                "age_30_45" => $node->age_30_45 ?? 0,
                "age_over_45" => $node->age_over_45 ?? 0,
                "education1_count" => $node->education1_count ?? 0,
                "education1_man_count" => $node->education1_man_count ?? 0,
                "education1_woman_count" => $node->education1_woman_count ?? 0,
                "education2_count" => $node->education2_count ?? 0,
                "education2_man_count" => $node->education2_man_count ?? 0,
                "education2_woman_count" => $node->education2_woman_count ?? 0,
                "education3_count" => $node->education3_count ?? 0,
                "education3_man_count" => $node->education3_man_count ?? 0,
                "education3_woman_count" => $node->education3_woman_count ?? 0,
                "pension_total_count" => $node->pension_total_count ?? 0,
                "pension_man_count" => $node->pension_man_count ?? 0,
                "pension_woman_count" => $node->pension_woman_count ?? 0,
                "disabled_total_count" => $node->disabled_total_count ?? 0,
                "disabled_man_count" => $node->disabled_man_count ?? 0,
                "disabled_woman_count" => $node->disabled_woman_count ?? 0,
                "workers_contract2_count" => $node->workers_contract2_count ?? 0
            ];

            foreach ($row as $key => $value) {
                if (is_numeric($value) && !in_array($key, ['level','id'])) {
                    $this->totals[$key] = ($this->totals[$key] ?? 0) + $value;
                }
            }

            $this->rows->push($row);
            $this->maxDepth = max($this->maxDepth, $level);

            if ($node->children && $node->children->count()) {
                $this->flattenTree($node->children, $level + 1);
            }
        }
    }
}
