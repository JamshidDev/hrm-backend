<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{

    public function up(): void
    {
        Schema::create('groups', static function (Blueprint $table) {
            $table->id();
            $table->foreignId('learning_center_id')
                ->constrained('learning_centers')
                ->cascadeOnDelete();

            $table->foreignId('edu_plan_id')
                ->constrained('edu_plans')
                ->cascadeOnDelete();
            $table->integer('code');
            $table->string('name')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('groups');
    }
};
