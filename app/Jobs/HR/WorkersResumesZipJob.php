<?php

namespace App\Jobs\HR;

use App\Enums\ExportJobStatusEnum;
use App\Helpers\Helper;
use App\Helpers\WorkerResumeHelper;
use App\Models\User;
use App\Models\UserExportTask;
use Exception;
use File;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Modules\HR\Models\WorkerPosition;
use RuntimeException;

class WorkersResumesZipJob implements ShouldQueue
{
    use Queueable;

    protected array $query;
    protected User $user;

    public int $timeout = 36000;

    protected UserExportTask $task;

    public function __construct($task, $query, $user)
    {
        $this->task = $task;
        $this->query = $query;
        $this->user = $user;
    }

    public function handle(): void
    {
        try {
            request()->merge($this->query);

            $workers = WorkerPosition::query()
                ->select(
                    'id',
                    'uuid',
                    'position_id',
                    'position_date',
                    'worker_id',
                    'organization_id',
                    'department_id',
                    'group',
                    'rate',
                    'rank',
                    'type',
                    'salary'
                )
                ->filter($this->user)
                ->remainingFilter()
                ->when(request('worker_ids'), function ($q) {
                    $q->whereIn('id', request('worker_ids'));
                })
                ->search()
                ->with([
                    'department:id,name,level',
                    'organization:id,name,name_en,name_ru,group,full_name',
                    'position:id,name',
                    'worker:id,uuid,last_name,first_name,middle_name,birthday,photo,region_id,city_id,nationality_id',
                    'worker.city',
                    'worker.region',
                    'worker.languages',
                    'worker.nationality',
                    'worker.universities.speciality',
                    'worker.universities.university',
                    'worker.party',
                    'worker.academic_degree',
                    'worker.academic_title',
                    'worker.party',
                    'worker.relatives',
                    'worker.old_careers',
                    'worker.passports'
                ])
                ->get();

            $fileBaseName = $this->user->id . time();
            $path = 'storage/uploads/' . $fileBaseName;
            if (!File::exists(public_path($path))) {
                File::makeDirectory(public_path($path), 0755, true);
            }

            $index = 0;
            foreach ($workers as $worker) {
                $index++;
                $temp = WorkerResumeHelper::downloadResume($worker);

                if (request('passport')) {
                    $newPath = $path . '/' . $index . '.' . $worker->worker->short_name() . '/';
                    if (!File::exists(public_path($newPath))) {
                        File::makeDirectory(public_path($newPath), 0755, true);
                    }
                    $file_name = $index . '.' . $worker->worker->short_name() . '.docx';
                    $temp->saveAs(public_path($newPath) . $file_name);
                    foreach ($worker->worker->passports as $passport) {
                        if ($passport->file && Storage::disk('minio')->exists($passport->file)) {
                            $fileUrl = Helper::fileUrl($passport->file);
                            $fileContent = file_get_contents($fileUrl);
                            $pName = basename($fileUrl);
                            File::put(public_path($newPath) . $pName, $fileContent);
                        }
                    }
                } else {
                    $file_name = $index . '.' . $worker->worker->short_name() . '.docx';
                    $temp->saveAs(public_path($path) . '/' . $file_name);
                }
            }

            $sourceDir = public_path($path);
            $zipFile = public_path($path . '.zip');
            $password = $this->user->phone;

            if (config('app.env') === 'production') {
                $parentDir = dirname($sourceDir);
                exec("cd \"$parentDir\" && zip -r -P $password \"$zipFile\" \"$fileBaseName\"", $output, $resultCode);
            } else {
                $sevenZip = 'C:\\Program Files\\7-Zip\\7z.exe';
                $cmd = "\"$sevenZip\" a -tzip \"$zipFile\" \"$sourceDir\\*\" -p$password -mem=AES256";
                exec($cmd, $output, $resultCode);
            }

            if ($resultCode === 0 && $zipFile && File::exists($zipFile)) {
                Storage::disk('minio')->put('tasks/zip/' . $fileBaseName . '.zip', File::get($zipFile));
                File::deleteDirectory($sourceDir);
                File::delete($zipFile);
            } else {
                throw new RuntimeException("Zip yaratishda xatolik. Kod: $resultCode");
            }
            $this->task->update([
                'file' => 'tasks/zip/' . $fileBaseName . '.zip',
                'status' => ExportJobStatusEnum::DONE->value,
            ]);

        } catch (Exception|RuntimeException|\Throwable $e) {
            $logId = (string)Str::uuid();
            Helper::setLog($e, "[$logId] Worker resume zip failed:");
            $this->task->update([
                'status' => ExportJobStatusEnum::ERROR->value,
                'error' => $logId
            ]);
        }
    }
}
