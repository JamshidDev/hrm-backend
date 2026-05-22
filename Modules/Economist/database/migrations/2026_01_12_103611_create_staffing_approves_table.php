<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Modules\Confirmation\Enums\ConfirmationStatusEnum;

return new class extends Migration
{

    public function up(): void
    {
        Schema::create('staffing_approves', function (Blueprint $table) {
            $table->uuid();
            $table->id();
            $table->foreignId('organization_id')->constrained('organizations')->cascadeOnDelete();
            $table->integer('number')->nullable();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('director_id')->nullable()->constrained('worker_positions')->cascadeOnDelete();
            $table->foreignId('confirmatory_id')->nullable()->constrained('worker_positions');
            $table->date('date')->nullable();
            $table->string('file')->nullable();
            $table->string('confirmation_file')->nullable();
            $table->tinyInteger('generate')->default(1);
            $table->tinyInteger('confirmation')->index()->default(ConfirmationStatusEnum::PROCESS->value);
            $table->timestamps();
            $table->softDeletes();
        });
    }


    public function down(): void
    {
        Schema::dropIfExists('staffing_approves');
    }
};
