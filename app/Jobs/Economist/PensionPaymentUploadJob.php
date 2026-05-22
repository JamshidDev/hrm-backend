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
use Modules\Economist\Models\PensionPayment;
use Modules\HR\Models\Worker;

class PensionPaymentUploadJob implements ShouldQueue
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

    public function replaceItem($item)
    {
        $value = str_replace(' ', '', $item);
        if (!$value) {
            return 0;
        }
        return $value;
    }

    public function handle(): void
    {
        $collection = Excel::toCollection(new CollectionImport(2), $this->uploadFile->file);
        $pins = $collection[0]->skip(2)->pluck(0)
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

                if ($x === 1 || $x === 0) {
                    continue;
                }

                if (!$item[0]) {
                    $errors[] = "$x-qatorda PIN bo‘sh.";
                    continue;
                }

                $worker = $workers[$item[0]] ?? null;

                if (!$worker) {
                    $errors[] = "$item[1] $item[2] $item[3] tizimda topilmadi.";
                }

                $statements[] = [
                    'economist_upload_id' => $this->uploadFile->id,
                    'worker_id' => $worker?->id,
                    'organization_id' => $this->organizationId,
                    'year' => $this->uploadFile->year,
                    'month' => $this->uploadFile->month,
                    'last_name' => $worker?->last_name ?? $item[1],
                    'first_name' => $worker?->first_name ?? $item[2],
                    'middle_name' => $worker?->middle_name ?? $item[3],
                    'pin' => Helper::normalizeNumber($item[0]),
                    'income_tax_paid' =>  Helper::normalizeNumber($item[4]),
                    'mandatory_pension_contribution' => Helper::normalizeNumber($item[5]),
                    'voluntary_pension_contribution' => Helper::normalizeNumber($item[6]),
                    'total_contributions' => Helper::normalizeNumber($item[7]),
                    'created_at' => now(),
                    'updated_at' => now(),
                ];
            }

            if (!empty($statements)) {
                foreach (array_chunk($statements, 200) as $chunk) {
                    PensionPayment::query()->insert($chunk);
                }
            }

            $organizationId = $this->organizationId;
            $year = $this->uploadFile->year;
            $month = $this->uploadFile->month;

            $selects = ['month', 'year', 'organization_id'];
            $columns = ['income_tax_paid', 'mandatory_pension_contribution', 'voluntary_pension_contribution', 'total_contributions'];
            foreach ($columns as $column) {
                $sumColumn = $column . '_sum';
                $selects[] = DB::raw("SUM(COALESCE($column, 0)) as $sumColumn");
            }

            $aggregateRows = DB::table('pension_payments')
                ->select($selects)
                ->where('organization_id', $organizationId)
                ->where('year', $year)
                ->where('month', $month)
                ->groupBy('organization_id', 'year', 'month')
                ->get();

            $now = now();
            foreach ($aggregateRows as $row) {
                foreach ($columns as $column) {
                    $sumColumn = $column . '_sum';
                    DB::table('pension_payment_aggregates')->updateOrInsert(
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
            Helper::setLog($e,'PensionPaymentUploadJob');
            $this->uploadFile->update([
                'comment' => trans('messages.server_error'),
                'done' => 1
            ]);
        }
    }
}
