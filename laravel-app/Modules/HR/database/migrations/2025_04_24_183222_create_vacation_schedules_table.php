<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {

    public function up(): void
    {
        Schema::create('vacation_schedules', static function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained('organizations');
            $table->foreignId('worker_id')->constrained('workers')->cascadeOnDelete();
            $table->foreignId('contract_id')->constrained('contracts')->cascadeOnDelete();
            $table->foreignId('worker_position_id')->constrained('worker_positions');
            $table->tinyInteger('month')->index();
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['worker_id', 'contract_id', 'organization_id'], 'unique_worker_vacation_schedule');
        });
    }


    public function down(): void
    {
        Schema::dropIfExists('vacation_schedules');
    }
};
