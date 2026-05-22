<?php

namespace App\Exports;

use App\Helpers\Helper;
use Carbon\Carbon;
use Illuminate\Support\Collection;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithEvents;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithStyles;
use Maatwebsite\Excel\Events\AfterSheet;
use Modules\Structure\Models\Holiday;
use Modules\TimeSheet\Enums\TimeSheetTypeEnum;
use PhpOffice\PhpSpreadsheet\RichText\RichText;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Border;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Worksheet\PageSetup;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

class TimesheetExport implements FromCollection, WithHeadings, WithEvents, WithStyles
{

    protected $timesheet;
    protected $holidays;

    protected int $dayInMonth;
    protected int $month;
    protected int $year;
    protected string $organization;
    protected string $latColumn = 'X';

    public function __construct($timesheet, $year, $month, $organization)
    {
        $this->timesheet = $timesheet;
        $this->holidays = Holiday::whereMonth('holiday_date', $month)
            ->whereYear('holiday_date', $year)->get();
        $this->dayInMonth = Carbon::create($year, $month)->daysInMonth;
        $this->year = $year;
        $this->month = $month;
        $this->organization = $organization;
    }

    public function collection(): Collection
    {
        return collect([]);
    }

    public function headings(): array
    {
        return [
            array_merge(
                [strtoupper($this->organization)],
                array_fill(0, 18, ' '),
                [
                    strtoupper(Helper::getMonth($this->month)), strtoupper($this->year . '-yil')
                ]
            ),
            array_merge(
                [
                    '№',
                    'F.I.SH',
                    'Tabel raqami',
                    'Отметки о явках и неявках на работу по числам месяца'
                ],
                array_fill(0, 15, ' '),
                [
                    'Отработано за',
                    ' ',
                    'Праздничные дни',
                    'Выходные дни',
                    'Дни отпуска',
                ]
            ),
            [
                ' ',
                ' ',
                ' ',
                '1',
                '2',
                '3',
                '4',
                '5',
                '6',
                '7',
                '8',
                '9',
                '10',
                '11',
                '12',
                '13',
                '14',
                '15',
                ' ',
                'половину месяца',
                'месяц',
                ' ',
                ' ',
                ' '
            ],
            array_merge(
                [
                    ' ',
                    ' ',
                    ' ',
                ],
                $this->monthDays(),
                [
                    'дней',
                    'часов',
                    ' ',
                    ' ',
                    ' '
                ]
            ),
            [
                '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '20', '21','22','23','24'
            ]
        ];
    }

    public function styles(Worksheet $sheet): array
    {
        return [
            'A2:' . $this->latColumn . '5' => [
                'borders' => [
                    'allBorders' => [
                        'borderStyle' => Border::BORDER_THIN,
                        'color'       => ['argb' => '000000'],
                    ],
                ],
                'font'    => [
                    'bold'  => true,
                    'size'  => 10,
                    'color' => ['argb' => '000000'],
                ],
            ],
            'A1:' . $this->latColumn . '1' => [
                'font' => [
                    'bold' => true,
                    'size' => 14,
                ],
                'fill' => [
                    'fillType' => Fill::FILL_SOLID,
                    'startColor' => [
                        'argb' => 'FFB9BAB8',
                    ],
                ],
            ]
        ];
    }


    public function registerEvents(): array
    {
        return [
            AfterSheet::class => function (AfterSheet $event) {

                $year = $this->year;
                $month = $this->month;
                $sheet = $event->sheet;
                $sheet->getDelegate()->getStyle("U")->getFont()->setBold(true);
                $sheet->getDelegate()->getStyle("T")->getFont()->setBold(true);
                $sheet->getDelegate()->getStyle("V")->getFont()->setBold(true);
                $sheet->getDelegate()->getStyle("W")->getFont()->setBold(true);
                $sheet->getDelegate()->getStyle("X")->getFont()->setBold(true);

                $sheet->getDelegate()
                    ->getParent()
                    ->getDefaultStyle()
                    ->getFont()
                    ->setSize(12);

                $sheet->getDelegate()
                    ->getStyle("A5:{$this->latColumn}5")
                    ->getFill()
                    ->setFillType(Fill::FILL_SOLID)
                    ->getStartColor()
                    ->setARGB('E8F200');

                $row = 6;
                $lastRow = 0;
                $borderRows = [];
                foreach ($this->timesheet as $departmentWorkers) {
                    $sheet->setCellValue("A{$row}", $departmentWorkers['department_name']);
                    $sheet->mergeCells("A{$row}:" . $this->latColumn . $row);

                    $style = $sheet->getDelegate()->getStyle("A{$row}");

                    $style->getFont()
                        ->setBold(true)
                        ->setSize(14);

                    $style->getFill()
                        ->setFillType(Fill::FILL_SOLID)
                        ->getStartColor()
                        ->setARGB('FFB9BAB8');

                    ++$row;
                    $index = 0;
                    foreach ($departmentWorkers['workers'] as $item) {
                        $index++;

                        $s = $row;
                        $e = $row + 2;
                        if ($item['halfMonth']['day']) {
                            $sheet->setCellValue("T{$s}", $item['halfMonth']['day']);
                            $sheet->setCellValue("T{$e}", $item['halfMonth']['day_hours'] . '/' . $item['halfMonth']['evening_hours']);
                        }
                        if ($item['fullMonth']['day']) {
                            $sheet->setCellValue("U{$s}", $item['fullMonth']['day']);
                            $sheet->setCellValue("U{$e}", $item['fullMonth']['day_hours'] . '/' . $item['fullMonth']['evening_hours']);
                        }

                        $sheet->setCellValue("V{$s}", $item['fullMonth']['holiday_day'] ?? '');
                        $sheet->setCellValue("V{$e}", $item['fullMonth']['holiday_work_day'] ?? '');
                        $sheet->setCellValue("W{$s}", $item['fullMonth']['week_day'] ?? '');
                        $sheet->setCellValue("X{$s}", $item['fullMonth']['vacation_day'] ?? '');

                        $sheet->mergeCells("T{$s}:T" . ($s + 1));
                        $sheet->mergeCells("T{$e}:T" . ($e + 1));
                        $sheet->mergeCells("U{$s}:U" . ($s + 1));
                        $sheet->mergeCells("U{$e}:U" . ($e + 1));

                        $sheet->mergeCells("V{$s}:V" . ($s + 1));
                        $sheet->mergeCells("V{$e}:V" . ($e + 1));

                        $sheet->mergeCells("W{$s}:W" . ($s + 3));
                        $sheet->mergeCells("X{$s}:X" . ($s + 3));


                        $lastRow = $row + 3;
                        $sheet->setCellValue("A{$row}", $index);
                        $sheet->getCell("B{$row}")->setValue(($this->createRichText($item['full_name'], $item['position'])));
                        $sheet->mergeCells("A{$row}:A" . $lastRow);
                        $sheet->mergeCells("B{$row}:B" . $lastRow);
                        $sheet->mergeCells("C{$row}:C" . $lastRow);

                        $days = collect($this->days());

                        foreach ($item['days'] as $day) {
                            if (array_key_exists('statuses', $day)) {
                                $filteredDay = $days->where('day', $day['day'])->first();

                                $statuses = $day['statuses'];
                                $label = implode('/', array_map(static fn($item) => TimeSheetTypeEnum::get($item['status'])['key'], $statuses));
                                $hour = implode('/', array_map(static fn($item) => $item['hours'], $statuses));
                                $labelRow = $row;
                                if ($day['day'] > 15) {
                                    $labelRow += 2;
                                }
                                $sheet->setCellValue($filteredDay['column'] . $labelRow, $label);
                                $sheet->setCellValue($filteredDay['column'] . $labelRow + 1, $hour);

                                $sheet->getDelegate()->getStyle($labelRow + 1 . ":" . $labelRow + 1)
                                    ->getFont()
                                    ->setBold(true);
                            }
                        }
                        $borderRows[] = $lastRow;
                        $row += 4;
                    }
                }

                $sheet->getDelegate()->getRowDimension(1)->setRowHeight(30);
                $sheet->getDelegate()->getRowDimension(3)->setRowHeight(25);
                $sheet->getDelegate()->getRowDimension(4)->setRowHeight(25);

                foreach ($this->mergeCells() as $mergeCell) {
                    $sheet->mergeCells($mergeCell);
                }

                $sheet->getDelegate()->getColumnDimension('A')->setWidth(4);
                $sheet->getDelegate()->getColumnDimension('B')->setWidth(40);
                $sheet->getDelegate()->getColumnDimension('C')->setWidth(8);
                $sheet->getDelegate()->getColumnDimension('T')->setWidth(12);
                $sheet->getDelegate()->getColumnDimension('U')->setWidth(12);

                foreach ($this->days() as $column) {
                    if (in_array(Carbon::create($year, $month, $column['day'])->dayOfWeek, [0, 6], true)) {
                        $event->sheet->getStyle($column['name'])
                            ->applyFromArray([
                                'fill' => [
                                    'fillType'   => Fill::FILL_SOLID,
                                    'startColor' => ['argb' => 'd7d7d7'],
                                ],
                            ]);
                    }
                }

                foreach (range('D', 'S') as $item) {
                    $sheet->getDelegate()->getColumnDimension($item)->setWidth(5);
                }

                $sheet->getDelegate()->getStyle('A1:' . $this->latColumn . $lastRow)
                    ->getAlignment()
                    ->applyFromArray(array(
                        'horizontal' => Alignment::HORIZONTAL_CENTER,
                        'vertical'   => Alignment::VERTICAL_CENTER,
                        'wrapText'   => true
                    ));

                $sheet->getDelegate()->getStyle("A6:" . $this->latColumn . $lastRow)
                    ->getBorders()->getAllBorders()->setBorderStyle(Border::BORDER_THIN);

                foreach ($borderRows as $row) {
                    $sheet->getDelegate()->getStyle("A{$row}:" . $this->latColumn . $row)
                        ->getBorders()->getBottom()->setBorderStyle(Border::BORDER_THICK);
                }

                $sheet->getPageSetup()
                    ->setOrientation(PageSetup::ORIENTATION_LANDSCAPE)
                    ->setFitToWidth(1)
                    ->setFitToHeight(0);

                $sheet->getPageMargins()->setTop(0.5);
                $sheet->getPageMargins()->setRight(0.5);
                $sheet->getPageMargins()->setLeft(0.5);
                $sheet->getPageMargins()->setBottom(0.5);

                $sheet->getPageSetup()->setHorizontalCentered(true);
            },
        ];
    }

    private function createRichText($text1, $text2): RichText
    {
        $richText = new RichText();
        $workerText = $richText->createTextRun($text1 . "\n");
        $workerText->getFont()?->setBold(true)->setSize(12);

        $positionText = $richText->createTextRun($text2);
        $positionText->getFont()?->setSize(10);

        return $richText;
    }

    public function days(): ?array
    {
        $columns = [];

        $i = 0;
        foreach (range('D', 'R') as $column) {
            $i++;
            $columns[] = [
                'day'    => $i,
                'column' => $column,
                'name'   => $column . '3',
            ];
        }

        foreach (range('D', 'S') as $column) {
            $i++;
            if ($i <= $this->dayInMonth) {
                $columns[] = [
                    'day'    => $i,
                    'column' => $column,
                    'name'   => $column . '4',
                ];
            }
        }
        return $columns;
    }

    public function mergeCells(): array
    {
        return [
            'A1:H1',
            'D2:S2',
            'T2:U2',
            'C2:C4',
            'B2:B4',
            'A2:A4',
            'V2:V4',
            'W2:W4',
            'X2:X4',
        ];
    }

    public function monthDays(): array
    {
        $end = $this->dayInMonth;
        $data = range(16, $end);
        if ($end !== 31) {
            $lastDays = array_fill($end + 1, 31, ' ');
            return array_merge($data, $lastDays);
        }
        return $data;
    }
}
