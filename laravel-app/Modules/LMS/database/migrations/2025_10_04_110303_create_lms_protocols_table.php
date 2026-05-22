<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Modules\Confirmation\Enums\ConfirmationStatusEnum;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('lms_protocols', function (Blueprint $table) {
            $table->id();
            $table->uuid();
            $table->foreignId('organization_id')->nullable()->constrained('organizations');
            $table->foreignId('edu_plan_id')->constrained('edu_plans')->cascadeOnDelete();
            $table->foreignId('group_id')->nullable()->constrained('groups')->cascadeOnDelete();
            $table->date('protocol_date')->index()->nullable();
            $table->date('cert_from')->index()->nullable();
            $table->date('cert_to')->index()->nullable();
            $table->string('number', 15)->nullable();
            $table->string('file')->nullable();
            $table->string('confirmation_file')->nullable();
            $table->tinyInteger('confirmation')->index()->default(ConfirmationStatusEnum::PROCESS->value);
            $table->tinyInteger('generate')->default(2);
            $table->timestamps();
            $table->softDeletes();
        });
    }


    public function down(): void
    {
        Schema::dropIfExists('lms_protocols');
    }
};
