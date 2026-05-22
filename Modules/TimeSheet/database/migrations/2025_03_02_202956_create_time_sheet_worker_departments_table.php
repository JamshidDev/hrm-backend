<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {

    public function up(): void
    {
        Schema::create('time_sheet_worker_departments', static function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained('organizations');
            $table->foreignId('worker_id')->constrained('workers')->onDelete('cascade');
            $table->foreignId('worker_position_id')->constrained('worker_positions');
            $table->foreignId('department_id')->nullable()->constrained('departments');
            $table->foreignId('work_place_id')->nullable()->constrained('organizations');
            $table->boolean('active')->default(true);
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('time_sheet_user_departments');
    }
};
