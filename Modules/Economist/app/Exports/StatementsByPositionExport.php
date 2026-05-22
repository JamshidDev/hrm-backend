<?php

namespace Modules\Economist\Exports;

use App\Helpers\Helper;
use Maatwebsite\Excel\Concerns\Exportable;
use Maatwebsite\Excel\Concerns\FromQuery;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;
use Maatwebsite\Excel\Concerns\WithStyles;
use Modules\HR\Models\WorkerPosition;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

class StatementsByPositionExport implements FromQuery, WithMapping, WithHeadings, WithStyles
{
    use Exportable;

    protected $user;
    protected $year;

    public function __construct($user, $year)
    {
        $this->user = $user;
        $this->year = $year;
    }

    public function query()
    {
        return WorkerPosition::query()
            ->filter($this->user)
            ->when(request('positions'), fn($q) => $q->whereIn('position_id', explode(',', request('positions'))))
            ->with([
                'organization:id,name,code',
                'position:id,name',
                'worker:id,last_name,first_name,middle_name,pin'
            ])
            ->with(['worker.statements' => fn($q) => $q->select('total_four','year','month','worker_id')->where('year',$this->year)]);
    }

    public function headings(): array
    {
        $headings = [
            'Tashkilot Nomi',
            'Xodim FISH',
            'Lavozim',
            'PIN',
        ];

        // Oylar uchun ustunlar qo'shamiz (month1, month2, ..., month12)
        for ($month = 1; $month <= 12; $month++) {
            $headings[] = ucfirst(Helper::getMonth($month));
        }

        return $headings;
    }

    public function styles(Worksheet $sheet): array
    {
        return [
            1 => ['font' => ['bold' => true]],
        ];
    }

    public function map($worker): array
    {
        // Xodimning to'liq ismini tayyorlaymiz
        $fullName = $worker->worker->full_name();

        $row = [
            $worker->organization?->name . ' (' . $worker->organization->code . ')',
            $fullName,
            $worker->position?->name,
            $worker->worker?->pin,
        ];

        // Har bir oy uchun total_four qiymatini olamiz
        for ($month = 1; $month <= 12; $month++) {
            $statement = $worker->worker->statements->firstWhere('month', $month);
            $row[] = $statement ? $statement->total_four : 0;
        }

        return $row;
    }
}
