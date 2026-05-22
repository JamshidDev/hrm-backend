<?php

namespace Modules\Exam\Services\Support;

use App\Helpers\ConvertHelper;
use App\Helpers\Helper;
use App\Helpers\PositionHelper;
use App\Jobs\DocxToPdfJob;
use App\Traits\Base64FileUploadTrait;
use Carbon\Carbon;
use Endroid\QrCode\Builder\Builder;
use Endroid\QrCode\Writer\PngWriter;
use Illuminate\Support\Facades\Storage;
use Modules\Exam\Models\WorkerExam;
use Modules\Exam\Models\WorkerExamFile;
use Modules\HR\Enums\EducationEnum;
use PhpOffice\PhpWord\TemplateProcessor;

class ExamResultDocumentService
{
    use Base64FileUploadTrait;

    public function createOrGetDocument(WorkerExam $workerExam, $type): string
    {
        $doc = WorkerExamFile::query()->where('worker_exam_id', $workerExam->id)->where('type', $type)->first();
        if ($doc) {
            return Helper::fileUrl($doc->confirmation_file);
        }

        $workerExamFile = WorkerExamFile::query()->create([
            'worker_exam_id' => $workerExam->id,
            'type' => $type,
        ]);

        $template = new TemplateProcessor(public_path('resumes/exams/exam_result_worker.docx'));
        $this->fillTemplate($template, $workerExam, $workerExamFile->front_url);

        $fileName = $workerExamFile->file;
        $tempPath = 'replaced-files/' . $fileName;

        try {
            $template->saveAs('storage/' . $tempPath);
            $filePath = $this->uploadFileFromPath('storage/' . $tempPath, $fileName, 'worker-exams');
            ConvertHelper::docxToPdf($filePath, 'documents/worker-exams', 'minio');
        } finally {
            Storage::delete($tempPath);
        }

        return Helper::fileUrl($workerExamFile->confirmation_file);
    }

    private function fillTemplate(TemplateProcessor $template, WorkerExam $workerExam, string $documentUrl): void
    {
        $worker = $workerExam->worker;
        $template->setValue('full_name', $worker->full_name());
        $template->setValue('position', PositionHelper::getFullPosition($worker->position));
        $template->setValue('birthday', Helper::getDateTex(Carbon::parse($worker->birthday)));
        $template->setValue('nationality', $worker->nationality?->name);
        $template->setValue('education', EducationEnum::get($worker->education));
        $template->setValue('universities', implode(', ', $this->universityLabels($worker->universities ?? [])));
        $template->setValue('position_date', Helper::getDateTex(Carbon::parse($worker->position->position_date)));
        $template->setValue('all_experience', Helper::getDateTex(Carbon::parse($worker->experience_date)));
        $template->setValue('position_experience', Helper::getDateTex(Carbon::parse($worker->experience_date)));
        $template->setValue('result', $workerExam->result);
        $template->setValue('exam_date', $workerExam->created . ' - ' . $workerExam->ended);
        $template->setImageValue('qr', [
            'path' => $this->generateQrCode($documentUrl),
            'width' => 120,
            'height' => 160,
        ]);
    }

    private function universityLabels(iterable $universities): array
    {
        $labels = [];

        foreach ($universities as $university) {
            if (!$university->university) {
                continue;
            }

            $labels[] = Carbon::parse($university->to_date)->year . 'yil,' . $university->university->name . ', ' . $university->speciality?->name;
        }

        return $labels;
    }

    private function generateQrCode(string $documentUrl): string
    {
        $qrCodeName = md5(time() . random_int(100000, 999999));
        $filePath = 'storage/qr-codes/' . $qrCodeName . '.png';
        Builder::create()->writer(new PngWriter())->data($documentUrl)->size(200)->margin(0)->build()->saveToFile($filePath);
        return $filePath;
    }
}
