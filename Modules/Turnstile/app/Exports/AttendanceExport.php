<?php

namespace Modules\Turnstile\Exports;

use Illuminate\Support\Collection;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithEvents;
use Maatwebsite\Excel\Events\AfterSheet;
use PhpOffice\PhpSpreadsheet\Cell\Coordinate;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Border;

class AttendanceExport implements FromCollection, WithEvents
{
    private Collection $rows;
    private array $dates;

    public function __construct(array $data)
    {
        $this->rows = collect($data);

        $this->dates = collect($data[0] ?? [])
            ->keys()
            ->filter(fn($k) => preg_match('/^\d{4}-\d{2}-\d{2}$/', $k))
            ->values()
            ->toArray();
    }

    public function collection(): Collection
    {
        $result = collect();

        foreach ($this->rows as $row) {
            $line = [
                $row['full_name'],
                $row['organization'],
                $row['position'],
            ];

            foreach ($this->dates as $date) {
                $day = $row[$date] ?? null;

                // 1️ Turnstile
                if ($day) {
                    $line[] =
                        substr($day['turnstile_start'], 11, 5)
                        . '–'
                        . substr($day['turnstile_end'], 11, 5);
                } else {
                    $line[] = '—';
                }

                // 2️ Schedule
                if ($day && $day['schedule_start']) {
                    $line[] =
                        substr($day['schedule_start'], 0, 5)
                        . '–'
                        . substr($day['schedule_end'], 0, 5);
                } else {
                    $line[] = '—';
                }

                // 3 Work status
                $line[] = match ($day['schedule_work_status'] ?? 0) {
                    1 => 'Ish',
                    0 => 'Dam',
                    default => '—',
                };

                // 4️ Late
                $line[] = ($day['late'] ?? false) ? 'Kech' : '—';

                // 5️ Early
                $line[] = ($day['early'] ?? false) ? 'Erta' : '—';
            }

            $result->push($line);
        }

        return $result;
    }

    public function registerEvents(): array
    {
        return [
            AfterSheet::class => function (AfterSheet $event) {

                $sheet = $event->sheet->getDelegate();

                // 2 ta header row qo‘shamiz
                $sheet->insertNewRowBefore(1, 2);

                // Fixed headers
                $sheet->mergeCells('A1:A2');
                $sheet->mergeCells('B1:B2');
                $sheet->mergeCells('C1:C2');

                $sheet->setCellValue('A1', trans('messages.worker.full_name'));
                $sheet->setCellValue('B1', trans('messages.turnstile.organization_name'));
                $sheet->setCellValue('C1', trans('messages.turnstile.position_name'));

                $col = 4; // D column

                foreach ($this->dates as $date) {
                    $startCol = Coordinate::stringFromColumnIndex($col);
                    $endCol = Coordinate::stringFromColumnIndex($col + 4);

                    // Sana merge
                    $sheet->mergeCells("{$startCol}1:{$endCol}1");
                    $sheet->setCellValue("{$startCol}1", $date);

                    // Sub headers
                    $sheet->setCellValue("{$startCol}2", trans('messages.turnstile.event_date_and_time'));
                    $sheet->setCellValue(Coordinate::stringFromColumnIndex($col + 1) . '2', trans('messages.schedules.schedule'));
                    $sheet->setCellValue(Coordinate::stringFromColumnIndex($col + 2) . '2', trans('messages.schedules.work_status'));
                    $sheet->setCellValue(Coordinate::stringFromColumnIndex($col + 3) . '2', trans('messages.schedules.late'));
                    $sheet->setCellValue(Coordinate::stringFromColumnIndex($col + 4) . '2', trans('messages.schedules.early'));

                    $col += 5;
                }

                /** HEADER STYLE */
                $lastColumn = $sheet->getHighestColumn();

                $sheet->getStyle("A1:{$lastColumn}2")->applyFromArray([
                    'font' => [
                        'bold' => true,
                    ],
                    'alignment' => [
                        'horizontal' => Alignment::HORIZONTAL_CENTER,
                        'vertical' => Alignment::VERTICAL_CENTER,
                        'wrapText' => true,
                    ],
                ]);

                /** BORDER — BUTUN TABLE */
                $lastRow = $sheet->getHighestRow();

                $sheet->getStyle("A1:{$lastColumn}{$lastRow}")
                    ->getBorders()
                    ->getAllBorders()
                    ->setBorderStyle(Border::BORDER_THIN);
            }
        ];
    }
}
