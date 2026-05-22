<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Modules\Confirmation\Enums\ConfirmationStatusEnum;
use Modules\HR\Enums\WorkerApplicationTypeEnum;

return new class extends Migration {

    public function up(): void
    {
        Schema::create('worker_applications', static function (Blueprint $table) {
            $table->uuid();
            $table->id();
            $table->foreignId('organization_id')->constrained('organizations');
            $table->foreignId('worker_id')->nullable()->constrained('workers')->cascadeOnDelete();
            $table->foreignId('worker_position_id')->nullable()->constrained('worker_positions')->cascadeOnDelete();
            $table->foreignId('user_id')->nullable()->constrained('users')->cascadeOnDelete();
            $table->foreignId('director_id')->nullable()->constrained('confirmation_workers');
            $table->integer('number')->index();
            $table->integer('year')->default(now()->year)->index();
            $table->date('application_date')->default(now()->format('Y-m-d'));
            $table->tinyInteger('type')->default(WorkerApplicationTypeEnum::ONE->value);
            $table->string('file')->nullable();
            $table->string('confirmation_file')->nullable();
            $table->boolean('status')->default(false);
            $table->tinyInteger('generate')->default(2);
            $table->tinyInteger('confirmation')->default(ConfirmationStatusEnum::PROCESS->value);
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['number', 'year', 'organization_id'], 'unique_application_number');
        });
    }


    public function down(): void
    {
        Schema::dropIfExists('worker_applications');
    }
};
