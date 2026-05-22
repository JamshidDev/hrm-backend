<?php

namespace App\Jobs\Economist;

use App\Enums\ExportJobStatusEnum;
use App\Exports\StatementWithCodesByOrganizationExport;
use App\Helpers\Helper;
use App\Models\User;
use App\Models\UserExportTask;
use Exception;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Collection as SupportCollection;
use Illuminate\Support\Facades\DB;
use Maatwebsite\Excel\Facades\Excel;
use Modules\Structure\Models\Organization;

class StatementExportWithCodesJob implements ShouldQueue
{
    use Queueable;

    public int $timeout = 36000;

    protected UserExportTask $task;
    protected User $user;
    protected array $query;
    protected array $codes;
    private int $maxDepth = 1;
    private SupportCollection $rows;

    public function __construct($task, $user, $query)
    {
        $this->task = $task;
        $this->user = $user;
        $this->query = $query;
        $this->codes = $query['codes'];
    }

    public function handle(): void
    {
        try {
            request()->merge($this->query);
            $organizations = Organization::query()
                ->leaderOrganizations($this->user)
                ->when(request('organizations'), function ($q) {
                    $q->whereIn('id', explode(',', request('organizations')));
                })
                ->when($this->codes, function ($q) {
                    foreach ($this->codes as $code) {
                        $q->withSum(
                            ['statement_aggregates as s_' . $code . '_sum' => function ($query) use ($code) {
                                $query->where('year', request('year'))
                                    ->where('month', request('month'))
                                    ->where('code', (int)$code);
                            }],
                            'total_sum',
                        );
                    }
                })
                ->get()
                ->toTree();

            $this->rows = collect();
            $this->flattenTree($organizations);

            $this->rows = $this->rows->map(function ($row) {
                $data = [
                    'id' => $row['id'],
                ];

                for ($i = 1; $i <= $this->maxDepth; $i++) {
                    $data["name_level_$i"] = $row["name_level_$i"] ?? null;
                }

                // 🔑 Dynamic codes
                foreach ($this->codes as $code) {
                    $data["s_{$code}_sum"] = $row["s_{$code}_sum"] ?? 0;
                }

                $data['level'] = $row['level'];
                $data['has_child'] = $row['has_child'];

                return $data;
            });

            $fileName = 'tasks/export/statements/' . md5($this->task->id) . '.xlsx';
            Excel::store(new StatementWithCodesByOrganizationExport($this->codes, $this->rows, $this->maxDepth), $fileName, 'minio');

            $this->task->update([
                'file' => $fileName,
                'status' => ExportJobStatusEnum::DONE->value,
            ]);
        } catch (Exception $e) {
            DB::rollBack();
            Helper::setLog($e,'Statement export with codes job error:');
            $this->task->update([
                'comment' => trans('messages.server_error'),
                'done' => 1
            ]);
        }
    }

    private function flattenTree($nodes, $level = 1): void
    {
        foreach ($nodes as $node) {
            $row = [
                'id' => $node->id,
                'level' => $level,
                'has_child' => $node->children && $node->children->count() > 0,
            ];

            // faqat o‘sha leveldagi name
            $row["name_level_$level"] = $node->name;

            // dynamic codes qiymatlari
            foreach ($this->codes as $code) {
                $row["s_{$code}_sum"] = $node->{"s_{$code}_sum"} ?? 0;
            }

            $this->rows->push($row);
            $this->maxDepth = max($this->maxDepth, $level);

            if ($node->children && $node->children->count()) {
                $this->flattenTree($node->children, $level + 1);
            }
        }
    }
}
