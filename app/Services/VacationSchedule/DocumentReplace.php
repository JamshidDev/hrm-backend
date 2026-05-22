<?php

namespace App\Services\VacationSchedule;

use App\Jobs\DocxToPdfJob;
use App\Traits\Base64FileUploadTrait;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Storage;
use Modules\Confirmation\Models\VacationScheduleConfirmation;
use Modules\HR\Models\VacationScheduleYear;
use PhpOffice\PhpWord\TemplateProcessor;
use RuntimeException;

class DocumentReplace
{
    use Base64FileUploadTrait;

    public function generate($schedule, $data): void
    {
        // $examplePath = Storage::disk('minio')->get($schedule->file);
        $examplePath = public_path('resumes/vacations/vacation_schedule.docx');
        $temp = new TemplateProcessor($examplePath);
        $temp->setValues(['year' => $schedule->year]);

        $newFilePath = 'storage/replaced-files/' . $schedule->file;

        $tempDir = public_path('storage/replaced-files/vacation-schedule');
        if (!is_dir($tempDir) && !mkdir($tempDir, 0775, true) && !is_dir($tempDir)) {
            throw new RuntimeException("Temp papka yaratilmadi: {$tempDir}");
        }

        $fileName = $schedule->uuid . '.docx';
        try {
            $this->createConfirmations($schedule);
            $path = 'json/vacation-schedule/' . $schedule->id . '.json';
            Storage::disk('minio')->put($path, json_encode($data, JSON_THROW_ON_ERROR | JSON_PRETTY_PRINT));

            $temp->saveAs($newFilePath);
            $filePath = new self()->uploadFileFromPath($newFilePath, $fileName, 'vacation-schedule');
            DocxToPdfJob::dispatch($filePath, 'documents/vacation-schedule', $schedule->id, VacationScheduleYear::class);
        } finally {
            File::delete(public_path($newFilePath));
        }
    }

    private function createConfirmations($schedule): void
    {
        try {
            $confirmations = [];
            $tradeUnion = $schedule->tradeUnion;
            $director = $schedule->director;
            $creator = $schedule->creator;

            $confirmations[] = [
                'vacation_schedule_year_id' => $schedule->id,
                'position' => $director->position,
                'type' => 's',
                'worker_id' => $director->worker_id,
                'order' => 4
            ];
            if ($tradeUnion->worker_id !== $director->worker_id) {
                $confirmations[] = [
                    'vacation_schedule_year_id' => $schedule->id,
                    'position' => $tradeUnion->position,
                    'type' => 's',
                    'worker_id' => $tradeUnion->worker_id,
                    'order' => 3
                ];
            }
            if (in_array($creator->worker_id, [$director->worker_id, $tradeUnion->worker_id], true)) {
                $confirmations[] = [
                    'vacation_schedule_year_id' => $schedule->id,
                    'position' => $creator->position?->name,
                    'type' => 's',
                    'worker_id' => $creator->worker_id,
                    'order' => 2
                ];
            }

            $updateColumns = array_keys($confirmations[0]);
            $uniqueBy = ['vacation_schedule_year_id', 'worker_id'];

            foreach (array_chunk($confirmations, 200) as $chunk) {
                VacationScheduleConfirmation::upsert($chunk, $uniqueBy, $updateColumns);
            }
        } catch (\Throwable $e) {
            report($e);
        }
    }

}
