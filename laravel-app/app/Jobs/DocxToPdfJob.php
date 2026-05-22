<?php

namespace App\Jobs;

use App\Helpers\Helper;
use Illuminate\Contracts\Queue\ShouldBeUnique;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Support\Facades\Redis;
use Illuminate\Support\Facades\Storage;
use RuntimeException;
use Throwable;

class DocxToPdfJob implements ShouldQueue, ShouldBeUnique
{
    use Queueable, InteractsWithQueue;
    protected string $docxPath;
    protected string $pdfPath;
    protected int|null $documentId;

    protected string|null $model;

    public function uniqueId(): string
    {
        return md5($this->docxPath);
    }

    public function __construct($docxPath, $pdfPath, $documentId, $model)
    {
        $this->docxPath = $docxPath;
        $this->pdfPath = $pdfPath;
        $this->documentId = $documentId;
        $this->model = $model;
    }

    public function handle(): void
    {
        try {
            $fileName = pathinfo($this->docxPath, PATHINFO_FILENAME) . ".pdf";
            $pdfOutPath = Storage::disk('public')->path($this->pdfPath . '/');

            $tempDir = storage_path('app/temp');
            if (!file_exists($tempDir) && !mkdir($tempDir, 0775, true) && !is_dir($tempDir)) {
                throw new RuntimeException(sprintf('Directory "%s" was not created', $tempDir));
            }
            $localDocxPath = $tempDir . '/' . basename($this->docxPath);
            $content = Storage::disk('minio')->get($this->docxPath);
            if ($content === false || $content === null) {
                throw new RuntimeException("MinIO dan faylni o‘qib bo‘lmadi: " . $this->docxPath);
            }
            file_put_contents($localDocxPath, $content);

            $outputFile = $pdfOutPath . $fileName;
            if (app()->environment('local')) {
                $soffice = '"C:\\Program Files\\LibreOffice\\program\\soffice.exe"';

                $command = $soffice
                    . ' --headless --invisible --nolockcheck --nofirststartwizard'
                    . ' --convert-to pdf'
                    . ' --outdir ' . escapeshellarg($pdfOutPath)
                    . ' ' . escapeshellarg($localDocxPath)
                    . ' 2>&1';
            } else {
                $command = 'unoconv -f pdf -o ' . escapeshellarg($outputFile) . ' ' . escapeshellarg($localDocxPath) . ' 2>&1';
            }
            exec($command, $output, $returnVar);

            // 20 soniya kutish (PDF yaratish uchun)
            $maxWait = 40;
            $waited = 0;
            while (!file_exists($outputFile) && $waited < $maxWait) {
                sleep(1);
                $waited++;
            }

            if (!Storage::disk('public')->exists($this->pdfPath . '/' . $fileName)) {
                throw new RuntimeException("PDF fayl topilmadi: " . $outputFile . "\nOutput: " . implode("\n", $output));
            }

            //MinIO ga saqlash
            $minio = Storage::disk('minio');
            $minio->writeStream($this->pdfPath . '/' . $fileName, fopen($outputFile, 'rb'));
            @unlink($localDocxPath);
            @unlink($outputFile);

            //Document status update
            if ($this->documentId) {
                $model = $this->model::find($this->documentId);
                $model?->update(['generate' => 3]);
                if ($model) {
                    $modelName = $this->model::getModelKeyName() ?? '';
                    $data = [
                        'type' => $modelName . '.generated',
                        'alert' => 'info',
                        'duration' => 3000,
                        'documentId' => $this->documentId,
                        'title' => trans('messages.document.created'),
                        'message' => trans('messages.document.created'),
                        'action' => null
                    ];
                    $msgData = json_encode(['userId' => $model->user_id, 'data' => $data], JSON_THROW_ON_ERROR);
                    Redis::publish('notifications', $msgData);
                }
            }
        } catch (Throwable $e) {
            Helper::setLog($e, 'Docx to PDF conversion failed:');
            if ($this->documentId) {
                $this->model::find($this->documentId)?->update(['generate' => 4]);
            }
            throw $e;
        }
    }

}
