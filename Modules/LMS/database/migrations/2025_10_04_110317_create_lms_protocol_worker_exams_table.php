<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Modules\Confirmation\Enums\ConfirmationStatusEnum;

return new class extends Migration
{

    public function up(): void
    {
        Schema::create('lms_protocol_worker_exams', function (Blueprint $table) {
            $table->id();
            $table->uuid();

            $table->foreignId('lms_protocol_id')
                ->constrained('lms_protocols')
                ->cascadeOnDelete();
            $table->foreignId('worker_exam_id')
                ->constrained('worker_exams')
                ->cascadeOnDelete();

            $table->string('number', 15)->nullable();
            $table->string('file')->nullable();
            $table->string('confirmation_file')->nullable();

            $table->tinyInteger('confirmation')->index()
                ->default(ConfirmationStatusEnum::PROCESS->value);

            $table->tinyInteger('generate')->default(2);
            $table->timestamps();
            $table->softDeletes();
        });
    }


    public function down(): void
    {
        Schema::dropIfExists('lms_protocol_worker_exams');
    }
};
