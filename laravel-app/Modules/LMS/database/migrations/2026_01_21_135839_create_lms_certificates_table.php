<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Modules\Confirmation\Enums\ConfirmationStatusEnum;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('lms_certificates', function (Blueprint $table) {
            $table->id();
            $table->uuid();
            $table->foreignId('organization_id')->nullable()->constrained('organizations');
            $table->foreignId('edu_plan_id')->constrained('edu_plans')->cascadeOnDelete();
            $table->foreignId('edu_plan_worker_id')->nullable()->constrained('edu_plan_workers')->cascadeOnDelete();
            $table->foreignId('group_id')->nullable()->constrained('groups')->cascadeOnDelete();
            $table->foreignId('worker_id')->nullable()->constrained('workers')->cascadeOnDelete();
            $table->foreignId('lms_protocol_id')->nullable()->constrained('lms_protocols')->cascadeOnDelete();
            $table->foreignId('worker_position_id')->nullable()->constrained('worker_positions');
            $table->foreignId('director_id')->nullable()->constrained('worker_positions');
            $table->foreignId('user_id')->nullable()->constrained('users');
            $table->date('cert_from')->index()->nullable();
            $table->date('cert_to')->index()->nullable();
            $table->string('serial', 5)->nullable();
            $table->integer('number')->nullable();
            $table->tinyInteger('position_type')->default(1);
            $table->string('start_exam_result')->nullable();
            $table->string('end_exam_result')->nullable();
            $table->string('confirmation_file')->nullable();
            $table->string('file')->nullable();
            $table->tinyInteger('confirmation')->index()->default(ConfirmationStatusEnum::PROCESS->value);
            $table->tinyInteger('generate')->default(2);
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['worker_id', 'group_id'], 'worker_group_unique');
        });
    }


    public function down(): void
    {
        Schema::dropIfExists('lms_certificates');
    }
};
