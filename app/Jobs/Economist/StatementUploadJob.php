<?php

namespace App\Jobs\Economist;

use App\Helpers\EconomistHelper;
use App\Helpers\Helper;
use App\Imports\CollectionImportHeadingRow;
use Exception;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Maatwebsite\Excel\Facades\Excel;
use Modules\Economist\Models\EconomistUpload;
use Modules\Economist\Models\Statement;
use Modules\HR\Models\Worker;

class StatementUploadJob implements ShouldQueue
{
    use Queueable;

    public int $timeout = 36000;

    protected int $organizationId;

    protected EconomistUpload $uploadFile;

    public function __construct($uploadFile, $organizationId)
    {
        $this->uploadFile = $uploadFile;
        $this->organizationId = $organizationId;
    }

    public function handle(): void
    {
        $collection = Excel::toCollection(new CollectionImportHeadingRow(2), $this->uploadFile->file);
        $pins = $collection[0]->skip(0)->pluck(1)
            ->map(function ($val) {
                $val = trim($val);
                $val = str_replace(array("'", ' '), '', $val);
                return preg_match('/^\d+$/', $val) ? $val : null;
            })->filter()->unique()->toArray();
        $workers = Worker::query()->whereIn('pin', $pins)->get()->keyBy('pin');

        $errors = [];
        $statements = [];

        DB::beginTransaction();
        try {
            $x = -1;
            foreach ($collection[0] as $item) {
                $x++;

                if (!$item[1]) {
                    $errors[] = "$x-qatorda PIN bo‘sh.";
                    continue;
                }

                $worker = $workers[$item[1]] ?? null;

                if (!$worker) {
                    $errors[] = "$item[0] tizimda topilmadi.";
                }

                $data = [];
                $totalOne = 0;
                foreach (EconomistHelper::totalOneColumns() as $totalOneColumn) {
                    $totalOne += (double)($item[$totalOneColumn] ?? 0);
                    $data['s_' . $totalOneColumn] = (double)($item[$totalOneColumn] ?? 0);
                }

                $totalTwo = 0;
                foreach (EconomistHelper::totalTwoColumns() as $totalTwoColumn) {
                    $totalTwo += (double)($item[$totalTwoColumn] ?? 0);
                }

                $totalThree = 0;
                foreach (EconomistHelper::totalThreeColumns() as $totalThreeColumn) {
                    $totalThree += (double)($item[$totalThreeColumn] ?? 0);
                    $data['s_' . $totalThreeColumn] = (double)($item[$totalThreeColumn] ?? 0);
                }

                $totalFive = 0;
                foreach (EconomistHelper::totalFiveColumns() as $totalFiveColumn) {
                    $totalFive += (double)($item[$totalFiveColumn] ?? 0);
                    $data['s_' . $totalFiveColumn] = (double)($item[$totalFiveColumn] ?? 0);
                }

                $a = [
                    'economist_upload_id' => $this->uploadFile->id,
                    'worker_id' => $worker?->id,
                    'organization_id' => $this->organizationId,
                    'year' => $this->uploadFile->year,
                    'month' => $this->uploadFile->month,
                    'full_name' => $worker?->full_name() ?? $item['0'],
                    'pin' => (int)($item['1'] ?? 0),
                    'position' => $item['2'] ?? '',
                    'main_salary' => Helper::normalizeNumber($item['3']),
                    'work_time' => Helper::normalizeNumber($item['4']),
                    'total_one' => $totalOne,
                    'total_two' => $totalTwo,
                    'total_three' => $totalThree,
                    'total_four' => $totalThree + $totalOne,
                    'total_five' => $totalFive,
                    'created_at' => now(),
                    'updated_at' => now(),
                ];
                $statements[] = array_merge($a, $data);
            }

            if (!empty($statements)) {
                foreach (array_chunk($statements, 200) as $chunk) {
                    Statement::query()->insert($chunk);
                }
            }

            $year = $this->uploadFile->year;
            $month = $this->uploadFile->month;

            $columns = Schema::getColumnListing('statements');
            $selects = ['month', 'year', 'organization_id'];

            foreach ($columns as $column) {
                if (preg_match('/^s_\d{3}$/', $column)) {
                    $code = str_pad(str_replace('s_', '', $column), 3, '0', STR_PAD_LEFT);
                    $selects[] = DB::raw("SUM(COALESCE($column, 0)) as s_$code");
                }
            }

            $aggregateRows = DB::table('statements')
                ->select($selects)
                ->where('organization_id', $this->organizationId)
                ->where('year', $year)
                ->where('month', $month)
                ->groupBy('organization_id', 'year', 'month')
                ->get();

            $now = now();
            foreach ($aggregateRows as $row) {
                foreach ($columns as $column) {
                    if (preg_match('/^s_\d{3}$/', $column)) {
                        $code = str_pad(str_replace('s_', '', $column), 3, '0', STR_PAD_LEFT);
                        $c = 's_' . $code;
                        $sum = $row->{$c} ?? 0;

                        DB::table('statement_aggregates')->updateOrInsert(
                            [
                                'organization_id' => $row->organization_id,
                                'year' => $row->year,
                                'month' => $row->month,
                                'code' => $code,
                            ],
                            [
                                'total_sum' => $sum,
                                'updated_at' => $now,
                                'created_at' => $now,
                            ]
                        );
                    }
                }
            }

            DB::commit();
            if ($errors) {
                $err = implode("\n", $errors);
            } else {
                $err = null;
            }

            $this->uploadFile->update(['comment' => $err, 'done' => 3]);
        } catch (Exception $e) {
            DB::rollBack();
            $this->uploadFile->update(['comment' => trans('messages.server_error'), 'done' => 1]);
            Helper::setLog($e,'Statement upload failed:');
        }
    }
}
