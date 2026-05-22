<?php

namespace Modules\Economist\Exports;

use App\Helpers\Helper;
use App\Helpers\PositionHelper;
use Carbon\Carbon;
use Illuminate\Foundation\Queue\Queueable;
use Maatwebsite\Excel\Concerns\FromArray;
use Maatwebsite\Excel\Concerns\WithDrawings;
use Maatwebsite\Excel\Concerns\WithEvents;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithStyles;
use Maatwebsite\Excel\Events\AfterSheet;
use Modules\Structure\Models\Organization;
use PhpOffice\PhpSpreadsheet\Cell\Coordinate;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Border;
use PhpOffice\PhpSpreadsheet\Worksheet\Drawing;
use PhpOffice\PhpSpreadsheet\Worksheet\PageSetup;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

class StaffingApproveExport implements FromArray, WithHeadings, WithStyles, WithEvents, WithDrawings
{
    use Queueable;

    protected $user;
    protected $data;
    protected Organization $organization;
    protected $date;
    protected $director;
    protected $qrCode;

    public function __construct($user, $data, $organization, $date, $director, $qrCode)
    {
        $this->user = $user;
        $this->data = $data;
        $this->organization = $organization;
        $this->date = $date;
        $this->director = $director;
        $this->qrCode = $qrCode;
    }

    public function array(): array
    {
        return [];
    }

    public function headings(): array
    {
        $date = Carbon::parse($this->date);
        $staffOrgText = $this->organization->full_name . "ning " .
            Helper::getDateTex($date) . " xolatiga";
        return [
            [
                "TAKLIF ETILGAN SHTATLAR JADVALI NAMUNASI"
            ],
            [
                ' ',
                ' ',
                ' ',
                ' ',
                ' ',
                ' ',
                '"TASDIQLAYMAN"'
            ],
            [
                ' ',
                ' ',
                ' ',
                ' ',
                ' ',
                ' ',
                PositionHelper::getFullPosition($this->director)
            ],
            [
                ' ',
                ' ',
                ' ',
                ' ',
                ' ',
                ' ',
                ' ',
                $this->director->worker->short_name()
            ],
            [
                ' ',
                ' ',
                ' ',
                ' ',
                ' ',
                ' ',
                ' ',
                Helper::getDateTex($date)
            ],
            [
                $staffOrgText
            ],
            [
                "SHTATLAR JADVALIGA O‘ZGARTIRISH/TASDIQLASH"
            ],
            [
                ''
            ],
            [
                'T/r', 'Lavozim', 'Shtat soni', 'Razryad', 'Guruh', 'Lavozim maoshi', 'Jami', 'Holati'
            ]
        ];
    }

    public function styles(Worksheet $sheet): array
    {
        return [
            1 => ['font' => ['bold' => true, 'size' => 16]],
            2 => ['font' => ['bold' => true]],
            3 => ['font' => ['bold' => true]],
            4 => ['font' => ['bold' => true]],
            5 => ['font' => ['bold' => true]],
            6 => ['font' => ['bold' => true, 'size' => 12]],
            7 => ['font' => ['bold' => true, 'size' => 16]],
            9 => ['font' => ['bold' => true, 'size' => 12]],
        ];
    }


    public function registerEvents(): array
    {
        return [
            AfterSheet::class => function (AfterSheet $event) {

                $sheet = $event->sheet;
                $sheet->mergeCells("A1:H1");
                $sheet->mergeCells("A6:H6");
                $sheet->mergeCells("A7:H7");

                $sheet->mergeCells("G2:H2");
                $sheet->mergeCells("G3:H3");
                $sheet->mergeCells("F4:G5");

                $sheet->getDelegate()->getColumnDimension('A')->setWidth(5);
                $sheet->getDelegate()->getColumnDimension('B')->setWidth(45);
                $sheet->getDelegate()->getColumnDimension('C')->setWidth(10);
                $sheet->getDelegate()->getColumnDimension('D')->setWidth(10);
                $sheet->getDelegate()->getColumnDimension('E')->setWidth(10);
                $sheet->getDelegate()->getColumnDimension('F')->setWidth(10);
                $sheet->getDelegate()->getColumnDimension('G')->setWidth(15);
                $sheet->getDelegate()->getColumnDimension('H')->setWidth(20);

                $sheet->getDelegate()->getRowDimension(1)->setRowHeight(50);
                $sheet->getDelegate()->getRowDimension(3)->setRowHeight(40);
                $sheet->getDelegate()->getRowDimension(4)->setRowHeight(30);
                $sheet->getDelegate()->getRowDimension(5)->setRowHeight(30);
                $sheet->getDelegate()->getRowDimension(6)->setRowHeight(20);
                $sheet->getDelegate()->getRowDimension(7)->setRowHeight(30);

                $startRow = 9;
                [$lastRow, $lastCol] = $this->setValueToRows($sheet, ($startRow + 1));
                $startColumn = Coordinate::stringFromColumnIndex(1);
                $lastColumn = Coordinate::stringFromColumnIndex($lastCol);
                $sheet->getDelegate()->getStyle($startColumn . $startRow . ':' . $lastColumn . $lastRow)
                    ->getBorders()->getAllBorders()->setBorderStyle(Border::BORDER_THIN);

                $sheet->getStyle('A')
                    ->applyFromArray([
                        'font' => [
                            'bold' => true,
                        ]
                    ]);

                $sheet->getStyle('A1:' . $sheet->getHighestColumn() . $sheet->getHighestRow())
                    ->applyFromArray([
                        'alignment' => [
                            'horizontal' => Alignment::HORIZONTAL_CENTER,
                            'vertical' => Alignment::VERTICAL_CENTER,
                            'wrapText' => true
                        ],
                    ]);

                $sheet->getStyle('6:6')
                    ->getAlignment()
                    ->setVertical(Alignment::VERTICAL_BOTTOM);

                $sheet->getStyle('7:7')
                    ->getAlignment()
                    ->setVertical(Alignment::VERTICAL_TOP);

                $sheet->getStyle('4:4')
                    ->getAlignment()
                    ->setVertical(Alignment::VERTICAL_BOTTOM);

                $sheet->getStyle('5:5')
                    ->getAlignment()
                    ->setVertical(Alignment::VERTICAL_TOP);


                // Page setup
                $sheet->getPageMargins()->setTop(0.5);
                $sheet->getPageMargins()->setRight(0.25);
                $sheet->getPageMargins()->setLeft(0.25);
                $sheet->getPageMargins()->setBottom(0.5);

                $sheet->getPageSetup()
                    ->setOrientation(PageSetup::ORIENTATION_LANDSCAPE)
                    ->setFitToWidth(1)   // 1 page width
                    ->setFitToHeight(0); // unlimited height

                // Print area (optional but recommended)
                $sheet->getPageSetup()->setPrintArea('A1:' . $sheet->getHighestColumn() . $sheet->getHighestRow());

                // Scale off (important)
                $sheet->getPageSetup()->setScale(null);
            },
        ];
    }

    public function setValueToRows($sheet, $startRow = 10, $startCol = 1): array
    {
        $row = $startRow;
        $col = $startCol;
        $lastColumn = Coordinate::stringFromColumnIndex(7);
        foreach ($this->data as $datum) {
            $column = Coordinate::stringFromColumnIndex($col);

            $sheet->setCellValue($column . $row, $datum['name']);
            $sheet->mergeCells($column . $row . ':' . $lastColumn . $row);
            ++$row;
            $index = 0;
            foreach ($datum['positions'] as $position) {
                $index++;
                $sheet->setCellValue(Coordinate::stringFromColumnIndex($col) . $row, $index);
                $sheet->setCellValue(Coordinate::stringFromColumnIndex($col + 1) . $row, $position['name']);
                $sheet->setCellValue(Coordinate::stringFromColumnIndex($col + 2) . $row, $position['rate']);
                $sheet->setCellValue(Coordinate::stringFromColumnIndex($col + 3) . $row, $position['group']);
                $sheet->setCellValue(Coordinate::stringFromColumnIndex($col + 4) . $row, $position['rank']);
                $sheet->setCellValue(Coordinate::stringFromColumnIndex($col + 5) . $row, $position['salary']);
                $sheet->setCellValue(Coordinate::stringFromColumnIndex($col + 6) . $row, $position['amount']);
                $sheet->setCellValue(Coordinate::stringFromColumnIndex($col + 7) . $row, $position['changed_status']['name'] ?? '');
                ++$row;
            }
        }

        return [(string)$row, $col + 7];
    }

    public function drawings(): Drawing
    {
        $drawing = new Drawing();
        $drawing->setName('Signature');
        $drawing->setPath($this->qrCode); // rasm path
        $drawing->setHeight(75);
        $drawing->setCoordinates('G4'); // qaysi cell

        $cellWidth = 100;  // approx (px ga convert qilish kerak)
        $cellHeight = 80;

        $imageWidth = 75;
        $imageHeight = 75;

        $offsetX = ($cellWidth - $imageWidth) / 2;
        $offsetY = ($cellHeight - $imageHeight) / 2;

        $drawing->setOffsetX($offsetX);
        $drawing->setOffsetY($offsetY);

        return $drawing;
    }
}
