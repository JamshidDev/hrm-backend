<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('edu_plan_workers', static function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')
                ->constrained('organizations')
                ->cascadeOnDelete();

            $table->foreignId('learning_center_id')
                ->constrained('learning_centers')
                ->cascadeOnDelete();

            $table->foreignId('edu_plan_id')
                ->constrained('edu_plans')
                ->cascadeOnDelete();

            $table->foreignId('worker_id')
                ->constrained('workers')
                ->cascadeOnDelete();

            $table->foreignId('worker_position_id')
                ->nullable()
                ->constrained('worker_positions');

            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('edu_plan_workers');
    }
};
