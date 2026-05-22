<?php

namespace App\Jobs\LMS;

use App\Services\LMS\DocumentReplace;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Modules\HR\Models\WorkerPosition;
use Modules\LMS\Models\Direction;
use Modules\LMS\Models\EduPlan;
use Modules\LMS\Models\LmsProtocol;
use Modules\LMS\Models\Specialization;

class GenerateCertificateJob implements ShouldQueue
{
    use Queueable;

    public int $timeout = 36000;

    protected LmsProtocol $protocol;
    protected string $examplePath;
    protected Direction $dr;
    protected Specialization $sp;
    protected EduPlan $edp;
    protected WorkerPosition $director;

    public function __construct($protocol, $examplePath, $dr, $sp, $edp, $director)
    {
        $this->protocol = $protocol;
        $this->examplePath = $examplePath;
        $this->dr = $dr;
        $this->sp = $sp;
        $this->edp = $edp;
        $this->director = $director;
    }

    public function handle(): void
    {
        foreach ($this->protocol->certificates as $cert) {
            new DocumentReplace()->generateCertificate($cert, $this->examplePath, $this->dr, $this->sp, $this->edp, $this->director);
        }
    }

}
