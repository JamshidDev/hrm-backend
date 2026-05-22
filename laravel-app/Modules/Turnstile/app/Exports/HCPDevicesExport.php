<?php

namespace Modules\Turnstile\Exports;

use Maatwebsite\Excel\Concerns\{FromArray, ShouldAutoSize, WithHeadings, WithStyles};
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

class HCPDevicesExport implements FromArray, WithHeadings, WithStyles, ShouldAutoSize
{
    protected array $devices;

    public function __construct(array $devices)
    {
        $this->devices = $devices;
    }

    public function array(): array
    {
        return collect($this->devices)->map(function ($device) {
            return [
                'id' => $device['id'],
                'name' => $device['name'],
                'status' => $device['status'] === 1 ? 'Online' : 'Offline',
            ];
        })->toArray();
    }

    public function headings(): array
    {
        return ['ID', 'Name', 'Status'];
    }

    public function styles(Worksheet $sheet): array
    {
        $rowCount = count($this->devices) + 1; // heading uchun +1

        for ($row = 2; $row <= $rowCount; $row++) {
            $status = $sheet->getCell("C{$row}")->getValue();

            $style = $sheet->getStyle("C{$row}")->getFont();
            $style->setBold(true);

            if ($status === 'Online') {
                $style->getColor()->setARGB('05F762'); // yashil
            } elseif ($status === 'Offline') {
                $style->getColor()->setARGB('F7054A'); // qizil
            }
        }

        // heading bold
        $sheet->getStyle('A1:C1')->getFont()->setBold(true);

        return [];
    }
}
