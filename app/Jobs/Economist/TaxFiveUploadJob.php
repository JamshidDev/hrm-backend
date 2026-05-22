<?php

namespace App\Jobs\Economist;

use App\Helpers\Helper;
use App\Imports\CollectionImport;
use Exception;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\DB;
use Maatwebsite\Excel\Facades\Excel;
use Modules\Economist\Models\EconomistUpload;
use Modules\Economist\Models\TaxFiveApplication;
use Modules\HR\Models\Worker;

class TaxFiveUploadJob implements ShouldQueue
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
        $collection = Excel::toCollection(new CollectionImport(2), $this->uploadFile->file);
        $pins = $collection[0]->skip(2)->pluck(2)
            ->map(function ($val) {
                $val = trim($val);
                $val = str_replace(array("'", ' '), '', $val);
                return preg_match('/^\d+$/', $val) ? $val : null;
            })
            ->filter()->unique()->toArray();
        $workers = Worker::whereIn('pin', $pins)->get()->keyBy('pin');

        $errors = [];
        $statements = [];

        DB::beginTransaction();
        try {
            $x = -1;
            foreach ($collection[0] as $item) {
                $x++;

                if ($x === 1 || $x === 0 || $x === 2) {
                    continue;
                }

                if (!$item[2]) {
                    $errors[] = "$x-qatorda PIN bo‘sh.";
                    continue;
                }

                $worker = $workers[$item[2]] ?? null;

                if (!$worker) {
                    $errors[] = "$item[1] tizimda topilmadi.";
                }

                $type = (int)str_replace([' ', '-'], '', $item[5]);
                if (!in_array($type, [1, 2, 3, 4])) {
                    $type = 1;
                }
                $statements[] = [
                    'economist_upload_id' => $this->uploadFile->id,
                    'worker_id' => $worker?->id,
                    'organization_id' => $this->organizationId,
                    'year' => $this->uploadFile->year,
                    'month' => $this->uploadFile->month,
                    'full_name' => $worker?->full_name() ?? $item[1],
                    'pin' => Helper::normalizeNumber($item[2]),
                    'total_income' => Helper::normalizeNumber($item[3]),
                    'reported_income' => Helper::normalizeNumber($item[4]),
                    'income_type' => $type,
                    'total_tax' => Helper::normalizeNumber($item[6]),
                    'reported_tax' => Helper::normalizeNumber($item[7]),
                    'created_at' => now(),
                    'updated_at' => now(),
                ];
            }

            if (!empty($statements)) {
                foreach (array_chunk($statements, 200) as $chunk) {
                    TaxFiveApplication::insert($chunk);
                }
            }
            $year = $this->uploadFile->year;
            $month = $this->uploadFile->month;

            $selects = ['month', 'year', 'organization_id'];
            $columns = ['total_income', 'reported_income', 'total_tax', 'reported_tax'];
            foreach ($columns as $column) {
                $sumColumn = $column . '_sum';
                $selects[] = DB::raw("SUM(COALESCE($column, 0)) as $sumColumn");
            }

            $aggregateRows = DB::table('tax_five_applications')
                ->select($selects)
                ->where('organization_id', $this->organizationId)
                ->where('year', $year)
                ->where('month', $month)
                ->groupBy('organization_id', 'year', 'month')
                ->get();

            $now = now();
            foreach ($aggregateRows as $row) {
                foreach ($columns as $column) {
                    $sumColumn = $column . '_sum';
                    DB::table('tax_five_aggregates')->updateOrInsert(
                        [
                            'organization_id' => $row->organization_id,
                            'year' => $row->year,
                            'month' => $row->month,
                            'column' => $column,
                        ],
                        [
                            'total_sum' => $row->{$sumColumn} ?? 0,
                            'updated_at' => $now,
                            'created_at' => $now,
                        ]
                    );
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
            Helper::setLog($e, 'Tax five upload job');
            $this->uploadFile->update([
                'comment' => trans('messages.server_error'),
                'done' => 1
            ]);
        }
    }
}
