<?php

namespace App\Services\LMS;

use App\Helpers\Helper;
use App\Helpers\PositionHelper;
use App\Jobs\DocxToPdfJob;
use App\Jobs\LMS\GenerateCertificateJob;
use App\Traits\Base64FileUploadTrait;
use Carbon\Carbon;
use Illuminate\Support\Facades\File;
use Modules\Confirmation\Models\LmsCertificateConfirmation;
use Modules\LMS\Enums\SerialTypeEnum;
use Modules\LMS\Models\LmsCertificate;
use PhpOffice\PhpWord\TemplateProcessor;
use RuntimeException;
use Throwable;

class DocumentReplace
{
    use Base64FileUploadTrait;

    public function generate($protocol): void
    {
        $examplePath = public_path('resumes/lms/cert.docx');

        $tempDir = storage_path('app/public/replaced-files/lms-certificate');
        if (!is_dir($tempDir) && !mkdir($tempDir, 0775, true) && !is_dir($tempDir)) {
            throw new RuntimeException("Temp papka yaratilmadi: {$tempDir}");
        }

        $edp = $protocol->edu_plan;
        $sp = $edp->specialization;
        $dr = $sp->direction;
        $director = $edp->learning_center?->director;

        GenerateCertificateJob::dispatch($protocol, $examplePath, $dr, $sp, $edp, $director);
    }

    private function confirmations($cert, $wp): void
    {
        LmsCertificateConfirmation::updateOrCreate(
            [
                'lms_certificate_id' => $cert->id,
                'worker_id' => $wp->worker_id,
            ],
            [

                'position' => PositionHelper::getShortPosition($wp),
                'type' => 'd',
            ]
        );
    }

    private function getSerialNumber($cert)
    {
        if ($cert?->number) {
            return $cert->number;
        }
        $latestCert = LmsCertificate::query()
            ->whereYear('created_at', Carbon::now()->year)
            ->max('number');
        return $latestCert + 1;
    }

    public function generateCertificate($cert, $examplePath, $dr, $sp, $edp, $director): void
    {
        $wp = $cert->worker_position;
        $worker = $wp->worker;
        $organization = $wp->organization?->full_name;
        $department = $wp->department?->name;
        $position = $wp->position?->name;
        $number = $this->getSerialNumber($cert);
        $cert->number = $number;
        $cert->save();

        $temp = new TemplateProcessor($examplePath);
        $temp->setValues(['serial' => SerialTypeEnum::get($cert->serial)]);
        $temp->setValues(['number' => Helper::pad_number($number)]);
        $temp->setValues(['last_name' => $worker->last_name]);
        $temp->setValues(['first_name' => $worker->first_name]);
        $temp->setValues(['middle_name' => $worker->middle_name]);
        $temp->setValues(['birthday' => Carbon::parse($worker->birthday)->format('d.m.Y')]);
        $temp->setValues(['organization' => $organization]);
        $temp->setValues(['department' => ucfirst($department)]);
        $temp->setValues(['position' => ucfirst($position)]);
        $temp->setValues(['direction' => $dr->name]);
        $temp->setValues(['specialization' => $sp->name]);
        $temp->setValues(['start_date' => Carbon::parse($edp->start_date)->format('d.m.Y')]);
        $temp->setValues(['end_date' => Carbon::parse($edp->end_date ?? now())->format('d.m.Y')]);
        $temp->setValues(['hours' => $edp->hours]);
        $temp->setValues(['start_result' => $cert->start_exam_result]);
        $temp->setValues(['end_result' => $cert->end_exam_result]);
        $temp->setValues(['position_type' => '']);
        $temp->setValues(['from' => Carbon::parse($cert->cert_from)->format('d.m.Y')]);
        $temp->setValues(['to' => Carbon::parse($cert->cert_to)->format('d.m.Y')]);
        $temp->setValues(['director_name' => $director?->worker?->short_name()]);

        $newFilePath = 'storage/replaced-files/' . $cert->file;
        $fileName = $cert->uuid . '.docx';
        try {
            $temp->saveAs(public_path($newFilePath));
            $this->confirmations($cert, $director);
            $filePath = new self()->uploadFileFromPath(public_path($newFilePath), $fileName, 'lms-certificate');
            DocxToPdfJob::dispatch($filePath, 'documents/lms-certificate', $cert->id, LmsCertificate::class);
        } catch (Throwable $e) {
            Helper::setLog($e, 'LMSCertificateGenerate');
            return;
        } finally {
            File::delete(public_path($newFilePath));
        }
    }
}
